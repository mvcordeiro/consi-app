import { Pressable, StyleSheet, View } from 'react-native';

import { PIN_MAX } from '@/data/travaDiario';
import { radius, space, useTema } from '@/theme';

import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'extra', '0', 'apagar'] as const;

/** Bolinhas do PIN digitado (até 6). */
export function PontosPin({ quantos, erro }: { quantos: number; erro?: boolean }) {
  const { cores } = useTema();
  return (
    <View style={styles.pontos} accessible accessibilityLabel={`${quantos} de ${PIN_MAX} dígitos`}>
      {Array.from({ length: PIN_MAX }, (_, i) => (
        <View
          key={i}
          style={[
            styles.ponto,
            { borderColor: erro ? cores.feedback.error : cores.border.focus },
            i < quantos && { backgroundColor: erro ? cores.feedback.error : cores.text.primary },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Teclado numérico do PIN do Diário. `extra` ocupa a tecla de baixo à esquerda (ex.: biometria).
 */
export function TecladoPin({
  pin,
  onMudar,
  extra,
  desabilitado,
}: {
  pin: string;
  onMudar: (pin: string) => void;
  extra?: { icone: NomeIcone; rotulo: string; onPress: () => void };
  desabilitado?: boolean;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.teclado}>
      {TECLAS.map((t) => {
        if (t === 'extra' && !extra) return <View key={t} style={styles.tecla} />;
        const rotulo = t === 'extra' ? extra!.rotulo : t === 'apagar' ? 'Apagar' : t;
        const toque = () => {
          if (desabilitado) return;
          if (t === 'extra') extra!.onPress();
          else if (t === 'apagar') onMudar(pin.slice(0, -1));
          else if (pin.length < PIN_MAX) onMudar(pin + t);
        };
        return (
          <Pressable
            key={t}
            onPress={toque}
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            style={({ pressed }) => [styles.tecla, { backgroundColor: pressed ? cores.bg.raised : 'transparent', opacity: desabilitado ? 0.4 : 1 }]}
          >
            {t === 'extra' ? (
              <Icone nome={extra!.icone} />
            ) : t === 'apagar' ? (
              <Icone nome="excluir" />
            ) : (
              <Texto estilo="Títulos/Grande">{t}</Texto>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pontos: { flexDirection: 'row', gap: space[16], justifyContent: 'center' },
  ponto: { width: 14, height: 14, borderRadius: radius.full, borderWidth: 1.5 },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 88, alignSelf: 'center' },
  tecla: { width: 88, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
});
