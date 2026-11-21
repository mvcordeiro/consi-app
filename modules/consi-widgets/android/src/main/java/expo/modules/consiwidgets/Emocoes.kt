// Gerado por scripts/gerar-widgets-android.js a partir de src/data/emocoes.ts. Não edite à mão.
package expo.modules.consiwidgets

/** Uma emoção da Home: o id (o mesmo do JS), o nome e o balão. */
internal data class Emocao(val id: String, val nome: String, val balao: Int)

/** As 14 emoções, na ordem da Home. */
internal val EMOCOES = listOf(
  Emocao("satisfeito", "Satisfeito", R.drawable.consi_emocao_satisfeito),
  Emocao("alegria", "Alegria", R.drawable.consi_emocao_alegria),
  Emocao("tristeza", "Tristeza", R.drawable.consi_emocao_tristeza),
  Emocao("vergonha", "Vergonha", R.drawable.consi_emocao_vergonha),
  Emocao("orgulho", "Orgulho", R.drawable.consi_emocao_orgulho),
  Emocao("admiracao", "Admiração", R.drawable.consi_emocao_admiracao),
  Emocao("medo", "Medo", R.drawable.consi_emocao_medo),
  Emocao("repulsa", "Repulsa", R.drawable.consi_emocao_repulsa),
  Emocao("tedio", "Tédio", R.drawable.consi_emocao_tedio),
  Emocao("fascinacao", "Fascinação", R.drawable.consi_emocao_fascinacao),
  Emocao("raiva", "Raiva", R.drawable.consi_emocao_raiva),
  Emocao("desprezo", "Desprezo", R.drawable.consi_emocao_desprezo),
  Emocao("esperanca", "Esperança", R.drawable.consi_emocao_esperanca),
  Emocao("desejo", "Desejo", R.drawable.consi_emocao_desejo),
)

internal fun emocaoPorId(id: String?) = EMOCOES.firstOrNull { it.id == id }
