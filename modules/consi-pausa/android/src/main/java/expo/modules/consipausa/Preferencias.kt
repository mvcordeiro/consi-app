package expo.modules.consipausa

import android.content.Context
import org.json.JSONObject

/** A regra de um app, vinda do grupo dele na Home (ver src/data/vigia.ts). */
internal data class Regra(
  val modo: String,
  val grupo: String,
  val nome: String,
  val intervaloMin: Int,
  val aoIgnorar: String,
  /** Timer flutuante por cima do app; sem ele, a contagem fica na notificação. */
  val flutuante: Boolean,
  /** pilula | faixa | bolha (ver Bolha.kt). */
  val estiloTimer: String,
)

/**
 * O que o vigia precisa saber mesmo com o app fechado: se está ligado, as regras de cada app
 * e até quando cada app está liberado depois de uma pausa.
 */
internal class Preferencias(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("consi_pausa", Context.MODE_PRIVATE)

  var ativa: Boolean
    get() = prefs.getBoolean("ativa", false)
    set(valor) = prefs.edit().putBoolean("ativa", valor).apply()

  var regrasJson: String
    get() = prefs.getString("regras", "{}") ?: "{}"
    set(valor) = prefs.edit().putString("regras", valor).apply()

  /** App liberado até sair da frente (pausa sem "Quanto tempo você precisa?"). */
  var liberadoNaSessao: String?
    get() = prefs.getString("liberado-sessao", null)
    set(valor) = prefs.edit().putString("liberado-sessao", valor).apply()

  /** Lembretes de cuidado com o tempo de tela (uso seguido do celular, ver TempoDeTela.kt). */
  var lembretesTela: Boolean
    get() = prefs.getBoolean("lembretes-tela", false)
    set(valor) = prefs.edit().putBoolean("lembretes-tela", valor).apply()

  /** De quantos em quantos minutos de uso seguido vem o lembrete (20 ou 30 nos Ajustes). */
  var lembretesTelaMin: Int
    get() = prefs.getInt("lembretes-tela-min", 30)
    set(valor) = prefs.edit().putInt("lembretes-tela-min", valor).apply()

  /** O vigia precisa rodar: pausa nos apps ligada ou lembretes de tela ligados. */
  val precisaDoVigia get() = ativa || lembretesTela

  /** Índice da próxima sugestão do lembrete de tela (uma diferente a cada vez). */
  fun proximaSugestao(total: Int): Int {
    val i = prefs.getInt("sugestao-tela", 0).mod(total)
    prefs.edit().putInt("sugestao-tela", i + 1).apply()
    return i
  }

  fun liberadoAte(pacote: String) = prefs.getLong("liberado:$pacote", 0L)

  fun liberarAte(pacote: String, ate: Long) = prefs.edit().putLong("liberado:$pacote", ate).apply()

  /**
   * "Cuidar tempo": quando vence o lembrete do app e quando ele foi visto na frente pela última
   * vez. Guardado para o timer continuar valendo depois que a pessoa sai e volta (ou "fecha" o
   * app pelas abas recentes).
   */
  fun proximoLembrete(pacote: String) = prefs.getLong("lembrete:$pacote", 0L)

  fun vistoEm(pacote: String) = prefs.getLong("visto:$pacote", 0L)

  fun guardarCiclo(pacote: String, proximo: Long, visto: Long) =
    prefs.edit().putLong("lembrete:$pacote", proximo).putLong("visto:$pacote", visto).apply()

  fun regras(): Map<String, Regra> {
    val json = regrasJson
    cache?.let { (de, valor) -> if (de == json) return valor }
    val lidas = mutableMapOf<String, Regra>()
    try {
      val apps = JSONObject(json).optJSONObject("apps") ?: JSONObject()
      for (pacote in apps.keys()) {
        val r = apps.getJSONObject(pacote)
        lidas[pacote] = Regra(
          modo = r.optString("modo", "nao-interromper"),
          grupo = r.optString("grupo", ""),
          nome = r.optString("nome", pacote),
          intervaloMin = r.optInt("intervaloMin", 15).coerceAtLeast(1),
          aoIgnorar = r.optString("aoIgnorar", "resetar"),
          flutuante = r.optBoolean("flutuante", true),
          estiloTimer = r.optString("estiloTimer", "pilula"),
        )
      }
    } catch (_: Exception) {
      // regras inválidas: nenhum app é pausado
    }
    cache = json to lidas
    return lidas
  }

  companion object {
    @Volatile
    private var cache: Pair<String, Map<String, Regra>>? = null
  }
}
