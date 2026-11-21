package expo.modules.consipausa

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.res.ResourcesCompat
import kotlin.math.abs
import kotlin.math.hypot

/**
 * O timer flutuante por cima do app (Figma 736:13664, "02 · FLUTUANTE 1"): uma pílula azul
 * com o relógio e o tempo. Dá para arrastar para qualquer lugar; ao soltar, encosta na borda
 * mais próxima. Arrastando, aparece um X embaixo: soltar em cima dele esconde o timer até a
 * pessoa sair do app (a contagem continua e passa para a notificação).
 *
 * Estilos (escolhidos no grupo, em Consi):
 * - pilula: vertical, relógio em cima e "12min" embaixo (o do Figma);
 * - faixa: horizontal, relógio e "12min" lado a lado;
 * - bolha: um círculo só com "12:03".
 */
internal class Bolha(private val context: Context, private val aoDescartar: () -> Unit) {
  private val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val prefs = context.getSharedPreferences("consi_pausa", Context.MODE_PRIVATE)
  private var vista: LinearLayout? = null
  private var texto: TextView? = null
  private var alvo: FrameLayout? = null
  private var params: WindowManager.LayoutParams? = null
  private var estilo = ""
  /** Até quando (ou desde quando, contando para cima) o timer conta, em ms do relógio. */
  private var marco = 0L
  private var paraCima = false
  /** Tamanho da tela quando a bolha foi posicionada (para reposicionar ao girar o celular). */
  private var telaW = 0
  private var telaH = 0
  private val handler = android.os.Handler(android.os.Looper.getMainLooper())

  /**
   * Relógio próprio da bolha: atualiza na virada de cada segundo do marco, para os segundos
   * andarem certinhos (antes, seguiam o passo de 0,7 s do vigia e pulavam).
   */
  private val relogio = object : Runnable {
    override fun run() {
      val t = texto ?: return
      val agora = System.currentTimeMillis()
      val ms = if (paraCima) agora - marco else marco - agora
      t.text = formatar(ms, paraCima)
      ajustarATela()
      // próxima virada de segundo do marco (+ 15 ms de folga)
      val resto = ((ms % 1000) + 1000) % 1000
      val espera = if (paraCima) 1000 - resto else if (resto == 0L) 1000 else resto
      handler.postDelayed(this, espera + 15)
    }
  }

