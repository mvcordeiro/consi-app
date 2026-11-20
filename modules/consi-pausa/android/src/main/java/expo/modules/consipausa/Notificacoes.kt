package expo.modules.consipausa

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Notificações do vigia: a fixa (serviço em primeiro plano), os lembretes e a pausa sem sobreposição. */
internal object Notificacoes {
  const val CANAL_VIGIA = "consi-vigia"
  const val CANAL_LEMBRETES = "consi-lembretes"
  const val ID_FIXA = 4201
  const val ID_LEMBRETE = 4202
  const val ID_PAUSA = 4203

  fun criarCanais(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java)
    nm.createNotificationChannel(
      NotificationChannel(CANAL_VIGIA, "Pausa nos apps", NotificationManager.IMPORTANCE_MIN).apply {
        description = "Fica ligada enquanto o Consi cuida das pausas antes dos seus apps."
        setShowBadge(false)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CANAL_LEMBRETES, "Lembretes de tempo", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Avisos do Cuidar tempo e a pausa quando ela não pode abrir sozinha."
      },
    )
  }

  /** Abre a pausa do app (consi://pausa?app=…&grupo=…&origem=vigia). */
  fun intentDaPausa(context: Context, pacote: String, grupo: String): Intent =
    Intent(
      Intent.ACTION_VIEW,
      Uri.parse("consi://pausa?app=${Uri.encode(pacote)}&grupo=${Uri.encode(grupo)}&origem=vigia"),
    )
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

  private fun abrirPausa(context: Context, pacote: String, grupo: String, codigo: Int) =
    PendingIntent.getActivity(
      context,
      codigo,
      intentDaPausa(context, pacote, grupo),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  fun fixa(context: Context): Notification =
    NotificationCompat.Builder(context, CANAL_VIGIA)
      .setSmallIcon(R.drawable.consi_notificacao)
      .setContentTitle("Consi")
      .setContentText("Cuidando das pausas antes dos seus apps.")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
          PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE)
        },
      )
      .build()

  fun lembrete(context: Context, regra: Regra, pacote: String, minutos: Int) =
    publicar(
      context,
      ID_LEMBRETE,
      NotificationCompat.Builder(context, CANAL_LEMBRETES)
        .setSmallIcon(R.drawable.consi_notificacao)
        .setContentTitle("Você está há $minutos min no ${regra.nome}")
        .setContentText("Que tal uma pausa para ver como você está?")
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setContentIntent(abrirPausa(context, pacote, regra.grupo, 2))
        .build(),
    )

  /** Sem a permissão de sobrepor, a pausa não abre sozinha: fica uma notificação para tocar. */
  fun pausaPendente(context: Context, regra: Regra, pacote: String) =
    publicar(
      context,
      ID_PAUSA,
      NotificationCompat.Builder(context, CANAL_LEMBRETES)
        .setSmallIcon(R.drawable.consi_notificacao)
        .setContentTitle("Uma pausa antes do ${regra.nome}")
        .setContentText("Toque para fazer sua pausa.")
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setContentIntent(abrirPausa(context, pacote, regra.grupo, 3))
        .build(),
    )

  fun cancelarPausa(context: Context) = NotificationManagerCompat.from(context).cancel(ID_PAUSA)

  private fun publicar(context: Context, id: Int, n: Notification) {
    try {
      NotificationManagerCompat.from(context).notify(id, n)
    } catch (_: SecurityException) {
      // sem permissão de notificação (Android 13+): o aviso não aparece
    }
  }
}
