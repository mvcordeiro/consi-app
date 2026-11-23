package expo.modules.consipausa

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * O vigia: um serviço em primeiro plano que olha, a cada ~0,7 s, que app está na frente
 * (Acesso de uso) e aplica a regra do grupo dele:
 * - Apenas pausar: abre a pausa do Consi por cima do app, a não ser que ele esteja liberado
 *   (a pessoa escolheu um tempo no "Quanto tempo você precisa?"). Quando o tempo acaba com o
 *   app ainda aberto, a pausa volta.
 * - Cuidar tempo: a cada X minutos seguidos no app, um lembrete. Com "Levar para a pausa",
 *   no fim do timer a pausa abre direto por cima do app, no lugar do lembrete.
 * Com um app desses na frente há sempre uma contagem visível: o timer flutuante (Bolha.kt) ou,
 * se o grupo não quer o flutuante ou a pessoa o arrastou para o X, a notificação fixa.
 * Abrir uma tela por cima de outro app exige a permissão de sobrepor; sem ela, a pausa vira
 * uma notificação para tocar e a contagem fica na notificação.
 *
 * Sair e voltar não zera nada: passar pela tela inicial, pelas abas recentes ou pelo próprio
 * Consi (pausa) não conta como trocar de app. O ciclo do "Cuidar tempo" fica guardado por app e
 * continua contando com o app fechado; só recomeça se a pessoa ficou longe dele por mais tempo
 * que o intervalo.
 */
