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

/** Notificações do vigia: a fixa (serviço em primeiro plano, com a contagem), os lembretes e a pausa sem sobreposição. */
internal object Notificacoes {
  /** Canal da fixa. "-2": a primeira versão usava importância mínima, que esconde a notificação. */
  const val CANAL_VIGIA = "consi-vigia-2"
  private const val CANAL_VIGIA_ANTIGO = "consi-vigia"
  const val CANAL_LEMBRETES = "consi-lembretes"
  const val ID_FIXA = 4201
  const val ID_LEMBRETE = 4202
  const val ID_PAUSA = 4203
  const val ID_CUIDADO_TELA = 4204
  const val CANAL_CUIDADO_TELA = "consi-cuidado-tela"
  /** A pessoa arrastou a fixa para o lado (Android 14+ deixa): o serviço publica de novo. */
  const val ACAO_REPOR = "expo.modules.consipausa.REPOR_NOTIFICACAO"

  /** O que a notificação fixa mostra quando há um app com timer na frente. */
  data class Contagem(val nome: String, val ate: Long, val paraCima: Boolean, val modo: String)

  fun criarCanais(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java)
    nm.deleteNotificationChannel(CANAL_VIGIA_ANTIGO)
    nm.createNotificationChannel(
      NotificationChannel(CANAL_VIGIA, "Pausa nos apps", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Fica sempre no topo enquanto o Consi cuida das pausas e mostra o tempo no app."
        setShowBadge(false)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CANAL_LEMBRETES, "Lembretes de tempo", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Avisos do Cuidar tempo e a pausa quando ela não pode abrir sozinha."
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CANAL_CUIDADO_TELA, "Cuidado com o tempo de tela", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Uma sugestão de pausa depois de muito tempo seguido no celular."
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

  /**
   * A notificação fixa. Sem contagem: "Cuidando das pausas". Com contagem (app com timer na
   * frente e sem o flutuante): o nome do app e um cronômetro do próprio Android.
   */
  fun fixa(context: Context, contagem: Contagem? = null): Notification {
    val b = NotificationCompat.Builder(context, CANAL_VIGIA)
      .setSmallIcon(R.drawable.consi_notificacao)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setContentIntent(
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
          PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE)
        },
      )
      .setDeleteIntent(
        PendingIntent.getService(
          context,
          1,
          Intent(context, VigiaService::class.java).setAction(ACAO_REPOR),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
    if (contagem == null) {
      val texto = if (Preferencias(context).ativa) "Cuidando das pausas antes dos seus apps." else "Lembrando você de fazer pausas no celular."
      b.setContentTitle("Consi").setContentText(texto).setShowWhen(false)
    } else {
      val texto = when {
        contagem.paraCima -> "Tempo no app"
        contagem.modo == "cuidar-tempo" -> "Até o próximo lembrete"
        else -> "Tempo que você escolheu"
      }
      b.setContentTitle(contagem.nome)
        .setContentText(texto)
        .setWhen(contagem.ate)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(!contagem.paraCima)
    }
    return b.build().apply { flags = flags or Notification.FLAG_NO_CLEAR or Notification.FLAG_ONGOING_EVENT }
  }

  fun atualizarFixa(context: Context, contagem: Contagem?) = publicar(context, ID_FIXA, fixa(context, contagem))

  /**
   * Lembrete do "Cuidar tempo". `calado`: o timer flutuante já avisou (pulsou e vibrou), então
   * a notificação entra na gaveta sem som, sem vibrar e sem aparecer por cima.
   */
  fun lembrete(context: Context, regra: Regra, pacote: String, minutos: Int, calado: Boolean = false) =
    publicar(
      context,
      ID_LEMBRETE,
      NotificationCompat.Builder(context, CANAL_LEMBRETES)
        .setSmallIcon(R.drawable.consi_notificacao)
        .setContentTitle("Você está há $minutos min no ${regra.nome}")
        .setContentText("Que tal uma pausa para ver como você está?")
        .setAutoCancel(true)
        .setSilent(calado)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setContentIntent(abrirPausa(context, pacote, regra.grupo, 2))
        .build(),
    )

  /**
   * Lembrete de cuidado com o tempo de tela (uso seguido do celular). Tocar só fecha: o
   * lembrete não puxa a pessoa para mais uma tela. Some sozinho depois de 10 minutos.
   */
  fun cuidadoComTela(context: Context, minutos: Int, sugestao: String) =
    publicar(
      context,
      ID_CUIDADO_TELA,
      NotificationCompat.Builder(context, CANAL_CUIDADO_TELA)
        .setSmallIcon(R.drawable.consi_notificacao)
        .setContentTitle("$minutos min de celular sem parar")
        .setContentText(sugestao)
        .setStyle(NotificationCompat.BigTextStyle().bigText(sugestao))
        .setAutoCancel(true)
        .setTimeoutAfter(10 * 60_000L)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setContentIntent(
          PendingIntent.getBroadcast(
            context,
            5,
            Intent("expo.modules.consipausa.FECHAR_CUIDADO").setPackage(context.packageName),
            PendingIntent.FLAG_IMMUTABLE,
          ),
        )
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
