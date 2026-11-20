package expo.modules.consipausa

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Liga o vigia de novo depois de reiniciar o celular ou atualizar o app. */
class InicioReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (Preferencias(context).ativa && Uso.temAcesso(context)) VigiaService.iniciar(context)
  }
}
