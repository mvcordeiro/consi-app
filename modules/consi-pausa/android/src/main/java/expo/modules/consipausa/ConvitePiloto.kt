package expo.modules.consipausa

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

/**
 * Convite do piloto: um alarme que, no dia 7 de uso, publica a notificação "Como foi sua semana
 * com o Consi?". O JS (src/data/piloto.ts) decide quando e com que texto; aqui só se guarda e se
 * dispara. O alarme é inexato (sem permissão de alarme exato) e sobrevive ao reinício do celular
 * porque o InicioReceiver agenda de novo.
 */
internal object ConvitePiloto {
  const val ACAO = "expo.modules.consipausa.CONVITE_PILOTO"

  private fun intentDoAlarme(context: Context) =
    PendingIntent.getBroadcast(
      context,
      6,
      Intent(context, ConvitePilotoReceiver::class.java).setAction(ACAO),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** Agenda (ou troca) o alarme para `emMs` (epoch ms). Tempo no passado não agenda nada. */
  fun agendar(context: Context, emMs: Long) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    am.cancel(intentDoAlarme(context))
    if (emMs <= System.currentTimeMillis()) return
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, emMs, intentDoAlarme(context))
  }

  /** Quem já respondeu ao formulário não recebe o convite. */
  fun cancelar(context: Context) {
    (context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager)?.cancel(intentDoAlarme(context))
    Preferencias(context).conviteEm = 0L
    NotificationManagerCompat.from(context).cancel(Notificacoes.ID_CONVITE)
  }
}

/** Recebe o alarme de [ConvitePiloto]. Não exportado: só o próprio app (pelo AlarmManager) dispara. */
class ConvitePilotoReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ConvitePiloto.ACAO) return
    val prefs = Preferencias(context)
    if (prefs.conviteEm == 0L) return
    Notificacoes.convitePiloto(context, prefs.conviteTitulo, prefs.conviteTexto)
    prefs.conviteEm = 0L
  }
}
