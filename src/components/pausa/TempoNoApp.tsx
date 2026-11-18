import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TEMPOS_NO_APP } from '@/data/gruposHome';
import { borderWidth, space, useTema } from '@/theme';

import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { ChevronDireita } from '../home/assets';
import { Texto } from '../Texto';

const rotulo = (min: number) => (min === 1 ? '1 minuto' : `${min} minutos`);

/**
 * "Quanto tempo você precisa nesse app?" — depois de continuar na pausa, só nos grupos em
 * "Apenas pausar" (sem frame no Figma; lista vertical com divisores, pedido do produto).
 */
export function TempoNoApp({ app, onEscolher }: { app?: string; onEscolher: (minutos: number) => void }) {
  const { cores } = useTema();
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const titulo = `Quanto tempo você precisa ${app ? `no ${app}` : 'nesse app'}?`;
  const fimTitulo = fimDoTexto(titulo, 150);

  const escolher = (min: number) => {
    if (escolhido !== null) return;
    setEscolhido(min);
    // deixa o realce aparecer antes de fechar
    setTimeout(() => onEscolher(min), 250);
  };

  return (
    <View style={styles.tela}>
      <View style={styles.textos}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado
          texto="Escolha antes de abrir."
          estilo="Texto/Médio"
          cor={cores.text.secondary}
          atraso={fimTitulo}
        />
      </View>
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
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', gap: space[40], paddingHorizontal: space[12] + space[16] },
  textos: { alignItems: 'center', gap: space[12] },
  lista: { borderTopWidth: borderWidth.thin, borderBottomWidth: borderWidth.thin },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[8],
  },
});
