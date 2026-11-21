package expo.modules.consiwidgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Os widgets do Consi na tela inicial do Android.
 *
 * - Pequeno (2×2): o aglomerado das emoções de hoje (a mais sentida no centro, como nos dias do
 *   Diário) e quantos registros. Tocar abre o Diário; sem registros, abre o novo momento do Diário
 *   (consi://diario/novo, o mesmo do botão "Registrar emoção" da aba Diário) para escrever.
 * - Médio (4×2): o mesmo aglomerado e três atalhos: Registrar emoção (Home), Escrever no
 *   Diário (novo momento) e Explorar atividades (Hobbies).
 * - Grande (4×4): o check-in da Home adaptado a toques. Embaixo, as etiquetas dos últimos
 *   registros ("Alegria · às 10:12"), como na Home. Tocar no balão "?" mostra as 14 emoções
 *   espalhadas como na Home; tocar numa mostra a confirmação ("Registrar" / "Escolher outra"). Registrar abre o
 *   Consi já gravando a emoção (consi://registrar), que mostra a tela "Emoção registrada".
 *   Widgets não recebem gestos de arrastar (RemoteViews só entrega toques), por isso o "arrastar
 *   o balão até a cabeça" virou escolher + confirmar: continuam dois gestos deliberados.
 *
 * Os dados vêm do app (ConsiWidgetsModule.atualizar): o dia e os ids das emoções de hoje. O
 * banco do Consi é criptografado e só o JS o abre, então o widget nunca lê o banco nem grava
 * nada sozinho. Se o dia guardado não é hoje (o app não abriu desde ontem), o widget mostra o
 * dia vazio. Um alarme leve (não exato, sem permissão) redesenha tudo logo depois da meia-noite.
 */
internal object Widgets {
  const val ACAO_ATUALIZAR = "expo.modules.consiwidgets.ATUALIZAR"
  const val ACAO_ESCOLHER = "expo.modules.consiwidgets.ESCOLHER"
  const val ACAO_EMOCAO = "expo.modules.consiwidgets.EMOCAO"
  const val ACAO_VOLTAR = "expo.modules.consiwidgets.VOLTAR"
  const val EXTRA_EMOCAO = "emocao"

  /** Escolha ou confirmação esquecidas no grande voltam ao início depois de 3 minutos. */
  private const val ESTADO_VALE_MS = 3 * 60_000L

  private val NUVEM = intArrayOf(R.id.b0, R.id.b1, R.id.b2, R.id.b3, R.id.b4)
  private val ETIQUETAS = arrayOf(
    Triple(R.id.p0, R.id.p0_balao, R.id.p0_texto),
    Triple(R.id.p1, R.id.p1_balao, R.id.p1_texto),
    Triple(R.id.p2, R.id.p2_balao, R.id.p2_texto),
  )
  private val ESCOLHA = intArrayOf(
    R.id.e0, R.id.e1, R.id.e2, R.id.e3, R.id.e4, R.id.e5, R.id.e6,
    R.id.e7, R.id.e8, R.id.e9, R.id.e10, R.id.e11, R.id.e12, R.id.e13,
  )

  /** Um registro de hoje para as etiquetas: a emoção e a hora ("10:12"). */
  data class Registro(val id: String, val hora: String)

  data class Dia(val emocoes: List<String>, val total: Int, val recentes: List<Registro> = emptyList())

  private fun prefs(c: Context) = c.getSharedPreferences("consi_widgets", Context.MODE_PRIVATE)

  /** "2026-11-21", no fuso do aparelho (o mesmo formato de chaveDia no JS). */
  private fun hoje() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  fun lerDia(c: Context): Dia = try {
    val j = JSONObject(prefs(c).getString("dia", "{}") ?: "{}")
    if (j.optString("dia") != hoje()) {
      Dia(emptyList(), 0)
    } else {
      val lista = j.optJSONArray("emocoes")
      val ids = (0 until (lista?.length() ?: 0)).mapNotNull { lista?.optString(it) }.filter { emocaoPorId(it) != null }
      val r = j.optJSONArray("recentes")
      val recentes = (0 until (r?.length() ?: 0)).mapNotNull { i ->
        val o = r?.optJSONObject(i) ?: return@mapNotNull null
        val id = o.optString("id")
        if (emocaoPorId(id) == null) null else Registro(id, o.optString("hora"))
      }
      Dia(ids, j.optInt("total", ids.size), recentes)
    }
  } catch (_: Exception) {
    Dia(emptyList(), 0)
  }

  /** Chamado pelo app sempre que os registros de hoje mudam. */
  fun guardar(c: Context, json: String) {
    val p = prefs(c)
    val e = p.edit().putString("dia", json)
    // Acabou de registrar (ou mudou algo): o grande volta ao início.
    p.all.keys.filter { it.startsWith("estado:") }.forEach { e.remove(it) }
    e.apply()
    atualizarTodos(c)
  }

  fun atualizarTodos(c: Context) {
    val mgr = AppWidgetManager.getInstance(c)
    for (tipo in listOf(WidgetPequeno::class.java, WidgetMedio::class.java, WidgetGrande::class.java)) {
      val ids = mgr.getAppWidgetIds(ComponentName(c, tipo))
      for (id in ids) desenhar(c, mgr, tipo, id)
    }
    agendarMeiaNoite(c)
  }

  fun desenhar(c: Context, mgr: AppWidgetManager, tipo: Class<*>, id: Int) {
    val v = when (tipo) {
      WidgetPequeno::class.java -> pequeno(c, id)
      WidgetMedio::class.java -> medio(c, id)
      else -> grande(c, id)
    }
    try {
      mgr.updateAppWidget(id, v)
    } catch (_: Exception) {
      // o launcher recusou o desenho: fica o anterior
    }
  }

  // ─── Estado do grande ───────────────────────────────────────────────────
  /** "inicio", "escolha" ou "confirmar:<id da emoção>". */
  private fun estado(c: Context, id: Int): String {
    val p = prefs(c)
    val em = p.getLong("estadoEm:$id", 0L)
    if (System.currentTimeMillis() - em > ESTADO_VALE_MS) return "inicio"
    return p.getString("estado:$id", "inicio") ?: "inicio"
  }

  fun mudarEstado(c: Context, id: Int, novo: String) {
    prefs(c).edit().putString("estado:$id", novo).putLong("estadoEm:$id", System.currentTimeMillis()).apply()
    desenhar(c, AppWidgetManager.getInstance(c), WidgetGrande::class.java, id)
    if (novo != "inicio") agendar(c, System.currentTimeMillis() + ESTADO_VALE_MS + 1_000L, 2)
  }

  fun esquecer(c: Context, id: Int) {
    prefs(c).edit().remove("estado:$id").remove("estadoEm:$id").apply()
  }

  // ─── Desenhos ───────────────────────────────────────────────────────────
  private fun resumo(d: Dia) = when (d.total) {
    0 -> "Como você está?"
    1 -> "1 registro hoje"
    else -> "${d.total} registros hoje"
  }

  private fun nuvem(v: RemoteViews, d: Dia) {
    val vazio = d.emocoes.isEmpty()
    v.setViewVisibility(R.id.nuvem, if (vazio) View.GONE else View.VISIBLE)
    v.setViewVisibility(R.id.vazio, if (vazio) View.VISIBLE else View.GONE)
    if (vazio) {
      v.setContentDescription(R.id.vazio, "Nenhuma emoção registrada hoje")
      return
    }
    NUVEM.forEachIndexed { i, vista ->
      val e = emocaoPorId(d.emocoes.getOrNull(i))
      if (e == null) {
        v.setViewVisibility(vista, View.GONE)
      } else {
        v.setImageViewResource(vista, e.balao)
        v.setViewVisibility(vista, View.VISIBLE)
      }
    }
    v.setContentDescription(R.id.nuvem, "Hoje: " + d.emocoes.mapNotNull { emocaoPorId(it)?.nome }.joinToString(", "))
  }

  private fun pequeno(c: Context, id: Int): RemoteViews {
    val d = lerDia(c)
    val v = RemoteViews(c.packageName, R.layout.consi_widget_pequeno)
    nuvem(v, d)
    v.setTextViewText(R.id.resumo, resumo(d))
    v.setViewVisibility(R.id.dica, if (d.total == 0) View.VISIBLE else View.GONE)
    v.setOnClickPendingIntent(R.id.toque, abrir(c, if (d.total == 0) "consi://diario/novo" else "consi://diario", codigo(id, 1)))
    return v
  }

  private fun medio(c: Context, id: Int): RemoteViews {
    val d = lerDia(c)
    val v = RemoteViews(c.packageName, R.layout.consi_widget_medio)
    nuvem(v, d)
    v.setTextViewText(R.id.resumo, resumo(d))
    v.setOnClickPendingIntent(R.id.toque, abrir(c, if (d.total == 0) "consi://diario/novo" else "consi://diario", codigo(id, 1)))
    v.setOnClickPendingIntent(R.id.acao_registrar, abrir(c, "consi://registrar", codigo(id, 2)))
    v.setOnClickPendingIntent(R.id.acao_escrever, abrir(c, "consi://diario/novo", codigo(id, 3)))
    v.setOnClickPendingIntent(R.id.acao_atividades, abrir(c, "consi://hobbies", codigo(id, 4)))
    return v
  }

  private fun grande(c: Context, id: Int): RemoteViews {
    val v = RemoteViews(c.packageName, R.layout.consi_widget_grande)
    val e = estado(c, id)
    val escolhida = if (e.startsWith("confirmar:")) emocaoPorId(e.removePrefix("confirmar:")) else null
    val tela = when {
      escolhida != null -> R.id.confirmar
      e == "escolha" -> R.id.escolha
      else -> R.id.inicio
    }
    for (t in intArrayOf(R.id.inicio, R.id.escolha, R.id.confirmar)) v.setViewVisibility(t, if (t == tela) View.VISIBLE else View.GONE)

    when (tela) {
      R.id.inicio -> {
        val d = lerDia(c)
        // Etiquetas dos últimos registros, como na Home: duas na primeira linha, uma na segunda.
        ETIQUETAS.forEachIndexed { i, (vista, balao, texto) ->
          val r = d.recentes.getOrNull(i)
          val e = emocaoPorId(r?.id)
          if (r == null || e == null) {
            v.setViewVisibility(vista, View.GONE)
          } else {
            v.setViewVisibility(vista, View.VISIBLE)
            v.setImageViewResource(balao, e.balao)
            v.setTextViewText(texto, "${e.nome} · às ${r.hora}")
            v.setOnClickPendingIntent(vista, abrir(c, "consi://diario", codigo(id, 20 + i)))
          }
        }
        v.setViewVisibility(R.id.etiquetas_2, if (d.recentes.size > 2) View.VISIBLE else View.GONE)
        v.setOnClickPendingIntent(R.id.inicio_balao, acao(c, id, ACAO_ESCOLHER, null, codigo(id, 1)))
      }
      R.id.escolha -> {
        v.setOnClickPendingIntent(R.id.fechar, acao(c, id, ACAO_VOLTAR, null, codigo(id, 2)))
        ESCOLHA.forEachIndexed { i, vista ->
          val emo = EMOCOES[i]
          v.setImageViewResource(vista, emo.balao)
          v.setContentDescription(vista, emo.nome)
          v.setOnClickPendingIntent(vista, acao(c, id, ACAO_EMOCAO, emo.id, codigo(id, 40 + i)))
        }
      }
      else -> {
        val emo = escolhida!!
        v.setImageViewResource(R.id.confirmar_balao, emo.balao)
        v.setContentDescription(R.id.confirmar_balao, emo.nome)
        v.setTextViewText(R.id.confirmar_nome, emo.nome)
        v.setOnClickPendingIntent(
          R.id.confirmar_sim,
          abrir(c, "consi://registrar?emocao=${Uri.encode(emo.id)}&origem=widget", codigo(id, 3)),
        )
        v.setOnClickPendingIntent(R.id.confirmar_voltar, acao(c, id, ACAO_ESCOLHER, null, codigo(id, 4)))
      }
    }
    return v
  }

  // ─── Toques ─────────────────────────────────────────────────────────────
  /** Um código diferente por widget e por botão, para os PendingIntents não se sobreporem. */
  private fun codigo(widget: Int, botao: Int) = widget * 100 + botao

  /** Abre o Consi num endereço (consi://…), pelo mesmo caminho dos links de dentro do app. */
  private fun abrir(c: Context, endereco: String, codigo: Int): PendingIntent =
    PendingIntent.getActivity(
      c,
      codigo,
      Intent(Intent.ACTION_VIEW, Uri.parse(endereco))
        .setPackage(c.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** Muda o estado do widget grande sem abrir o app. */
  private fun acao(c: Context, widget: Int, acao: String, emocao: String?, codigo: Int): PendingIntent =
    PendingIntent.getBroadcast(
      c,
      codigo,
      Intent(c, WidgetGrande::class.java)
        .setAction(acao)
        .setData(Uri.parse("consi-widget://$widget/$acao/${emocao ?: ""}"))
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widget)
        .putExtra(EXTRA_EMOCAO, emocao),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  // ─── Alarmes ────────────────────────────────────────────────────────────
  /** Logo depois da meia-noite o dia muda e os widgets ficam vazios até o primeiro registro. */
  private fun agendarMeiaNoite(c: Context) {
    val meiaNoite = Calendar.getInstance().apply {
      add(Calendar.DAY_OF_YEAR, 1)
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 30)
      set(Calendar.MILLISECOND, 0)
    }
    agendar(c, meiaNoite.timeInMillis, 1)
  }

  /** Alarme não exato (não precisa de permissão; o Android pode atrasar alguns minutos). */
  private fun agendar(c: Context, quando: Long, codigo: Int) {
    try {
      val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pi = PendingIntent.getBroadcast(
        c,
        codigo,
        Intent(c, WidgetPequeno::class.java).setAction(ACAO_ATUALIZAR),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      am.set(AlarmManager.RTC, quando, pi)
    } catch (_: Exception) {
      // sem alarme, o widget se atualiza na próxima vez que o app abrir
    }
  }
}

/** Base dos três widgets: redesenham tudo quando o sistema pede ou o alarme toca. */
open class WidgetConsi : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    Widgets.atualizarTodos(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Widgets.ACAO_ATUALIZAR) Widgets.atualizarTodos(context)
  }
}

class WidgetPequeno : WidgetConsi()

class WidgetMedio : WidgetConsi()

/** O grande ainda troca de estado com os toques (início → escolha → confirmação). */
class WidgetGrande : WidgetConsi() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
    when (intent.action) {
      Widgets.ACAO_ESCOLHER -> Widgets.mudarEstado(context, id, "escolha")
      Widgets.ACAO_VOLTAR -> Widgets.mudarEstado(context, id, "inicio")
      Widgets.ACAO_EMOCAO -> {
        val emocao = intent.getStringExtra(Widgets.EXTRA_EMOCAO)
        if (emocaoPorId(emocao) != null) Widgets.mudarEstado(context, id, "confirmar:$emocao")
      }
    }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    appWidgetIds.forEach { Widgets.esquecer(context, it) }
  }
}
