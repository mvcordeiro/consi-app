// Gerado por scripts/gerar-widgets-android.js a partir de src/data/emocoes.ts. Não edite à mão.
package expo.modules.consiwidgets

/** Uma emoção da Home: o id (o mesmo do JS), o nome e o balão. */
/** x e y: a posição na Home (frame de 436 px), para espalhar as emoções como lá. */
internal data class Emocao(val id: String, val nome: String, val balao: Int, val x: Int, val y: Int)

/** As 14 emoções, na ordem da Home. */
internal val EMOCOES = listOf(
  Emocao("satisfeito", "Satisfeito", R.drawable.consi_emocao_satisfeito, 204, 89),
  Emocao("alegria", "Alegria", R.drawable.consi_emocao_alegria, 308, 146),
  Emocao("tristeza", "Tristeza", R.drawable.consi_emocao_tristeza, 116, 159),
  Emocao("vergonha", "Vergonha", R.drawable.consi_emocao_vergonha, 19, 204),
  Emocao("orgulho", "Orgulho", R.drawable.consi_emocao_orgulho, 212, 208),
  Emocao("admiracao", "Admiração", R.drawable.consi_emocao_admiracao, 320, 266),
  Emocao("medo", "Medo", R.drawable.consi_emocao_medo, 126, 279),
  Emocao("repulsa", "Repulsa", R.drawable.consi_emocao_repulsa, 18, 316),
  Emocao("tedio", "Tédio", R.drawable.consi_emocao_tedio, 218, 368),
  Emocao("fascinacao", "Fascinação", R.drawable.consi_emocao_fascinacao, 330, 375),
  Emocao("raiva", "Raiva", R.drawable.consi_emocao_raiva, 95, 399),
  Emocao("desprezo", "Desprezo", R.drawable.consi_emocao_desprezo, 36, 482),
  Emocao("esperanca", "Esperança", R.drawable.consi_emocao_esperanca, 324, 483),
  Emocao("desejo", "Desejo", R.drawable.consi_emocao_desejo, 197, 501),
)

internal fun emocaoPorId(id: String?) = EMOCOES.firstOrNull { it.id == id }
