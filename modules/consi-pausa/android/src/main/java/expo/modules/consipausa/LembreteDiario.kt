package expo.modules.consipausa

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import java.util.Calendar

/**
 * Lembrete diário de escrita no Diário: nos dias e no horário que a pessoa escolheu, uma
 * notificação com uma pergunta para escrever. O JS (src/data/lembreteDiario.ts) manda o horário,
 * os dias (bits de domingo = 0 a sábado = 6) e a lista de perguntas; aqui se agenda o próximo
 * alarme e, quando ele toca, se publica a notificação e se agenda o seguinte.
 * O alarme é inexato (sem permissão de alarme exato) e volta a ser agendado no reinício do
 * celular pelo InicioReceiver.
 */
internal object LembreteDiario {
  const val ACAO = "expo.modules.consipausa.LEMBRETE_DIARIO"

  private fun intentDoAlarme(context: Context) =
    PendingIntent.getBroadcast(
      context,
      8,
      Intent(context, LembreteDiarioReceiver::class.java).setAction(ACAO),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** O próximo horário escolhido depois de `depoisDe` (epoch ms), ou 0 se nenhum dia está marcado. */
  fun proximo(hora: Int, minuto: Int, dias: Int, depoisDe: Long): Long {
    if ((dias and 0x7F) == 0) return 0L
    val c = Calendar.getInstance().apply {
      timeInMillis = depoisDe
      set(Calendar.HOUR_OF_DAY, hora)
      set(Calendar.MINUTE, minuto)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    for (i in 0..7) {
      val diaDaSemana = c.get(Calendar.DAY_OF_WEEK) - 1 // domingo = 0
      if (c.timeInMillis > depoisDe && ((dias shr diaDaSemana) and 1) == 1) return c.timeInMillis
      c.add(Calendar.DAY_OF_MONTH, 1)
    }
    return 0L
  }

  /** (Re)agenda o próximo lembrete pelas preferências guardadas; desligado, cancela. */
  fun agendar(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    am.cancel(intentDoAlarme(context))
    val p = Preferencias(context)
    if (!p.diarioLigado) return
    val em = proximo(p.diarioHora, p.diarioMinuto, p.diarioDias, System.currentTimeMillis())
    if (em > 0) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, em, intentDoAlarme(context))
  }

  /** A pergunta da vez: uma diferente a cada lembrete. */
  fun pergunta(p: Preferencias): String {
    val lista = try {
      JSONArray(p.diarioPerguntas).let { a -> List(a.length()) { a.getString(it) } }
    } catch (_: Exception) {
      emptyList()
    }
    if (lista.isEmpty()) return "Como foi o seu dia até aqui?"
    return lista[p.proximaPerguntaDiario(lista.size)]
  }
}

/** Recebe o alarme de [LembreteDiario]. Não exportado: só o próprio app (pelo AlarmManager) dispara. */
class LembreteDiarioReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != LembreteDiario.ACAO) return
    val p = Preferencias(context)
    if (!p.diarioLigado) return
    Notificacoes.lembreteDiario(context, LembreteDiario.pergunta(p))
    LembreteDiario.agendar(context)
  }
}
