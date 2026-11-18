import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { useOnboarding } from '@/data/onboarding';
import { gap, useTema } from '@/theme';

/** B2 · Boas-vindas — usa o primeiro nome digitado em B1. */
const SUB = 'Queremos te conhecer melhor';

export default function B2BoasVindas() {
  const { cores } = useTema();
  const { respostas } = useOnboarding();
  const primeiroNome = respostas.nome.split(' ')[0];
  const titulo = `Bem-vindo, ${primeiroNome}.\nQue bom te ter aqui.`;
  const tSub = fimDoTexto(titulo, 150) + 100;
  const transicao = useTransicao();

  return (
    <TelaOnboarding
      transicao={transicao}
      atrasoRodape={fimDoTexto(SUB, tSub) + 100}
      rodape={<BotaoContinuar onPress={() => transicao.sair(() => router.push('/onboarding/objetivo'))} />}
    >
      <View style={styles.bloco}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Médio" cor={cores.text.secondary} atraso={tSub} />
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  // combinado: o texto fica no meio da tela
  bloco: { flex: 1, justifyContent: 'center', gap: gap.default },
});
