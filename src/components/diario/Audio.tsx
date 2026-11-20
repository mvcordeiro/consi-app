import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTema } from '@/theme';

import { Texto } from '../Texto';
import { Play, Remover } from './assets';

const nativo = Platform.OS !== 'web';

/** Alturas das barras da onda, como no Figma (760:6230). */
const ONDA = [6, 12, 18, 10, 16, 8, 14, 20, 10, 6, 12, 8, 14, 6];

/** "0:12" */
export function minutos(seg: number) {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Áudio anexado (Figma 760:6226): pílula bg/raised com o botão de tocar em action/primary,
 * a onda em text/secondary (o trecho já tocado em text/accent), a duração e o "×" opcional.
 */
export function PlayerAudio({ uri, duracao, onRemover }: { uri: string; duracao: number; onRemover?: () => void }) {
  const { cores } = useTema();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const total = status.duration || duracao;
  const progresso = total ? Math.min(1, status.currentTime / total) : 0;

  // terminou: volta ao começo para poder tocar de novo
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const alternar = () => {
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <View style={[styles.pilula, { backgroundColor: cores.bg.raised }]}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar áudio' : 'Tocar áudio'}
        hitSlop={6}
        style={[styles.tocar, { backgroundColor: cores.action.primary.default }]}
      >
        {status.playing ? (
          <View style={styles.pausa}>
            <View style={[styles.barraPausa, { backgroundColor: cores.text['on-primary'] }]} />
            <View style={[styles.barraPausa, { backgroundColor: cores.text['on-primary'] }]} />
          </View>
        ) : (
          <Play width={14} height={14} corTraco={cores.text['on-primary']} />
        )}
      </Pressable>
      <View style={styles.onda}>
        {ONDA.map((h, i) => (
          <View
            key={i}
            style={[
              styles.barra,
              { height: h, backgroundColor: i / ONDA.length < progresso ? cores.text.accent : cores.text.secondary },
            ]}
          />
        ))}
      </View>
      <View style={styles.espaco} />
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {minutos(status.playing || status.currentTime > 0 ? status.currentTime : total)}
      </Texto>
      {onRemover ? (
        <Pressable onPress={onRemover} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remover áudio">
          <Remover width={16} height={16} corTraco={cores.text.tertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Gravação em andamento: a mesma pílula do áudio anexado, com um ponto em feedback/error
 * pulsando, o tempo correndo e o botão de parar (quadrado) no lugar do "tocar".
 */
export function GravandoAudio({ segundos, onParar }: { segundos: number; onParar: () => void }) {
  const { cores } = useTema();
  const [pulso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo }),
        Animated.timing(pulso, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulso]);

  return (
    <View style={[styles.pilula, { backgroundColor: cores.bg.raised }]} accessibilityLiveRegion="polite">
      <Pressable
        onPress={onParar}
        accessibilityRole="button"
        accessibilityLabel="Parar gravação"
        hitSlop={6}
        style={[styles.tocar, { backgroundColor: cores.feedback.error }]}
      >
        <View style={[styles.parar, { backgroundColor: cores.text['on-primary'] }]} />
      </Pressable>
      <Animated.View
        style={[
          styles.ponto,
          { backgroundColor: cores.feedback.error, opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
        ]}
      />
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Gravando
      </Texto>
      <View style={styles.espaco} />
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {minutos(segundos)}
      </Texto>
    </View>
  );
}

/**
 * Gravador do Diário (expo-audio). `iniciar` pede o microfone na primeira vez;
 * `parar` devolve o arquivo e a duração (ou null se nada foi gravado).
 */
export function useGravador() {
  const gravador = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' } as typeof RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(gravador, 250);

  const iniciar = async (): Promise<'ok' | 'sem-permissao' | 'erro'> => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) return 'sem-permissao';
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
      return 'ok';
    } catch {
      return 'erro';
    }
  };

  const parar = async (): Promise<{ uri: string; duracao: number } | null> => {
    const duracao = (estado.durationMillis ?? 0) / 1000;
    try {
      await gravador.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch {
      return null;
    }
    return gravador.uri ? { uri: gravador.uri, duracao: Math.max(1, duracao) } : null;
  };

  return { gravando: estado.isRecording, segundos: (estado.durationMillis ?? 0) / 1000, iniciar, parar };
}

const styles = StyleSheet.create({
  pilula: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    paddingRight: space[12],
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  tocar: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pausa: { flexDirection: 'row', gap: 3 },
  barraPausa: { width: 3, height: 12, borderRadius: 1.5 },
  parar: { width: 11, height: 11, borderRadius: 2 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  onda: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  barra: { width: 3, borderRadius: 1.5 },
  espaco: { flex: 1 },
});
