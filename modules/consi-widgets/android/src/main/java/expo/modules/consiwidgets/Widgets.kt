package expo.modules.consiwidgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Os widgets do Consi na tela inicial do Android (frames na seção "12 · WIDGETS E
 * NOTIFICAÇÕES" do Figma).
 *
 * - Seu dia (2×2): o aglomerado das emoções de hoje e quantos registros. Tocar abre o Diário;
 *   sem registros, o novo momento do Diário (consi://diario/novo) para escrever.
 * - Dia e atalhos (4×2, redimensionável): o dia e três atalhos (Registrar emoção, Escrever no
 *   Diário, Explorar atividades). Encolhe em passos: dia + botões com texto → só os botões com
 *   texto (estreito) → dia menor + botões só com ícone (baixo) → só os três ícones.
 * - Check-in (4×4): o check-in da Home adaptado a toques (widgets não recebem arrastar): o "?"
 *   com as etiquetas dos últimos registros, as 14 emoções espalhadas como na Home e a
 *   confirmação. Do Android 12 em diante os balões são medidos para o tamanho real do widget,
 *   então todas as emoções aparecem mesmo num widget menor.
 * - Suas atividades: as atividades em andamento (até 3, conforme a altura).
 * - Uma frase: as frases filosóficas da pausa, uma por dia, com "Outra frase".
 * - Para você: uma atividade sugerida; "Explorar" abre o detalhe, "Não agora" abre a aba
 *   Hobbies e tira essa sugestão da pilha.
 *
 * O banco do Consi é criptografado e só o JS o abre: o app manda os dados prontos
 * (ConsiWidgetsModule.atualizar) e o widget nunca lê o banco nem grava nada nele.
 *
 * Tamanhos: do Android 12 em diante o launcher informa cada tamanho em que o widget aparece
 * (retrato e paisagem) e recebe um layout para cada um. Antes disso, vale o tamanho em retrato.
 */
internal object Widgets {
  const val ACAO_ATUALIZAR = "expo.modules.consiwidgets.ATUALIZAR"
  const val ACAO_ESCOLHER = "expo.modules.consiwidgets.ESCOLHER"
  const val ACAO_EMOCAO = "expo.modules.consiwidgets.EMOCAO"
  const val ACAO_VOLTAR = "expo.modules.consiwidgets.VOLTAR"
  const val ACAO_OUTRA_FRASE = "expo.modules.consiwidgets.OUTRA_FRASE"
  const val EXTRA_EMOCAO = "emocao"

  /** Os dados que o app manda (uma chave por assunto). */
  const val DADOS_DIA = "dia"
  const val DADOS_ATIVIDADES = "atividades"
  const val DADOS_SUGESTAO = "sugestao"
  const val DADOS_FRASES = "frases"

  /** Escolha ou confirmação esquecidas no grande voltam ao início depois de 3 minutos. */
  private const val ESTADO_VALE_MS = 3 * 60_000L

  private val TIPOS = listOf(
    WidgetPequeno::class.java,
    WidgetMedio::class.java,
    WidgetGrande::class.java,
    WidgetAtividades::class.java,
    WidgetFrase::class.java,
    WidgetSugestao::class.java,
  )

  private val NUVEM = intArrayOf(R.id.b0, R.id.b1, R.id.b2, R.id.b3, R.id.b4)
  private val ESCOLHA = intArrayOf(
    R.id.e0, R.id.e1, R.id.e2, R.id.e3, R.id.e4, R.id.e5, R.id.e6,
    R.id.e7, R.id.e8, R.id.e9, R.id.e10, R.id.e11, R.id.e12, R.id.e13,
  )
  private val ETIQUETAS = arrayOf(
    Triple(R.id.p0, R.id.p0_balao, R.id.p0_texto),
    Triple(R.id.p1, R.id.p1_balao, R.id.p1_texto),
    Triple(R.id.p2, R.id.p2_balao, R.id.p2_texto),
  )
  private val ATIVIDADES = arrayOf(
    Triple(R.id.a0, R.id.a0_titulo, R.id.a0_detalhe),
    Triple(R.id.a1, R.id.a1_titulo, R.id.a1_detalhe),
    Triple(R.id.a2, R.id.a2_titulo, R.id.a2_detalhe),
  )

  private fun prefs(c: Context) = c.getSharedPreferences("consi_widgets", Context.MODE_PRIVATE)

  // ─── Dados ──────────────────────────────────────────────────────────────
  /** Um registro de hoje para as etiquetas: a emoção e a hora ("10:12"). */
  data class Registro(val id: String, val hora: String)

  data class Dia(val emocoes: List<String>, val total: Int, val recentes: List<Registro> = emptyList())

  data class Atividade(val id: String, val titulo: String, val hobby: String, val minutos: Int, val resumo: String = "")

  data class Frase(val texto: String, val autor: String, val obra: String)

  /** "2026-11-21", no fuso do aparelho (o mesmo formato de chaveDia no JS). */
  private fun hoje() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  private fun json(c: Context, chave: String): JSONObject? = try {
    prefs(c).getString(chave, null)?.let { JSONObject(it) }
  } catch (_: Exception) {
    null
  }

  fun lerDia(c: Context): Dia {
    val j = json(c, DADOS_DIA) ?: return Dia(emptyList(), 0)
    if (j.optString("dia") != hoje()) return Dia(emptyList(), 0)
    val lista = j.optJSONArray("emocoes") ?: JSONArray()
    val ids = (0 until lista.length()).map { lista.optString(it) }.filter { emocaoPorId(it) != null }
    val r = j.optJSONArray("recentes") ?: JSONArray()
    val recentes = (0 until r.length()).mapNotNull { i ->
      val o = r.optJSONObject(i) ?: return@mapNotNull null
      val id = o.optString("id")
      if (emocaoPorId(id) == null) null else Registro(id, o.optString("hora"))
    }
    return Dia(ids, j.optInt("total", ids.size), recentes)
  }

  private fun atividade(o: JSONObject) = Atividade(
    o.optString("id"),
    o.optString("titulo"),
    o.optString("hobby"),
    o.optInt("minutos"),
    o.optString("resumo"),
  )

  private fun lerAtividades(c: Context): Pair<List<Atividade>, Int> {
    val j = json(c, DADOS_ATIVIDADES) ?: return emptyList<Atividade>() to 0
    val l = j.optJSONArray("lista") ?: JSONArray()
    val lista = (0 until l.length()).mapNotNull { l.optJSONObject(it)?.let(::atividade) }
    return lista to j.optInt("total", lista.size)
  }

  private fun lerSugestao(c: Context): Atividade? =
    json(c, DADOS_SUGESTAO)?.optJSONObject("sugestao")?.let(::atividade)?.takeIf { it.id.isNotEmpty() }

  /** A frase de hoje: uma por dia, e "Outra frase" avança na lista. */
  private fun fraseAtual(c: Context): Frase? {
    val l = json(c, DADOS_FRASES)?.optJSONArray("frases") ?: return null
    if (l.length() == 0) return null
    val agora = Calendar.getInstance()
    val diaLocal = (agora.timeInMillis + TimeZone.getDefault().getOffset(agora.timeInMillis)) / 86_400_000L
    val desvio = prefs(c).getInt("frase-desvio", 0)
    val o = l.optJSONObject(((diaLocal + desvio) % l.length()).toInt()) ?: return null
    return Frase(o.optString("texto"), o.optString("autor"), o.optString("obra"))
  }

  /** Chamado pelo app sempre que um assunto muda. */
  fun guardar(c: Context, chave: String, json: String) {
    val p = prefs(c)
    val e = p.edit().putString(chave, json)
    // Acabou de registrar (ou mudou algo no dia): o grande volta ao início.
    if (chave == DADOS_DIA) p.all.keys.filter { it.startsWith("estado:") }.forEach { e.remove(it) }
    e.apply()
    atualizarTodos(c)
  }

  fun outraFrase(c: Context) {
    val p = prefs(c)
    p.edit().putInt("frase-desvio", p.getInt("frase-desvio", 0) + 1).apply()
    atualizarTipo(c, WidgetFrase::class.java)
  }

  // ─── Desenho ────────────────────────────────────────────────────────────
  fun atualizarTodos(c: Context) {
    for (tipo in TIPOS) atualizarTipo(c, tipo)
    agendarMeiaNoite(c)
  }

  private fun atualizarTipo(c: Context, tipo: Class<*>) {
    val mgr = AppWidgetManager.getInstance(c)
    for (id in mgr.getAppWidgetIds(ComponentName(c, tipo))) desenhar(c, mgr, tipo, id)
  }

  fun desenhar(c: Context, mgr: AppWidgetManager, tipo: Class<*>, id: Int) {
    val construir: (SizeF) -> RemoteViews = { t ->
      when (tipo) {
        WidgetPequeno::class.java -> pequeno(c, id)
        WidgetMedio::class.java -> medio(c, id, t)
        WidgetGrande::class.java -> grande(c, id, t)
        WidgetAtividades::class.java -> atividades(c, id, t)
        WidgetFrase::class.java -> frase(c, id, t)
        else -> sugestao(c, id, t)
      }
    }
    val tamanhos = tamanhos(mgr.getAppWidgetOptions(id), tipo)
    try {
      val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && tamanhos.size > 1) {
        RemoteViews(tamanhos.associateWith(construir))
      } else {
        construir(tamanhos.first())
      }
      mgr.updateAppWidget(id, v)
    } catch (_: Exception) {
      // o launcher recusou o desenho: fica o anterior
    }
  }

  /** Os tamanhos (dp) em que o widget aparece. Sem informação, um tamanho padrão do tipo. */
  private fun tamanhos(o: Bundle?, tipo: Class<*>): List<SizeF> {
    if (o != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val lista = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        o.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES, SizeF::class.java)
      } else {
        @Suppress("DEPRECATION")
        o.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
      }
      val validos = lista?.filter { it.width > 0 && it.height > 0 }?.distinct()?.take(16)
      if (!validos.isNullOrEmpty()) return validos
    }
    // Retrato: a largura mínima e a altura máxima.
    val w = o?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) ?: 0
    val h = o?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT) ?: 0
    if (w > 0 && h > 0) return listOf(SizeF(w.toFloat(), h.toFloat()))
    return listOf(
      when (tipo) {
        WidgetPequeno::class.java -> SizeF(170f, 170f)
        WidgetGrande::class.java, WidgetAtividades::class.java, WidgetSugestao::class.java -> SizeF(340f, 340f)
        else -> SizeF(340f, 180f)
      },
    )
  }

  /** Tamanho de uma vista em dp (só Android 12+; antes vale o do layout). */
  private fun medir(v: RemoteViews, vista: Int, w: Float, h: Float) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    v.setViewLayoutWidth(vista, w, TypedValue.COMPLEX_UNIT_DIP)
    v.setViewLayoutHeight(vista, h, TypedValue.COMPLEX_UNIT_DIP)
  }

  private fun posicionar(v: RemoteViews, vista: Int, x: Float, y: Float) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    v.setViewLayoutMargin(vista, RemoteViews.MARGIN_START, x, TypedValue.COMPLEX_UNIT_DIP)
    v.setViewLayoutMargin(vista, RemoteViews.MARGIN_TOP, y, TypedValue.COMPLEX_UNIT_DIP)
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

  // ─── Seu dia e atalhos ──────────────────────────────────────────────────
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

  /** Tocar no dia: o Diário; sem registros, o novo momento para escrever. */
  private fun tocarNoDia(c: Context, v: RemoteViews, d: Dia, id: Int) {
    v.setOnClickPendingIntent(R.id.toque, abrir(c, if (d.total == 0) "consi://diario/novo" else "consi://diario", codigo(id, 1)))
  }

  private fun pequeno(c: Context, id: Int): RemoteViews {
    val d = lerDia(c)
    val v = RemoteViews(c.packageName, R.layout.consi_widget_pequeno)
    nuvem(v, d)
    v.setTextViewText(R.id.resumo, resumo(d))
    v.setViewVisibility(R.id.dica, if (d.total == 0) View.VISIBLE else View.GONE)
    tocarNoDia(c, v, d, id)
    return v
  }

  private fun medio(c: Context, id: Int, t: SizeF): RemoteViews {
    val d = lerDia(c)
    // Do maior para o menor; cada versão só aparece se couber de verdade.
    val layout = when {
      t.width >= 300 && t.height >= 176 -> R.layout.consi_widget_medio
      t.width >= 180 && t.height >= 176 -> R.layout.consi_widget_medio_texto
      t.width >= 272 && t.height >= 96 -> R.layout.consi_widget_medio_dia_icones
      else -> R.layout.consi_widget_medio_icones
    }
    val v = RemoteViews(c.packageName, layout)
    if (layout == R.layout.consi_widget_medio || layout == R.layout.consi_widget_medio_dia_icones) {
      nuvem(v, d)
      v.setTextViewText(R.id.resumo, resumo(d))
      tocarNoDia(c, v, d, id)
    }
    v.setOnClickPendingIntent(R.id.acao_registrar, abrir(c, "consi://registrar", codigo(id, 2)))
    v.setOnClickPendingIntent(R.id.acao_escrever, abrir(c, "consi://diario/novo", codigo(id, 3)))
    v.setOnClickPendingIntent(R.id.acao_atividades, abrir(c, "consi://hobbies", codigo(id, 4)))
    return v
  }

  // ─── Check-in ───────────────────────────────────────────────────────────
  private fun grande(c: Context, id: Int, t: SizeF): RemoteViews {
    val v = RemoteViews(c.packageName, R.layout.consi_widget_grande)
    val e = estado(c, id)
    val escolhida = if (e.startsWith("confirmar:")) emocaoPorId(e.removePrefix("confirmar:")) else null
    val tela = when {
      escolhida != null -> R.id.confirmar
      e == "escolha" -> R.id.escolha
      else -> R.id.inicio
    }
    for (x in intArrayOf(R.id.inicio, R.id.escolha, R.id.confirmar)) v.setViewVisibility(x, if (x == tela) View.VISIBLE else View.GONE)
    // Área útil: o widget menos o padding de 16 dp dos dois lados.
    val largura = t.width - 32f
    val altura = t.height - 32f

    when (tela) {
      R.id.inicio -> {
        val d = lerDia(c)
        ETIQUETAS.forEachIndexed { i, (vista, balao, texto) ->
          val r = d.recentes.getOrNull(i)
          val emo = emocaoPorId(r?.id)
          if (r == null || emo == null) {
            v.setViewVisibility(vista, View.GONE)
          } else {
            v.setViewVisibility(vista, View.VISIBLE)
            v.setImageViewResource(balao, emo.balao)
            v.setTextViewText(texto, "${emo.nome} · às ${r.hora}")
            v.setOnClickPendingIntent(vista, abrir(c, "consi://diario", codigo(id, 20 + i)))
          }
        }
        v.setViewVisibility(R.id.etiquetas_2, if (d.recentes.size > 2) View.VISIBLE else View.GONE)
        // Título e dica (~40 dp), margens (24 dp) e etiquetas (28 ou 64 dp): o balão usa o resto.
        val etiquetas = when {
          d.recentes.size > 2 -> 64f
          d.recentes.isNotEmpty() -> 28f
          else -> 0f
        }
        val lado = (altura - 40f - 24f - etiquetas).coerceIn(56f, 120f).coerceAtMost(largura)
        medir(v, R.id.inicio_balao, lado, lado)
        v.setOnClickPendingIntent(R.id.inicio_balao, acao(c, id, ACAO_ESCOLHER, null, codigo(id, 1)))
      }
      R.id.escolha -> {
        v.setOnClickPendingIntent(R.id.fechar, acao(c, id, ACAO_VOLTAR, null, codigo(id, 2)))
        espalhar(v, largura, altura - 48f)
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
        // Nome e pergunta (~48 dp) e os botões com a margem (60 dp).
        val lado = (altura - 48f - 60f).coerceIn(48f, 112f)
        medir(v, R.id.confirmar_balao, lado, lado)
        v.setOnClickPendingIntent(
          R.id.confirmar_sim,
          abrir(c, "consi://registrar?emocao=${Uri.encode(emo.id)}&origem=widget", codigo(id, 3)),
        )
        v.setOnClickPendingIntent(R.id.confirmar_voltar, acao(c, id, ACAO_ESCOLHER, null, codigo(id, 4)))
      }
    }
    return v
  }

  /**
   * As 14 emoções nas posições da Home, esticadas para a área livre (`largura` × `altura`, em
   * dp). O balão diminui junto, para todas caberem; a nuvem ocupa a área toda.
   */
  private fun espalhar(v: RemoteViews, largura: Float, altura: Float) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val w = largura.coerceAtLeast(120f)
    val h = altura.coerceAtLeast(100f)
    medir(v, R.id.escolha_nuvem, w, h)
    val lado = minOf(w / 5.2f, h / 4.6f).coerceIn(28f, 60f)
    val minX = EMOCOES.minOf { it.x }
    val maxX = EMOCOES.maxOf { it.x }
    val minY = EMOCOES.minOf { it.y }
    val maxY = EMOCOES.maxOf { it.y }
    EMOCOES.forEachIndexed { i, emo ->
      val x = (emo.x - minX).toFloat() / (maxX - minX) * (w - lado)
      val y = (emo.y - minY).toFloat() / (maxY - minY) * (h - lado)
      medir(v, ESCOLHA[i], lado, lado)
      posicionar(v, ESCOLHA[i], x, y)
    }
  }

  // ─── Suas atividades ────────────────────────────────────────────────────
  private fun detalhe(a: Atividade) = listOf(a.hobby, if (a.minutos > 0) "${a.minutos} min" else "").filter { it.isNotEmpty() }.joinToString(" · ")

  private fun atividades(c: Context, id: Int, t: SizeF): RemoteViews {
    val v = RemoteViews(c.packageName, R.layout.consi_widget_atividades)
    val (lista, total) = lerAtividades(c)
    // Título (~24 dp) + linhas de 64 dp (56 + 8 de espaço), dentro do padding de 16 dp.
    val cabem = ((t.height - 32f - 24f) / 64f).toInt().coerceIn(1, ATIVIDADES.size)
    v.setOnClickPendingIntent(R.id.atividades_topo, abrir(c, "consi://hobbies", codigo(id, 1)))
    v.setTextViewText(R.id.atividades_total, if (total > 0) "$total em andamento" else "")
    v.setViewVisibility(R.id.atividades_vazio, if (lista.isEmpty()) View.VISIBLE else View.GONE)
    v.setOnClickPendingIntent(R.id.atividades_explorar, abrir(c, "consi://hobbies", codigo(id, 2)))
    ATIVIDADES.forEachIndexed { i, (linha, titulo, detalhe) ->
      val a = lista.getOrNull(i)
      if (a == null || i >= cabem) {
        v.setViewVisibility(linha, View.GONE)
      } else {
        v.setViewVisibility(linha, View.VISIBLE)
        v.setTextViewText(titulo, a.titulo)
        v.setTextViewText(detalhe, detalhe(a))
        v.setOnClickPendingIntent(linha, abrir(c, "consi://hobby/detalhe?id=${Uri.encode(a.id)}", codigo(id, 10 + i)))
      }
    }
    return v
  }

  // ─── Uma frase ──────────────────────────────────────────────────────────
  private fun frase(c: Context, id: Int, t: SizeF): RemoteViews {
    val v = RemoteViews(c.packageName, R.layout.consi_widget_frase)
    val f = fraseAtual(c)
    v.setTextViewText(R.id.frase_texto, f?.let { "“${it.texto}”" } ?: "Abra o Consi para trazer as frases.")
    v.setTextViewText(R.id.frase_autor, f?.let { listOf(it.autor, it.obra).filter { s -> s.isNotEmpty() }.joinToString(", ") } ?: "")
    // Rótulo e botão (~64 dp) fora; cada linha do texto tem ~24 dp.
    val baixo = t.height < 150f
    v.setViewVisibility(R.id.frase_rotulo, if (baixo) View.GONE else View.VISIBLE)
    val linhas = ((t.height - 32f - (if (baixo) 0f else 20f) - 44f - 24f) / 24f).toInt().coerceIn(2, 8)
    v.setInt(R.id.frase_texto, "setMaxLines", linhas)
    v.setOnClickPendingIntent(R.id.frase_outra, acao(c, id, ACAO_OUTRA_FRASE, null, codigo(id, 1), WidgetFrase::class.java))
    return v
  }

  // ─── Para você ──────────────────────────────────────────────────────────
  private fun sugestao(c: Context, id: Int, t: SizeF): RemoteViews {
    val v = RemoteViews(c.packageName, R.layout.consi_widget_sugestao)
    val s = lerSugestao(c)
    val baixo = t.height < 200f
    if (s == null) {
      v.setViewVisibility(R.id.sugestao_etiqueta, View.GONE)
      v.setTextViewText(R.id.sugestao_titulo, "Veja as atividades para os seus hobbies")
      v.setViewVisibility(R.id.sugestao_resumo, View.GONE)
      v.setViewVisibility(R.id.sugestao_minutos, View.GONE)
      v.setViewVisibility(R.id.sugestao_nao, View.GONE)
      v.setTextViewText(R.id.sugestao_sim_rotulo, "Abrir Hobbies")
      v.setOnClickPendingIntent(R.id.sugestao_sim, abrir(c, "consi://hobbies", codigo(id, 1)))
      return v
    }
    v.setViewVisibility(R.id.sugestao_etiqueta, if (s.hobby.isEmpty()) View.GONE else View.VISIBLE)
    v.setTextViewText(R.id.sugestao_hobby, s.hobby)
    v.setTextViewText(R.id.sugestao_titulo, s.titulo)
    v.setTextViewText(R.id.sugestao_resumo, s.resumo)
    v.setViewVisibility(R.id.sugestao_resumo, if (baixo || s.resumo.isEmpty()) View.GONE else View.VISIBLE)
    v.setTextViewText(R.id.sugestao_minutos, if (s.minutos > 0) "${s.minutos} min" else "")
    v.setViewVisibility(R.id.sugestao_minutos, if (s.minutos > 0) View.VISIBLE else View.GONE)
    v.setOnClickPendingIntent(R.id.sugestao_sim, abrir(c, "consi://hobby/detalhe?id=${Uri.encode(s.id)}", codigo(id, 2)))
    v.setOnClickPendingIntent(R.id.sugestao_nao, abrir(c, "consi://hobbies?ignorar=${Uri.encode(s.id)}", codigo(id, 3)))
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

  /** Muda o widget sem abrir o app (estado do grande, outra frase). */
  private fun acao(
    c: Context,
    widget: Int,
    acao: String,
    emocao: String?,
    codigo: Int,
    tipo: Class<*> = WidgetGrande::class.java,
  ): PendingIntent =
    PendingIntent.getBroadcast(
      c,
      codigo,
      Intent(c, tipo)
        .setAction(acao)
        .setData(Uri.parse("consi-widget://$widget/$acao/${emocao ?: ""}"))
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widget)
        .putExtra(EXTRA_EMOCAO, emocao),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  // ─── Alarmes ────────────────────────────────────────────────────────────
  /** Logo depois da meia-noite o dia muda: widgets do dia vazios e a frase nova. */
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

/** Base dos widgets: redesenham quando o sistema pede, o alarme toca ou o tamanho muda. */
open class WidgetConsi : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    Widgets.atualizarTodos(context)
  }

  override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    Widgets.desenhar(context, appWidgetManager, javaClass, appWidgetId)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Widgets.ACAO_ATUALIZAR) Widgets.atualizarTodos(context)
  }
}

class WidgetPequeno : WidgetConsi()

class WidgetMedio : WidgetConsi()

class WidgetAtividades : WidgetConsi()

class WidgetSugestao : WidgetConsi()

/** "Outra frase" avança a frase sem abrir o app. */
class WidgetFrase : WidgetConsi() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Widgets.ACAO_OUTRA_FRASE) Widgets.outraFrase(context)
  }
}

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
