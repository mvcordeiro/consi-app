import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoContinuar, IconeGrande, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { IconePessoa } from '@/components/onboarding/assets';
import { useOnboarding } from '@/data/onboarding';
import { space } from '@/theme';

/** B2 · Boas-vindas — usa o primeiro nome digitado em B1. */
const SUB = 'Queremos te conhecer melhor';

export default function B2BoasVindas() {
  const { respostas } = useOnboarding();
  const primeiroNome = respostas.nome.split(' ')[0];
  const titulo = `Bem-vindo, ${primeiroNome}.\nQue bom te ter aqui.`;
  const tSub = fimDoTexto(titulo, 150) + 100;
  const transicao = useTransicao();

  return (
    <TelaOnboarding
      transicao={transicao}
      etapa={1}
      atrasoRodape={fimDoTexto(SUB, tSub) + 100}
      rodape={<BotaoContinuar onPress={() => transicao.sair(() => router.push('/onboarding/objetivo'))} />}
    >
      <Aparecer escalaInicial={0.9}>
        <IconeGrande Icone={IconePessoa} />
      </Aparecer>
      <View style={styles.bloco}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={150} />
        <TextoAnimado texto={SUB} estilo="Texto/Médio" atraso={tSub} style={styles.sub} />
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  bloco: { marginTop: space[64], gap: space[40] },
  sub: { width: 309 },
});
