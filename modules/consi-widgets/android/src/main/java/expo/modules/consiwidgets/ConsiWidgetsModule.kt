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

    /**
     * Os dados de um assunto ("dia", "atividades", "sugestao" ou "frases") em JSON.
     * Redesenha todos os widgets.
     */
    Function("atualizar") { chave: String, json: String -> Widgets.guardar(context, chave, json) }

    /** O ícone do app no launcher: o id de uma emoção, ou null para o ícone normal. */
    Function("definirIcone") { id: String? -> Icone.definir(context, id) }

    /** O ícone do app no launcher: o id de uma emoção, ou null para o ícone normal. */
    Function("definirIcone") { id: String? -> Icone.definir(context, id) }
  }
}
