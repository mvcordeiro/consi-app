package expo.modules.consipausa

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.core.app.NotificationManagerCompat
import androidx.core.graphics.drawable.toBitmap
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

/**
 * Ponte do JS (modules/consi-pausa/src) com o Android: permissões de Acesso de uso e de
 * sobrepor, a lista de apps do aparelho, o tempo de uso e o vigia que abre a pausa.
 */
class ConsiPausaModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val prefs get() = Preferencias(context)

  override fun definition() = ModuleDefinition {
    Name("ConsiPausa")

    // ─── Permissões ─────────────────────────────────────────────────────────
    Function("temAcessoUso") { Uso.temAcesso(context) }

    Function("podeSobrepor") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
    }

    Function("podeNotificar") { NotificationManagerCompat.from(context).areNotificationsEnabled() }

    Function("abrirAjustesAcessoUso") { abrirAjuste(Settings.ACTION_USAGE_ACCESS_SETTINGS) }

    Function("abrirAjustesSobrepor") { abrirAjuste(Settings.ACTION_MANAGE_OVERLAY_PERMISSION) }

    /**
     * Android 13+ com APK instalado fora da loja: as "configurações restritas" ficam bloqueadas
     * até a pessoa liberar em Informações do app → ⋮ → "Permitir configurações restritas".
     * true = ainda bloqueadas (ou não dá para saber com certeza e é um APK de fora da loja).
     */
    Function("configuracoesRestritas") { restritas() }

    /** Informações do app (onde fica o ⋮ → "Permitir configurações restritas"). */
    Function("abrirInfoDoApp") {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      val atividade = appContext.currentActivity
      if (atividade != null) atividade.startActivity(intent) else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Notificações recusadas de vez (o Android não mostra mais o aviso): a página do Consi. */
    Function("abrirAjustesNotificacoes") {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      }
      val atividade = appContext.currentActivity
      if (atividade != null) atividade.startActivity(intent) else context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Milissegundos na frente por app nos últimos `dias` (estatística agregada do Android). */
    AsyncFunction("usoRecente") { dias: Int ->
      if (!Uso.temAcesso(context)) emptyMap<String, Double>() else Uso.recente(context, dias.coerceIn(1, 30))
    }

    // ─── Apps e uso ─────────────────────────────────────────────────────────
    AsyncFunction("listarApps") { lado: Int -> listarApps(lado.coerceIn(24, 192)) }

    AsyncFunction("usoPorApp") { inicio: Double, fim: Double ->
      if (!Uso.temAcesso(context)) emptyMap<String, Double>() else Uso.porApp(context, inicio.toLong(), fim.toLong())
    }

    Function("abrirApp") { pacote: String ->
      val intent = context.packageManager.getLaunchIntentForPackage(pacote) ?: return@Function false
      try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
      } catch (_: Exception) {
        false
      }
    }

    // ─── Vigia ──────────────────────────────────────────────────────────────
    Function("definirRegras") { json: String -> prefs.regrasJson = json }

    Function("vigiaAtiva") { prefs.ativa }

    Function("ativarVigia") { ativa: Boolean ->
      prefs.ativa = ativa
      if (ativa) VigiaService.iniciar(context) else VigiaService.parar(context)
    }

    /** Depois da pausa: libera o app por `minutos` (0 = até a pessoa sair dele). */
    Function("liberar") { pacote: String, minutos: Double ->
      if (minutos > 0) {
        prefs.liberarAte(pacote, System.currentTimeMillis() + (minutos * 60_000).toLong())
      } else {
        prefs.liberadoNaSessao = pacote
      }
      Notificacoes.cancelarPausa(context)
    }
  }

  private fun restritas(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
    return try {
      val ops = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
      // Operação escondida do Android 13+; MODE_ALLOWED depois que a pessoa libera.
      ops.unsafeCheckOpNoThrow("android:access_restricted_settings", android.os.Process.myUid(), context.packageName) !=
        android.app.AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) {
      false
    }
  }

  private fun abrirAjuste(acao: String) {
    val pacote = Uri.parse("package:${context.packageName}")
    val atividade = appContext.currentActivity
    val alvo: Context = atividade ?: context
    fun abrir(intent: Intent) {
      if (atividade == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      alvo.startActivity(intent)
    }
    try {
      // Alguns Androids abrem direto na página do Consi; outros só aceitam a lista geral.
      abrir(Intent(acao, pacote))
    } catch (_: ActivityNotFoundException) {
      try {
        abrir(Intent(acao))
      } catch (_: Exception) {
        abrir(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pacote))
      }
    } catch (_: SecurityException) {
      abrir(Intent(acao))
    }
  }

  private fun listarApps(lado: Int): List<Map<String, Any>> {
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val lista = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, 0)
    }
    val inicio = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val telasIniciais = (
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.queryIntentActivities(inicio, PackageManager.ResolveInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.queryIntentActivities(inicio, 0)
      }
      ).map { it.activityInfo.packageName }.toSet()
    return lista
      .map { it.activityInfo.applicationInfo }
      .distinctBy { it.packageName }
      .filter { it.packageName != context.packageName }
      .map { info ->
        mapOf(
          "id" to info.packageName,
          "nome" to pm.getApplicationLabel(info).toString(),
          "categoria" to categoria(info),
          "inicio" to (info.packageName in telasIniciais),
          "sistema" to ((info.flags and ApplicationInfo.FLAG_SYSTEM) != 0 &&
            (info.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0),
          "icone" to icone(pm, info, lado),
        )
      }
      .sortedBy { (it["nome"] as String).lowercase() }
  }

  private fun categoria(info: ApplicationInfo): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) info.category else -1

  private fun icone(pm: PackageManager, info: ApplicationInfo, lado: Int): String = try {
    val bitmap = pm.getApplicationIcon(info).toBitmap(lado, lado, Bitmap.Config.ARGB_8888)
    val saida = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, saida)
    "data:image/png;base64," + Base64.encodeToString(saida.toByteArray(), Base64.NO_WRAP)
  } catch (_: Exception) {
    ""
  }
}
