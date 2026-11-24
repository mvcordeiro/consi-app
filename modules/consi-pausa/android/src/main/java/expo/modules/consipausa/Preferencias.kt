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

  /** Convite do piloto: quando o alarme toca (epoch ms; 0 = nada agendado) e o texto que o JS mandou. */
  var conviteEm: Long
    get() = prefs.getLong("convite-em", 0L)
    set(valor) = prefs.edit().putLong("convite-em", valor).apply()

  var conviteTitulo: String
    get() = prefs.getString("convite-titulo", "Como foi sua semana com o Consi?") ?: "Como foi sua semana com o Consi?"
    set(valor) = prefs.edit().putString("convite-titulo", valor).apply()

  var conviteTexto: String
    get() = prefs.getString("convite-texto", "Conta como foi. Leva uns 6 minutos.") ?: "Conta como foi. Leva uns 6 minutos."
    set(valor) = prefs.edit().putString("convite-texto", valor).apply()

  /** Lembrete diário de escrita (LembreteDiario.kt): ligado, horário, dias (bit 0 = domingo) e as perguntas (JSON). */
  var diarioLigado: Boolean
    get() = prefs.getBoolean("diario-ligado", false)
    set(valor) = prefs.edit().putBoolean("diario-ligado", valor).apply()

  var diarioHora: Int
    get() = prefs.getInt("diario-hora", 20)
    set(valor) = prefs.edit().putInt("diario-hora", valor).apply()

  var diarioMinuto: Int
    get() = prefs.getInt("diario-minuto", 0)
    set(valor) = prefs.edit().putInt("diario-minuto", valor).apply()

  var diarioDias: Int
    get() = prefs.getInt("diario-dias", 0x7F)
    set(valor) = prefs.edit().putInt("diario-dias", valor).apply()

  var diarioPerguntas: String
    get() = prefs.getString("diario-perguntas", "[]") ?: "[]"
    set(valor) = prefs.edit().putString("diario-perguntas", valor).apply()

  fun proximaPerguntaDiario(total: Int): Int {
    val i = prefs.getInt("diario-pergunta", 0).mod(total)
    prefs.edit().putInt("diario-pergunta", i + 1).apply()
    return i
  }

  /** Lembretes de atividades (LembreteAtividades.kt): a lista em JSON e o horário do alarme agendado. */
  var atividadesLembretes: String
    get() = prefs.getString("atividades-lembretes", "[]") ?: "[]"
    set(valor) = prefs.edit().putString("atividades-lembretes", valor).apply()

  var atividadesAlvo: Long
    get() = prefs.getLong("atividades-alvo", 0L)
    set(valor) = prefs.edit().putLong("atividades-alvo", valor).apply()

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

  /**
   * Bloqueio depois do "Dessa vez não abro" (ou de sair do app na pausa): até quando o app fica
   * fechado. Abrir antes disso mostra a pausa no modo bloqueado, sem a opção de continuar.
   */
  fun bloqueadoAte(pacote: String) = prefs.getLong("bloqueado:$pacote", 0L)

  fun bloquearAte(pacote: String, ate: Long) {
    val e = prefs.edit().putLong("bloqueado:$pacote", ate).putLong("liberado:$pacote", 0L)
    if (liberadoNaSessao == pacote) e.remove("liberado-sessao")
    e.apply()
  }

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
