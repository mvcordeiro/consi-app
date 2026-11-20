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
 * Abrir uma tela por cima de outro app exige a permissão de sobrepor; sem ela, a pausa vira
 * uma notificação para tocar.
 */
class VigiaService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var prefs: Preferencias
  private var ultimaConsulta = 0L
  private var naFrente: String? = null
  private var desdeNaFrente = 0L
  private var proximoLembrete = 0L
  private var pausaDepoisDoLembrete = 0L
  private var ultimaPausa: Pair<String, Long>? = null
  private var inicios: Set<String> = emptySet()

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
    Notificacoes.criarCanais(this)
    inicios = telasIniciais()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val tipo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
    } else {
      0
    }
    try {
      ServiceCompat.startForeground(this, Notificacoes.ID_FIXA, Notificacoes.fixa(this), tipo)
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
    ultimaConsulta = System.currentTimeMillis() - JANELA_INICIAL_MS
    handler.post(passo)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(passo)
    super.onDestroy()
  }

  private fun verificar(agora: Long) {
    if (!Uso.temAcesso(this)) return
    // Um pouco de sobreposição entre as consultas, para não perder eventos gravados com atraso.
    val novo = Uso.ultimoNaFrente(this, ultimaConsulta - SOBREPOSICAO_MS, agora)
    ultimaConsulta = agora
    if (novo != null) trocarPara(novo, agora)

    val app = naFrente ?: return
    if (app == packageName || app in inicios) return
    val regra = prefs.regras()[app] ?: return
    when (regra.modo) {
      "apenas-pausar" -> if (!liberado(app, agora)) abrirPausa(app, regra, agora)
      "cuidar-tempo" -> cuidarTempo(app, regra, agora)
    }
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
  }

  private fun liberado(app: String, agora: Long) = prefs.liberadoAte(app) > agora || prefs.liberadoNaSessao == app

  private fun cuidarTempo(app: String, regra: Regra, agora: Long) {
    val intervalo = regra.intervaloMin * 60_000L
    if (proximoLembrete == 0L) proximoLembrete = desdeNaFrente + intervalo
    if (agora >= proximoLembrete) {
      val minutos = ((agora - desdeNaFrente) / 60_000L).toInt().coerceAtLeast(1)
      Notificacoes.lembrete(this, regra, app, minutos)
      proximoLembrete = agora + intervalo
      if (regra.aoIgnorar == "pausa") pausaDepoisDoLembrete = agora + IGNORAR_LEMBRETE_MS
    }
    if (pausaDepoisDoLembrete in 1..agora) {
      pausaDepoisDoLembrete = 0L
      if (!liberado(app, agora)) abrirPausa(app, regra, agora)
    }
  }

  private fun abrirPausa(app: String, regra: Regra, agora: Long) {
    // Não reabre a mesma pausa em sequência enquanto o Consi ainda está subindo.
    ultimaPausa?.let { (de, em) -> if (de == app && agora - em < REABRIR_PAUSA_MS) return }
    ultimaPausa = app to agora
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
    private const val JANELA_INICIAL_MS = 10_000L
    private const val SOBREPOSICAO_MS = 2_000L
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