class VigiaService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var prefs: Preferencias
  private lateinit var bolha: Bolha
  private lateinit var tempoDeTela: TempoDeTela
  private var naFrente: String? = null
  private var desdeNaFrente = 0L
  private var proximoLembrete = 0L
  private var ultimaPausa: Pair<String, Long>? = null
  private var inicios: Set<String> = emptySet()
  /** A pessoa arrastou o timer para o X neste uso do app: só a notificação conta. */
  private var bolhaDescartadaPara: String? = null
  private var contagemNaNotificacao: Notificacoes.Contagem? = null

  private val passo = object : Runnable {
    override fun run() {
      val acesa = (getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
      try {
        tempoDeTela.passo(System.currentTimeMillis(), acesa)
      } catch (_: Throwable) {
        // sem o lembrete de tela, o vigia segue
      }
      try {
        if (acesa) verificar(System.currentTimeMillis()) else trocarPara(null, System.currentTimeMillis())
      } catch (_: Throwable) {
        // um passo com erro não derruba o vigia
      }
      handler.postDelayed(this, if (acesa) INTERVALO_MS else INTERVALO_TELA_APAGADA_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    prefs = Preferencias(this)
    bolha = Bolha(this) { bolhaDescartadaPara = naFrente }
    tempoDeTela = TempoDeTela(this, prefs)
    Notificacoes.criarCanais(this)
    inicios = telasIniciais()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == Notificacoes.ACAO_REPOR) {
      // A pessoa tirou a notificação fixa: ela volta (o Consi precisa dela no topo).
      if (prefs.precisaDoVigia) Notificacoes.atualizarFixa(this, contagemNaNotificacao)
      return START_STICKY
    }
    val tipo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
    } else {
      0
    }
    try {
      ServiceCompat.startForeground(this, Notificacoes.ID_FIXA, Notificacoes.fixa(this, contagemNaNotificacao), tipo)
    } catch (_: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (!prefs.precisaDoVigia) {
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(passo)
    handler.post(passo)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(passo)
    bolha.esconder()
    super.onDestroy()
  }

  private fun verificar(agora: Long) {
    if (!Uso.temAcesso(this)) return
    // Janela deslizante: alguns Androids (Samsung) gravam os eventos com atraso de vários
    // segundos. O último app que veio para a frente nos últimos 30 s é o que está na frente;
    // sem eventos na janela, nada mudou.
    val novo = Uso.ultimoNaFrente(this, agora - JANELA_MS, agora)
    if (novo != null) trocarPara(novo, agora)

    val app = naFrente
    // Só os lembretes de tela ligados (pausa nos apps desligada): nenhum app é pausado.
    val regra = if (!prefs.ativa || app == null || app == packageName || app in inicios) null else prefs.regras()[app]
    // Guarda o ciclo a cada ~10 s: se o Android reiniciar o serviço, o timer continua de onde estava.
    if (app != null && regra?.modo == "cuidar-tempo" && proximoLembrete > 0 && agora - guardadoEm > 10_000L) {
      prefs.guardarCiclo(app, proximoLembrete, agora)
      guardadoEm = agora
    }
    if (app != null && regra != null && prefs.bloqueadoAte(app) > agora) {
      // A pessoa escolheu não abrir há pouco: a pausa volta, agora sem a opção de continuar.
      abrirPausa(app, regra, agora, bloqueado = true)
    } else if (app != null && regra != null) {
      when (regra.modo) {
        "apenas-pausar" -> if (!liberado(app, agora)) abrirPausa(app, regra, agora)
        "cuidar-tempo" -> cuidarTempo(app, regra, agora)
      }
    }
    mostrarContagem(app, regra, agora)
  }

  /** Telas de passagem: tela inicial, abas recentes / barra do sistema e o próprio Consi. */
  private fun dePassagem(p: String?) = p == null || p == packageName || p in inicios

  /** O último app de verdade (não de passagem) que esteve na frente, e quando ele saiu. */
  private var ultimoApp: String? = null
  private var saiuEm = 0L
  private var guardadoEm = 0L

  private fun trocarPara(novo: String?, agora: Long) {
    if (novo == naFrente) return
    // Guarda o ciclo do app que sai da frente, para retomar quando ele voltar.
    naFrente?.let {
      if (!dePassagem(it)) {
        saiuEm = agora
        if (proximoLembrete > 0) prefs.guardarCiclo(it, proximoLembrete, agora)
      }
    }
    naFrente = novo
    if (dePassagem(novo)) {
      if (novo == null) mostrarContagem(null, null, agora)
      return
    }
    val app = novo!!
    // Outro app de verdade, ou o mesmo depois de muito tempo longe: começa um uso novo.
    if (app != ultimoApp || (saiuEm > 0 && agora - saiuEm > LONGE_MS)) {
      // A liberação "até sair do app" e o X do timer valem só para o uso anterior.
      if (ultimoApp != null && ultimoApp == prefs.liberadoNaSessao) prefs.liberadoNaSessao = null
      bolhaDescartadaPara = null
      desdeNaFrente = agora
    }
    ultimoApp = app
    proximoLembrete = retomarCiclo(app, agora)
  }

  /**
   * O ciclo do "Cuidar tempo" ao voltar ao app: o mesmo de antes (o tempo continuou contando),
   * a não ser que a pessoa tenha ficado longe por mais que o intervalo; aí começa um novo.
   */
  private fun retomarCiclo(app: String, agora: Long): Long {
    val regra = prefs.regras()[app] ?: return 0L
    if (regra.modo != "cuidar-tempo") return 0L
    val intervalo = regra.intervaloMin * 60_000L
    val guardado = prefs.proximoLembrete(app)
    val longe = agora - prefs.vistoEm(app)
    val ciclo = if (guardado > 0 && longe <= intervalo) guardado else agora + intervalo
    prefs.guardarCiclo(app, ciclo, agora)
    return ciclo
  }

  private fun liberado(app: String, agora: Long) = prefs.liberadoAte(app) > agora || prefs.liberadoNaSessao == app

  /**
   * O timer do "Cuidar tempo" chegou ao fim:
   * - "Levar para a pausa": a pausa abre na hora, por cima do app (sem notificação antes).
   *   A notificação só aparece quando a pausa não pode abrir sozinha (sem a permissão de
   *   sobrepor, ou o Android recusou abrir a tela) e aí é ela que leva à pausa.
   *   Antes, o lembrete saía primeiro e a pausa só abria 1 minuto depois, se a pessoa
   *   continuasse no app: era o atraso entre a notificação e a pausa.
   * - "Só reiniciar o timer": o lembrete e, se o timer flutuante estiver na tela, ele pulsa e
   *   vibra de leve (aí a notificação entra calada, para não vibrar duas vezes).
   */
  private fun cuidarTempo(app: String, regra: Regra, agora: Long) {
    val intervalo = regra.intervaloMin * 60_000L
    if (proximoLembrete == 0L) proximoLembrete = agora + intervalo
    if (agora < proximoLembrete) return
    // A contagem recomeça daqui, nos dois casos.
    proximoLembrete = agora + intervalo
    prefs.guardarCiclo(app, proximoLembrete, agora)
    if (regra.aoIgnorar == "pausa" && !liberado(app, agora)) {
      abrirPausa(app, regra, agora)
      return
    }
    val minutos = ((agora - desdeNaFrente) / 60_000L).toInt().coerceAtLeast(1)
    val comBolha = bolha.visivel
    Notificacoes.lembrete(this, regra, app, minutos, calado = comBolha)
    if (comBolha) bolha.concluir()
  }

  /**
   * A contagem do app na frente: até quando (ou desde quando, contando para cima).
   * Apenas pausar: o tempo escolhido depois da pausa. Cuidar tempo: até o próximo lembrete.
   */
  private fun contagem(app: String, regra: Regra, agora: Long): Notificacoes.Contagem? = when (regra.modo) {
    "apenas-pausar" -> {
      val ate = prefs.liberadoAte(app)
      when {
        ate > agora -> Notificacoes.Contagem(regra.nome, ate, false, regra.modo)
        prefs.liberadoNaSessao == app -> Notificacoes.Contagem(regra.nome, desdeNaFrente, true, regra.modo)
        else -> null
      }
    }
    "cuidar-tempo" -> if (proximoLembrete > 0) Notificacoes.Contagem(regra.nome, proximoLembrete, false, regra.modo) else null
    else -> null
  }

  /** Sempre um ou outro: o timer flutuante ou a contagem na notificação fixa. */
  private fun mostrarContagem(app: String?, regra: Regra?, agora: Long) {
    val c = if (app != null && regra != null) contagem(app, regra, agora) else null
    val podeFlutuar = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
    val flutua = c != null && regra != null && regra.flutuante && podeFlutuar && bolhaDescartadaPara != app
    if (flutua && c != null && regra != null) {
      bolha.mostrar(regra.estiloTimer, c.ate, c.paraCima)
    } else {
      bolha.esconder()
    }
    val naNotificacao = if (flutua) null else c
    if (naNotificacao != contagemNaNotificacao) {
      contagemNaNotificacao = naNotificacao
      Notificacoes.atualizarFixa(this, naNotificacao)
    }
  }

  private fun abrirPausa(app: String, regra: Regra, agora: Long, bloqueado: Boolean = false) {
    // Não reabre a mesma pausa em sequência enquanto o Consi ainda está subindo.
    ultimaPausa?.let { (de, em) -> if (de == app && agora - em < REABRIR_PAUSA_MS) return }
    ultimaPausa = app to agora
    bolha.esconder()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !Settings.canDrawOverlays(this)) {
      Notificacoes.pausaPendente(this, regra, app)
      return
    }
    try {
      startActivity(Notificacoes.intentDaPausa(this, app, regra.grupo, bloqueado))
    } catch (_: Exception) {
      Notificacoes.pausaPendente(this, regra, app)
    }
  }

  /** Os apps de tela inicial (launchers) nunca são pausados. */
  private fun telasIniciais(): Set<String> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val lista = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }
    return lista.map { it.activityInfo.packageName }.toSet() + setOf("com.android.systemui")
  }

  companion object {
    private const val INTERVALO_MS = 700L
    private const val INTERVALO_TELA_APAGADA_MS = 3_000L
    private const val JANELA_MS = 30_000L
    private const val REABRIR_PAUSA_MS = 4_000L
    /** Longe do app por mais que isso (tela apagada, outro app…) = um uso novo ao voltar. */
    private const val LONGE_MS = 10 * 60_000L

    fun iniciar(context: Context) {
      try {
        ContextCompat.startForegroundService(context, Intent(context, VigiaService::class.java))
      } catch (_: Exception) {
        // o Android pode negar iniciar em segundo plano; tenta de novo na próxima abertura do app
      }
    }

    fun parar(context: Context) {
      context.stopService(Intent(context, VigiaService::class.java))
    }
  }
}
