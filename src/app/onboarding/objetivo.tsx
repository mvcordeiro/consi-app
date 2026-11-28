import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { OpcaoSegurar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconeBrincalhao32, IconeGesto32, IconeTempo, type IconeSvg } from '@/components/onboarding/assets';
import { useOnboarding, type Objetivo } from '@/data/onboarding';
import { gap, spaceFixo as space, useTema } from '@/theme';

/**
 * C1 · Pergunta / C2 · Segurando — "O que mais importa para você?"
 * A escolha é feita segurando a opção (1,2 s).
 * Combinado: as três opções seguem para a mesma respiração por enquanto.
 */
const TEMPO_SEGURAR_MS = 1200;
const TITULO = 'O que mais importa para você?';
const T_OPCOES = fimDoTexto(TITULO, 150);

const opcoes: { id: Objetivo; texto: string; Icone: IconeSvg }[] = [
  { id: 'menos-tempo', texto: 'Passar menos tempo dentro dos aplicativos', Icone: IconeTempo },
  { id: 'automatico', texto: 'Parar de pegar o celular no automático', Icone: IconeGesto32 },
  { id: 'hobbies', texto: 'Voltar a fazer hobbies que me interessam', Icone: IconeBrincalhao32 },
];

export default function C1Objetivo() {
  const { cores } = useTema();
  const { atualizar } = useOnboarding();
  const [segurando, setSegurando] = useState<Objetivo | null>(null);
  const transicao = useTransicao();

  const escolher = (id: Objetivo) => {
    atualizar({ objetivo: id });
    transicao.sair(() => {
      router.push('/onboarding/respiracao');
      setSegurando(null);
    });
  };

  return (
    <TelaOnboarding transicao={transicao}>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
      </View>

      <View style={styles.escolha}>
        <Aparecer atraso={T_OPCOES}>
          <Texto
            estilo="Texto/Pequeno"
            cor={segurando ? cores.text.primary : cores.text.tertiary}
            style={styles.centro}
          >
            {segurando ? 'Continue segurando…' : 'Segure o botão por um instante.'}
          </Texto>
        </Aparecer>

        <View style={styles.opcoes}>
          {opcoes.map((o, i) => (
            <Aparecer key={o.id} atraso={T_OPCOES + 100 + i * 120} deslocamento={16}>
              <OpcaoSegurar
                Icone={o.Icone}
                texto={o.texto}
                duracaoMs={TEMPO_SEGURAR_MS}
                esmaecida={segurando !== null && segurando !== o.id}
                onInicio={() => setSegurando(o.id)}
                onCancelar={() => setSegurando(null)}
                onCompleto={() => escolher(o.id)}
              />
            </Aparecer>
          ))}
        </View>
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  // combinado: o título desce um pouco em relação ao topo
  cabecalho: { gap: gap.default, marginTop: gap.section },
  // as opções ficam na metade de baixo, perto do polegar
  escolha: { flex: 1, justifyContent: 'center', gap: gap.loose, paddingBottom: space[24] },
  centro: { textAlign: 'center' },
  opcoes: { gap: space[12] },
});
