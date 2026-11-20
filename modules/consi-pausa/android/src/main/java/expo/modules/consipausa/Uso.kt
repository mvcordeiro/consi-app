package expo.modules.consipausa

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process

/** Acesso de uso (PACKAGE_USAGE_STATS): que app está na frente e quanto tempo cada um foi usado. */
internal object Uso {
  @Suppress("DEPRECATION")
  private const val ABRIU = UsageEvents.Event.MOVE_TO_FOREGROUND // = ACTIVITY_RESUMED

  @Suppress("DEPRECATION")
  private const val SAIU = UsageEvents.Event.MOVE_TO_BACKGROUND // = ACTIVITY_PAUSED

  private const val TELA_APAGOU = 16 // UsageEvents.Event.SCREEN_NON_INTERACTIVE (API 28)

  fun temAcesso(context: Context): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val modo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    if (modo == AppOpsManager.MODE_DEFAULT) {
      return context.checkCallingOrSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    }
    return modo == AppOpsManager.MODE_ALLOWED
  }

  /** O último app que veio para a frente entre `desde` e `ate` (ou null se nenhum veio). */
  fun ultimoNaFrente(context: Context, desde: Long, ate: Long): String? {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val eventos = usm.queryEvents(desde, ate) ?: return null
    val e = UsageEvents.Event()
    var ultimo: String? = null
    while (eventos.hasNextEvent()) {
      eventos.getNextEvent(e)
      if (e.eventType == ABRIU) ultimo = e.packageName
    }
    return ultimo
  }

  /** Milissegundos na frente, por app, entre `inicio` e `fim`. */
  fun porApp(context: Context, inicio: Long, fim: Long): Map<String, Double> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val eventos = usm.queryEvents(inicio, fim) ?: return emptyMap()
    val e = UsageEvents.Event()
    val abertoEm = mutableMapOf<String, Long>()
    val total = mutableMapOf<String, Long>()
    fun fechar(pacote: String, em: Long) {
      val desde = abertoEm.remove(pacote) ?: return
      total[pacote] = (total[pacote] ?: 0L) + (em - desde).coerceAtLeast(0L)
    }
    while (eventos.hasNextEvent()) {
      eventos.getNextEvent(e)
      when (e.eventType) {
        ABRIU -> if (!abertoEm.containsKey(e.packageName)) abertoEm[e.packageName] = e.timeStamp
        SAIU -> fechar(e.packageName, e.timeStamp)
        TELA_APAGOU -> abertoEm.keys.toList().forEach { fechar(it, e.timeStamp) }
      }
    }
    val agora = minOf(fim, System.currentTimeMillis())
    abertoEm.keys.toList().forEach { fechar(it, agora) }
    return total.mapValues { it.value.toDouble() }
  }
}
