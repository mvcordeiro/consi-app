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
 * - Cuidar tempo: a cada X minutos seguidos no app, um lembrete. Se o grupo diz que ignorar
 *   leva à pausa, a pausa abre 1 minuto depois do lembrete se a pessoa continuar no app.
 * Com um app desses na frente há sempre uma contagem visível: o timer flutuante (Bolha.kt) ou,
 * se o grupo não quer o flutuante ou a pessoa o arrastou para o X, a notificação fixa.
 * Abrir uma tela por cima de outro app exige a permissão de sobrepor; sem ela, a pausa vira
 * uma notificação para tocar e a contagem fica na notificação.
 */
class VigiaService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var prefs: Preferencias
  private lateinit var bolha: Bolha
  private var naFrente: String? = null
  private var desdeNaFrente = 0L
  private var proximoLembrete = 0L
  private var pausaDepoisDoLembrete = 0L
  private var ultimaPausa: Pair<String, Long>? = null
  private var inicios: Set<String> = emptySet()
  /** A pessoa arrastou o timer para o X neste uso do app: só a notificação conta. */
  private var bolhaDescartadaPara: String? = null
  private var contagemNaNotificacao: Notificacoes.Contagem? = null

  private val passo = object : Runnable {
    override fun run() {
      val acesa = (getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
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
    Notificacoes.criarCanais(this)
    inicios = telasIniciais()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == Notificacoes.ACAO_REPOR) {
      // A pessoa tirou a notificação fixa: ela volta (o Consi precisa dela no topo).
      if (prefs.ativa) Notificacoes.atualizarFixa(this, contagemNaNotificacao)
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
    if (!prefs.ativa) {
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
    val regra = if (app == null || app == packageName || app in inicios) null else prefs.regras()[app]
    if (app != null && regra != null) {
      when (regra.modo) {
        "apenas-pausar" -> if (!liberado(app, agora)) abrirPausa(app, regra, agora)
        "cuidar-tempo" -> cuidarTempo(app, regra, agora)
      }
    }
    mostrarContagem(app, regra, agora)
  }

  private fun trocarPara(novo: String?, agora: Long) {
    if (novo == naFrente) return
    val antes = naFrente
    // A liberação "até sair do app" acaba quando outro app (que não o Consi) vem para a frente.
    if (antes != null && antes == prefs.liberadoNaSessao && novo != packageName) prefs.liberadoNaSessao = null
    naFrente = novo
    desdeNaFrente = agora
    proximoLembrete = 0L
    pausaDepoisDoLembrete = 0L
    bolhaDescartadaPara = null
    if (novo == null) mostrarContagem(null, null, agora)
  }

  private fun liberado(app: String, agora: Long) = prefs.liberadoAte(app) > agora || prefs.liberadoNaSessao == app

  private fun cuidarTempo(app: String, regra: Regra, agora: Long) {
    val intervalo = regra.intervaloMin * 60_000L
    if (proximoLembrete == 0L) proximoLembrete = desdeNaFrente + intervalo
    if (agora >= proximoLembrete) {
      val minutos = ((agora - desdeNaFrente) / 60_000L).toInt().coerceAtLeast(1)
      Notificacoes.lembrete(this, regra, app, minutos)
      // "Só reiniciar o timer": a contagem recomeça daqui.
      proximoLembrete = agora + intervalo
      if (regra.aoIgnorar == "pausa") pausaDepoisDoLembrete = agora + IGNORAR_LEMBRETE_MS
    }
    if (pausaDepoisDoLembrete in 1..agora) {
      pausaDepoisDoLembrete = 0L
      if (!liberado(app, agora)) abrirPausa(app, regra, agora)
    }
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
      val ms = if (c.paraCima) agora - c.ate else c.ate - agora
      bolha.mostrar(regra.estiloTimer, ms, c.paraCima)
    } else {
      bolha.esconder()
    }
    val naNotificacao = if (flutua) null else c
    if (naNotificacao != contagemNaNotificacao) {
      contagemNaNotificacao = naNotificacao
      Notificacoes.atualizarFixa(this, naNotificacao)
    }
  }

  private fun abrirPausa(app: String, regra: Regra, agora: Long) {
    // Não reabre a mesma pausa em sequência enquanto o Consi ainda está subindo.
    ultimaPausa?.let { (de, em) -> if (de == app && agora - em < REABRIR_PAUSA_MS) return }
    ultimaPausa = app to agora
    bolha.esconder()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !Settings.canDrawOverlays(this)) {
      Notificacoes.pausaPendente(this, regra, app)
      return
    }
    try {
      startActivity(Notificacoes.intentDaPausa(this, app, regra.grupo))
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
    private const val IGNORAR_LEMBRETE_MS = 60_000L

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
