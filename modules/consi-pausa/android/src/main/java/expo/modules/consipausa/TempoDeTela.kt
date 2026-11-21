package expo.modules.consipausa

import android.app.KeyguardManager
import android.content.Context
import android.media.AudioManager

/**
 * Lembretes de cuidado com o tempo de tela: o uso do CELULAR como um todo (não de um app).
 *
 * Uma sessão de uso é o tempo seguido com a tela acesa e desbloqueada. Ela acaba quando a tela
 * fica apagada (ou bloqueada) por pelo menos [PAUSA_QUE_ZERA_MS]; apagões mais curtos (tirar o
 * celular do bolso, uma olhada rápida) só param o relógio, sem zerar. A cada `intervalo`
 * minutos de sessão, uma notificação com uma sugestão simples (postura, olhar para longe,
 * relaxar os olhos, alongar).
 *
 * Não pede permissão nova: o estado da tela vem do PowerManager e do KeyguardManager, que
 * qualquer app pode ler, e o passo roda dentro do vigia (VigiaService), que já acorda a cada
 * 0,7 s com a tela acesa e a cada 3 s com ela apagada. Nada é gravado sobre o que a pessoa fez:
 * só o início da sessão, em memória.
 */
internal class TempoDeTela(private val context: Context, private val prefs: Preferencias) {
  private var inicio = 0L
  private var proximo = 0L
  private var paradoDesde = 0L

  fun passo(agora: Long, telaAcesa: Boolean) {
    if (!prefs.lembretesTela) {
      zerar()
      return
    }
    val intervalo = prefs.lembretesTelaMin.coerceIn(5, 120) * 60_000L
    val bloqueada = (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
    val usando = telaAcesa && !bloqueada
    if (!usando) {
      if (inicio > 0 && paradoDesde == 0L) paradoDesde = agora
      if (paradoDesde > 0 && agora - paradoDesde >= PAUSA_QUE_ZERA_MS) zerar()
      return
    }
    if (inicio == 0L) {
      inicio = agora
      proximo = agora + intervalo
    } else if (paradoDesde > 0) {
      // Parou pouco: o tempo parado não conta como uso.
      proximo += agora - paradoDesde
    }
    paradoDesde = 0L
    // O intervalo mudou nos Ajustes no meio da sessão: vale o novo.
    if (proximo - agora > intervalo) proximo = agora + intervalo
    if (agora < proximo) return
    if (emLigacao()) {
      // Numa ligação não interrompe: tenta de novo daqui a 1 minuto.
      proximo = agora + 60_000L
      return
    }
    val minutos = ((agora - inicio) / 60_000L).toInt().coerceAtLeast(1)
    Notificacoes.cuidadoComTela(context, minutos, prefs.proximaSugestao(SUGESTOES.size).let { SUGESTOES[it] })
    proximo = agora + intervalo
  }

  private fun zerar() {
    inicio = 0L
    proximo = 0L
    paradoDesde = 0L
  }

  private fun emLigacao(): Boolean = try {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    am.mode == AudioManager.MODE_IN_CALL || am.mode == AudioManager.MODE_IN_COMMUNICATION
  } catch (_: Exception) {
    false
  }

  companion object {
    /** Tela apagada ou bloqueada por 1 minuto conta como uma pausa: a sessão recomeça. */
    const val PAUSA_QUE_ZERA_MS = 60_000L

    val SUGESTOES = listOf(
      "Ajuste a postura: ombros soltos e o celular mais perto da altura dos olhos.",
      "Olhe para algo bem longe por 20 segundos. Seus olhos agradecem.",
      "Feche os olhos por alguns segundos e pisque devagar algumas vezes.",
      "Que tal levantar e alongar o pescoço, os ombros e as mãos por um minuto?",
      "Respire fundo três vezes, devagar, antes de continuar.",
    )
  }
}
