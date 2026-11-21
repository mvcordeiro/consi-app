package expo.modules.consiwidgets

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Ponte do JS (modules/consi-widgets/index.ts) com os widgets da tela inicial (Widgets.kt). */
class ConsiWidgetsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("ConsiWidgets")

    /** O resumo de hoje: { dia, emocoes, total }. Redesenha todos os widgets. */
    Function("atualizar") { json: String -> Widgets.guardar(context, json) }
  }
}
