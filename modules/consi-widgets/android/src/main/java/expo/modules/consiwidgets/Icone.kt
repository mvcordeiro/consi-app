package expo.modules.consiwidgets

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager

/**
 * Troca o ícone do app no launcher (ver docs/icone-emocao.md).
 * Os apelidos "IconePadrao" e "Icone_<id>" são criados em plugins/withIconeEmocao.js.
 */
internal object Icone {
  private const val PADRAO = "IconePadrao"

  /** Liga o ícone da emoção [id] (ou o padrão, se [id] for null ou desconhecido) e desliga os outros. */
  fun definir(context: Context, id: String?) {
    val escolhido = if (emocaoPorId(id) != null) "Icone_$id" else PADRAO
    val pm = context.packageManager
    val nomes = listOf(PADRAO) + EMOCOES.map { "Icone_${it.id}" }
    // Liga o novo antes de desligar os outros: nunca fica sem ícone no launcher.
    mudar(pm, context, escolhido, PackageManager.COMPONENT_ENABLED_STATE_ENABLED)
    for (nome in nomes) {
      if (nome != escolhido) mudar(pm, context, nome, PackageManager.COMPONENT_ENABLED_STATE_DISABLED)
    }
  }

  private fun mudar(pm: PackageManager, context: Context, nome: String, estado: Int) {
    val componente = ComponentName(context.packageName, "${context.packageName}.$nome")
    if (pm.getComponentEnabledSetting(componente) == estado) return
    // DONT_KILL_APP: o app continua aberto enquanto o launcher troca o ícone.
    pm.setComponentEnabledSetting(componente, estado, PackageManager.DONT_KILL_APP)
  }
}
