package expo.modules.consipausa

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Liga o vigia de novo depois de reiniciar o celular ou atualizar o app. */
class InicioReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val prefs = Preferencias(context)
    if ((prefs.ativa && Uso.temAcesso(context)) || prefs.lembretesTela) VigiaService.iniciar(context)
  }
}
