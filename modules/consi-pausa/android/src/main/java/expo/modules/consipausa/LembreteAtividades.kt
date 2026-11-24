package expo.modules.consipausa

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONArray

/**
 * Lembretes das atividades salvas (issue #13). O JS (src/data/lembretesAtividades.ts) manda a
 * lista [{ id, titulo, quando, semanal }]: `quando` é o primeiro horário (epoch ms) e, se
 * `semanal`, ele se repete a cada 7 dias. Um alarme só, no próximo horário de qualquer uma;
 * quando toca, avisa todas as que caem naquele horário e agenda o seguinte.
 * Inexato (sem permissão de alarme exato), reagendado no reinício pelo InicioReceiver.
 */
internal object LembreteAtividades {
  const val ACAO = "expo.modules.consipausa.LEMBRETE_ATIVIDADES"
  private const val SEMANA = 7L * 24 * 60 * 60 * 1000

  data class Item(val id: String, val titulo: String, val quando: Long, val semanal: Boolean)

  fun itens(p: Preferencias): List<Item> = try {
    val a = JSONArray(p.atividadesLembretes)
    List(a.length()) {
      val o = a.getJSONObject(it)
      Item(o.getString("id"), o.optString("titulo", "Sua atividade"), o.getLong("quando"), o.optBoolean("semanal", false))
    }
  } catch (_: Exception) {
    emptyList()
  }

  /** Próxima vez de `i` depois de `depoisDe`, ou 0 se já passou e não repete. */
  fun proximo(i: Item, depoisDe: Long): Long {
    if (i.quando > depoisDe) return i.quando
    if (!i.semanal) return 0L
    val voltas = (depoisDe - i.quando) / SEMANA + 1
    return i.quando + voltas * SEMANA
  }

  private fun intentDoAlarme(context: Context) =
    PendingIntent.getBroadcast(
      context,
      10,
      Intent(context, LembreteAtividadesReceiver::class.java).setAction(ACAO),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  fun agendar(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    am.cancel(intentDoAlarme(context))
    val agora = System.currentTimeMillis()
    val em = itens(Preferencias(context)).map { proximo(it, agora) }.filter { it > 0 }.minOrNull() ?: return
    Preferencias(context).atividadesAlvo = em
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, em, intentDoAlarme(context))
  }

  /** O alarme tocou: avisa as atividades marcadas para o horário que ele mirava. */
  fun disparar(context: Context) {
    val p = Preferencias(context)
    val alvo = p.atividadesAlvo
    if (alvo > 0) {
      for (i in itens(p)) if (proximo(i, alvo - 1) == alvo) Notificacoes.lembreteAtividade(context, i.id, i.titulo)
    }
    agendar(context)
  }
}

/** Recebe o alarme de [LembreteAtividades]. Não exportado. */
class LembreteAtividadesReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == LembreteAtividades.ACAO) LembreteAtividades.disparar(context)
  }
}
