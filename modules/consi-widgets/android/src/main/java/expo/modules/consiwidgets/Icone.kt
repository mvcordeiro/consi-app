package expo.modules.consiwidgets

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.SystemClock

/**
 * Troca o ícone do app no launcher (ver docs/icone-emocao.md).
 * Os apelidos "IconePadrao" e "Icone_<id>" são criados em plugins/withIconeEmocao.js.
 *
 * Desligar o apelido pelo qual a tarefa foi aberta faz o Android encerrar a tarefa (mesmo com
 * DONT_KILL_APP): era o "crash" depois do check-in. Por isso a troca nunca acontece com o app em uso:
 *  1. [pedir] grava o ícone pedido e agenda um alarme para daqui a [ESPERA_MS];
 *  2. no alarme ([IconeReceiver]), se o app estiver em uso ou tiver saído há pouco, adia de novo;
 *     senão, troca o ícone e esquece o pedido.
 * O pedido fica em SharedPreferences: sobrevive ao processo morrer, e [retomar] reagenda na abertura.
 */
internal object Icone {
  private const val PADRAO = "IconePadrao"
  private const val PREFS = "consi_icone"
  private const val TEM = "tem"
  private const val ID = "id"
  private const val CODIGO_ALARME = 7301

  /** Espera depois do check-in (e entre tentativas). */
  private const val ESPERA_MS = 5 * 60_000L

  /** Saiu do app há menos que isso: pode ser só um seletor de fotos ou uma permissão por cima. */
  private const val SAIDA_RECENTE_MS = 3 * 60_000L

  @Volatile private var emFrente = false
  @Volatile private var saiuEm = 0L

  fun entrou() {
    emFrente = true
  }

  fun saiu() {
    emFrente = false
    saiuEm = SystemClock.elapsedRealtime()
  }

  /** Guarda o ícone da emoção [id] (ou o padrão, se null) e agenda a troca. */
  fun pedir(context: Context, id: String?) {
    try {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      if (ligado(context, nomeDe(id))) {
        // Já é o ícone atual (ex.: abriu o app de novo): nada a fazer.
        prefs.edit().remove(TEM).remove(ID).apply()
        cancelar(context)
        return
      }
      prefs.edit().putBoolean(TEM, true).putString(ID, id).apply()
      agendar(context, ESPERA_MS)
    } catch (_: Exception) {
      // sem os apelidos no manifesto (APK sem o plugin): o ícone fica como estava
    }
  }

  /** Na abertura do app: se há um pedido pendente, garante o alarme (reiniciar o aparelho apaga alarmes). */
  fun retomar(context: Context) {
    if (context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(TEM, false)) agendar(context, ESPERA_MS)
  }

  /** Chamado pelo alarme. */
  fun tentar(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(TEM, false)) return
    if (emUso()) {
      agendar(context, ESPERA_MS)
      return
    }
    val id = prefs.getString(ID, null)
    try {
      definir(context, id)
    } catch (_: Exception) {
      // se o sistema recusar, o ícone fica como estava
    }
    prefs.edit().remove(TEM).remove(ID).apply()
  }

  private fun emUso(): Boolean {
    if (emFrente) return true
    if (saiuEm != 0L && SystemClock.elapsedRealtime() - saiuEm < SAIDA_RECENTE_MS) return true
    // O processo pode ter sido recriado pelo alarme: confere também a importância dele.
    // (O serviço da pausa deixa o processo em FOREGROUND_SERVICE, que não conta como uso.)
    val info = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(info)
    return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND ||
      info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
  }

  private fun intentDoAlarme(context: Context) =
    PendingIntent.getBroadcast(
      context,
      CODIGO_ALARME,
      Intent(context, IconeReceiver::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** Alarme inexato (não precisa da permissão de alarme exato): o sistema pode atrasar, e tudo bem. */
  private fun agendar(context: Context, depoisDe: Long) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    am.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + depoisDe, intentDoAlarme(context))
  }

  private fun cancelar(context: Context) {
    (context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager)?.cancel(intentDoAlarme(context))
  }

  private fun nomeDe(id: String?) = if (emocaoPorId(id) != null) "Icone_$id" else PADRAO

  private fun componente(context: Context, nome: String) =
    ComponentName(context.packageName, "${context.packageName}.$nome")

  /** O apelido está ligado? (DEFAULT = o que diz o manifesto: só o padrão vem ligado.) */
  private fun ligado(context: Context, nome: String): Boolean =
    when (context.packageManager.getComponentEnabledSetting(componente(context, nome))) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> nome == PADRAO
      else -> false
    }

  /** Liga o ícone da emoção [id] (ou o padrão) e desliga os outros. */
  private fun definir(context: Context, id: String?) {
    val escolhido = nomeDe(id)
    val pm = context.packageManager
    val nomes = listOf(PADRAO) + EMOCOES.map { "Icone_${it.id}" }
    // Liga o novo antes de desligar os outros: nunca fica sem ícone no launcher.
    mudar(pm, context, escolhido, PackageManager.COMPONENT_ENABLED_STATE_ENABLED)
    for (nome in nomes) {
      if (nome != escolhido) mudar(pm, context, nome, PackageManager.COMPONENT_ENABLED_STATE_DISABLED)
    }
  }

  private fun mudar(pm: PackageManager, context: Context, nome: String, estado: Int) {
    val c = componente(context, nome)
    if (pm.getComponentEnabledSetting(c) == estado) return
    pm.setComponentEnabledSetting(c, estado, PackageManager.DONT_KILL_APP)
  }
}

/** Recebe o alarme de [Icone]. Não exportado: só o próprio app (pelo AlarmManager) dispara. */
class IconeReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Icone.tentar(context.applicationContext)
  }
}
