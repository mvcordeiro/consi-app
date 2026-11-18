import { router } from 'expo-router';
import { useState, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Texto } from '@/components';
import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { IconeGrande, OpcaoSegurar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconeAjuda, IconeBrincalhao32, IconeGesto32, IconeTempo } from '@/components/onboarding/assets';
import { useOnboarding, type Objetivo } from '@/data/onboarding';
import { space, useTema } from '@/theme';

/**
 * C1 · Pergunta / C2 · Segurando — "O que mais importa para você?"
 * A escolha é feita segurando a opção (C2 mostra 0,7 s ≈ 60% → 1,2 s no total).
 * Combinado: por enquanto as três opções seguem para a mesma tela de respiração;
 * depois cada uma terá sua própria sequência.
 */
const TEMPO_SEGURAR_MS = 1200;
const TITULO = 'O que mais importa para você?';
const SUB = 'Segure a opção que mais combina com você.';
const T_SUB = fimDoTexto(TITULO, 150);
const T_OPCOES = fimDoTexto(SUB, T_SUB);

const opcoes: { id: Objetivo; texto: string; Icone: FC<SvgProps> }[] = [
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
    <TelaOnboarding etapa={2} transicao={transicao}>
      <Aparecer escalaInicial={0.9}>
        <IconeGrande Icone={IconeAjuda} />
      </Aparecer>
      <View style={styles.cabecalho}>
        <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.secondary} atraso={T_SUB} />
      </View>

      <Aparecer atraso={T_OPCOES} style={styles.dica}>
        <Texto
          estilo="Texto/Pequeno"
          cor={segurando ? cores.text.primary : cores.text.secondary}
          style={styles.centro}
        >
          {segurando ? 'Continue segurando…' : 'Segure o botão por um instante.'}
        </Texto>
      </Aparecer>

      <View style={styles.opcoes}>
        {opcoes.map((o, i) => (
          <Aparecer key={o.id} atraso={T_OPCOES + 100 + i * 90} deslocamento={16}>
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
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  cabecalho: { marginTop: space[64], gap: space[16] },
  dica: { marginTop: 61 },
  centro: { textAlign: 'center' },
  opcoes: { marginTop: space[32], gap: space[12] },
});
