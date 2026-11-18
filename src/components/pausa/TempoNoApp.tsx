import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TEMPOS_NO_APP } from '@/data/gruposHome';
import { borderWidth, space, useTema } from '@/theme';

import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { Botao } from '../Botao';
import { ChevronDireita } from '../home/assets';
import { Texto } from '../Texto';

const TITULO = 'Quanto tempo você precisa?';
const rotulo = (min: number) => (min === 1 ? '1 minuto' : `${min} minutos`);

/**
 * "Quanto tempo você precisa?" — depois de continuar na pausa (sem frame no Figma; pedido do
 * produto): o título, a lista de minutos com divisores e um "Sair" discreto embaixo.
 * Escolher um tempo segue para o app; "Sair" desiste de abrir.
 */
export function TempoNoApp({ onEscolher, onSair }: { onEscolher: (minutos: number) => void; onSair: () => void }) {
  const { cores } = useTema();
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const fimTitulo = fimDoTexto(TITULO, 150);

  const escolher = (min: number) => {
    if (escolhido !== null) return;
    setEscolhido(min);
    // deixa o realce aparecer antes de seguir
    setTimeout(() => onEscolher(min), 250);
  };

  return (
    <View style={styles.tela}>
      <View style={styles.centro}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <Aparecer atraso={fimTitulo} style={[styles.lista, { borderColor: cores.border.subtle }]}>
          {TEMPOS_NO_APP.map((min, i) => {
            const ativo = escolhido === min;
            return (
              <Pressable
                key={min}
                onPress={() => escolher(min)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={({ pressed }) => [
                  styles.linha,
                  i > 0 && { borderTopWidth: borderWidth.thin, borderTopColor: cores.border.subtle },
                  (pressed || ativo) && { backgroundColor: cores.bg.raised },
                ]}
              >
                <Texto estilo="Texto/Médio" cor={ativo ? cores.text.accent : cores.text.primary}>
                  {rotulo(min)}
                </Texto>
                <ChevronDireita width={12} height={12} corTraco={ativo ? cores.text.accent : cores.icon.secondary} />
              </Pressable>
            );
          })}
        </Aparecer>
      </View>
      <Aparecer atraso={fimTitulo + 200} style={styles.rodape}>
        <Botao rotulo="Sair" estilo="secundario" apagado onPress={onSair} />
      </Aparecer>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center', gap: space[40], paddingHorizontal: space[12] + space[16] },
  lista: { borderTopWidth: borderWidth.thin, borderBottomWidth: borderWidth.thin },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[8],
  },
  // mesmas margens dos botões da pausa (Figma: 12 + 16 px nas laterais, 40 px embaixo)
  rodape: { paddingHorizontal: space[12] + space[16], paddingBottom: space[40] },
});