  val visivel get() = vista != null

  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, context.resources.displayMetrics)
  private fun dpi(v: Float) = dp(v).toInt()

  private data class Tela(val w: Int, val h: Int)

  /** Tamanho atual da tela (muda ao girar; o displayMetrics do serviço pode ficar velho). */
  private fun tamanhoTela(): Tela {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val b = wm.currentWindowMetrics.bounds
      return Tela(b.width(), b.height())
    }
    val p = android.graphics.Point()
    @Suppress("DEPRECATION")
    wm.defaultDisplay.getRealSize(p)
    return Tela(p.x, p.y)
  }

  private val tipoJanela =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

  /**
   * Mostra (ou troca o estilo) a bolha contando até `marcoMs` (ou desde ele, contando para
   * cima). O texto é atualizado pelo relógio próprio da bolha.
   */
  fun mostrar(estiloPedido: String, marcoMs: Long, contandoParaCima: Boolean) {
    val novoMarco = marcoMs != marco || contandoParaCima != paraCima
    marco = marcoMs
    paraCima = contandoParaCima
    if (vista == null || estilo != estiloPedido) {
      esconder()
      criar(estiloPedido)
      handler.post(relogio)
    } else if (novoMarco) {
      handler.removeCallbacks(relogio)
      handler.post(relogio)
    }
  }

  /**
   * Girou a tela (vídeo em tela cheia, paisagem): a bolha volta para a borda dela, na mesma
   * altura proporcional, sem sair da tela.
   */
  private fun ajustarATela() {
    val v = vista ?: return
    val p = params ?: return
    val m = tamanhoTela()
    if (m.w == telaW && m.h == telaH) return
    val fracaoY = if (telaH > 0) p.y.toFloat() / telaH else 0f
    val esquerda = prefs.getString("bolha-lado", "direita") == "esquerda"
    telaW = m.w
    telaH = m.h
    val largura = if (v.width > 0) v.width else dpi(56f)
    val altura = if (v.height > 0) v.height else dpi(82f)
    p.x = if (esquerda) dpi(12f) else telaW - largura - dpi(12f)
    p.y = (fracaoY * telaH).toInt().coerceIn(dpi(16f), (telaH - altura - dpi(16f)).coerceAtLeast(dpi(16f)))
    runCatching { wm.updateViewLayout(v, p) }
  }

  fun esconder() {
    handler.removeCallbacks(relogio)
    vista?.let { runCatching { wm.removeView(it) } }
    alvo?.let { runCatching { wm.removeView(it) } }
    vista = null
    texto = null
    alvo = null
  }

  private fun formatar(ms: Long, paraCima: Boolean): String {
    // Contagem regressiva arredonda para cima (mostra 0:01 até o último instante), como um cronômetro.
    val s = (if (paraCima) ms / 1000 else (ms + 999) / 1000).coerceAtLeast(0)
    if (estilo == "bolha") return "%d:%02d".format(s / 60, s % 60)
    return when {
      s >= 3600 -> "${s / 3600}h${"%02d".format((s % 3600) / 60)}"
      s >= 60 -> "${if (paraCima) s / 60 else (s + 59) / 60}min"
      else -> "${s}s"
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun criar(e: String) {
    estilo = e
    val fonte = runCatching { ResourcesCompat.getFont(context, R.font.consi_sans_book) }.getOrNull() ?: Typeface.DEFAULT
    val fundo = GradientDrawable().apply {
      setColor(Color.parseColor("#111D4F"))
      setStroke(dpi(1f), Color.parseColor("#6A82EA"))
      cornerRadius = dp(999f)
      if (e == "bolha") shape = GradientDrawable.OVAL
    }
    val v = LinearLayout(context).apply {
      background = fundo
      gravity = Gravity.CENTER
      elevation = dp(6f)
      when (e) {
        "faixa" -> {
          orientation = LinearLayout.HORIZONTAL
          setPadding(dpi(14f), dpi(10f), dpi(14f), dpi(10f))
        }
        "bolha" -> {
          orientation = LinearLayout.VERTICAL
          minimumWidth = dpi(56f)
          minimumHeight = dpi(56f)
          setPadding(dpi(6f), dpi(6f), dpi(6f), dpi(6f))
        }
        else -> {
          orientation = LinearLayout.VERTICAL
          setPadding(dpi(8f), dpi(20f), dpi(8f), dpi(20f))
        }
      }
    }
    if (e != "bolha") {
      val relogio = ImageView(context).apply { setImageResource(R.drawable.consi_relogio) }
      v.addView(relogio, LinearLayout.LayoutParams(dpi(16f), dpi(16f)))
    }
    val t = TextView(context).apply {
      typeface = fonte
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, if (e == "bolha") 13f else 12f)
      includeFontPadding = false
    }
    v.addView(
      t,
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        if (e == "faixa") marginStart = dpi(6f) else if (e != "bolha") topMargin = dpi(8f)
      },
    )
    v.contentDescription = "Tempo no app"

    val tela = tamanhoTela()
    val p = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      tipoJanela,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      // Figma: 12 px da borda direita, 51 px do topo. Guarda onde a pessoa deixou.
      val lado = prefs.getString("bolha-lado", "direita")
      x = if (lado == "esquerda") dpi(12f) else tela.w - dpi(12f) - dpi(if (e == "faixa") 90f else if (e == "bolha") 56f else 49f)
      // A altura é guardada como fração da tela, para valer em retrato e em paisagem.
      y = (prefs.getFloat("bolha-y-fracao", -1f).takeIf { it >= 0f }?.let { it * tela.h }?.toInt() ?: dpi(51f))
        .coerceIn(dpi(16f), (tela.h - dpi(100f)).coerceAtLeast(dpi(16f)))
    }
    telaW = tela.w
    telaH = tela.h
    v.setOnTouchListener(Arraste(v, p))
    runCatching { wm.addView(v, p) }.onFailure { return }
    vista = v
    texto = t
    params = p
  }

  /** O X embaixo, que aparece durante o arraste. */
  private fun mostrarAlvo() {
    if (alvo != null) return
    val lado = dpi(56f)
    val f = FrameLayout(context).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#CC111D4F"))
        setStroke(dpi(1f), Color.WHITE)
      }
      addView(
        TextView(context).apply {
          text = "✕"
          setTextColor(Color.WHITE)
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
          gravity = Gravity.CENTER
        },
        FrameLayout.LayoutParams(lado, lado),
      )
      alpha = 0f
      animate().alpha(1f).setDuration(150).start()
    }
    val p = WindowManager.LayoutParams(
      lado,
      lado,
      tipoJanela,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      y = dpi(64f)
    }
    runCatching { wm.addView(f, p) }.onSuccess { alvo = f }
  }

  private fun esconderAlvo() {
    alvo?.let { runCatching { wm.removeView(it) } }
    alvo = null
  }

  /** Centro do X na tela (para saber se a bolha está em cima dele). */
  private fun centroDoAlvo(): Pair<Float, Float> {
    val m = tamanhoTela()
    return m.w / 2f to m.h - dp(64f) - dp(28f)
  }

  private inner class Arraste(private val v: View, private val p: WindowManager.LayoutParams) : View.OnTouchListener {
    private var x0 = 0
    private var y0 = 0
    private var toqueX = 0f
    private var toqueY = 0f
    private var moveu = false
    private var sobreAlvo = false

    override fun onTouch(view: View, ev: MotionEvent): Boolean {
      when (ev.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          x0 = p.x
          y0 = p.y
          toqueX = ev.rawX
          toqueY = ev.rawY
          moveu = false
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = ev.rawX - toqueX
          val dy = ev.rawY - toqueY
          if (!moveu && hypot(dx, dy) < dp(6f)) return true
          if (!moveu) {
            moveu = true
            mostrarAlvo()
          }
          p.x = (x0 + dx).toInt()
          p.y = (y0 + dy).toInt()
          runCatching { wm.updateViewLayout(v, p) }
          val (ax, ay) = centroDoAlvo()
          val perto = hypot(ev.rawX - ax, ev.rawY - ay) < dp(80f)
          if (perto != sobreAlvo) {
            sobreAlvo = perto
            alvo?.animate()?.scaleX(if (perto) 1.25f else 1f)?.scaleY(if (perto) 1.25f else 1f)?.setDuration(120)?.start()
            v.animate().alpha(if (perto) 0.6f else 1f).setDuration(120).start()
          }
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          esconderAlvo()
          if (!moveu) return true
          if (sobreAlvo) {
            sobreAlvo = false
            esconder()
            aoDescartar()
            return true
          }
          encostarNaBorda()
        }
      }
      return true
    }

    private fun encostarNaBorda() {
      val largura = tamanhoTela().w
      val meio = p.x + v.width / 2
      val esquerda = meio < largura / 2
      val destino = if (esquerda) dpi(12f) else largura - v.width - dpi(12f)
      val altura = tamanhoTela().h
      p.y = p.y.coerceIn(dpi(24f), altura - v.height - dpi(24f))
      prefs.edit()
        .putString("bolha-lado", if (esquerda) "esquerda" else "direita")
        .putFloat("bolha-y-fracao", p.y.toFloat() / altura)
        .apply()
      ValueAnimator.ofInt(p.x, destino).apply {
        duration = 220
        interpolator = DecelerateInterpolator()
        addUpdateListener {
          p.x = it.animatedValue as Int
          if (vista != null) runCatching { wm.updateViewLayout(v, p) }
        }
        start()
      }
      if (abs(destino - p.x) < 1) runCatching { wm.updateViewLayout(v, p) }
    }
  }
}
