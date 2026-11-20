import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Aparecer, fimDoTexto, TextoAnimado } from '@/components/animacao';
import { BotaoSegurar, TelaOnboarding, useTransicao } from '@/components/onboarding';
import { useOnboarding } from '@/data/onboarding';
import { gap, space, useTema } from '@/theme';

/**
 * F2 · Compromisso — segurar conclui o onboarding e abre a Home.
 * Combinado: 3 segundos (o Figma dizia 5); os textos acompanham.
 */
const SEGURAR_MS = 3000;
const TITULO = 'Assuma um compromisso com você.';
const SUB = 'Aperta aqui por 3 segundos para confirmar que quer viver com mais intenção a partir de hoje.';
const T_SUB = fimDoTexto(TITULO, 250);
const T_BOTAO = fimDoTexto(SUB, T_SUB);

export default function F2Compromisso() {
  const { cores } = useTema();
  const transicao = useTransicao();
  const { concluir } = useOnboarding();

  const finalizar = async () => {
    await concluir();
    transicao.sair(() => router.replace('/'));
  };

  return (
    <TelaOnboarding transicao={transicao}>
      <View style={styles.conteudo}>
        <View style={styles.textos}>
          <TextoAnimado texto={TITULO} estilo="Títulos/Grande" atraso={250} />
          <TextoAnimado texto={SUB} estilo="Texto/Pequeno" cor={cores.text.link} atraso={T_SUB} />
        </View>

        <View style={styles.base}>
          <Aparecer atraso={T_BOTAO} escalaInicial={0.7} deslocamento={0}>
            <BotaoSegurar duracaoMs={SEGURAR_MS} onCompleto={finalizar} />
          </Aparecer>
          <TextoAnimado
            texto="Aperte e segure por 3 segundos."
            estilo="Texto/Pequeno"
            cor={cores.text.link}
            atraso={T_BOTAO + 200}
          />
        </View>
      </View>
    </TelaOnboarding>
  );
}

const styles = StyleSheet.create({
  // combinado: texto e botão agrupados no meio da tela, a 64 px um do outro
  conteudo: { flex: 1, justifyContent: 'center', gap: space[64], paddingBottom: space[48] },
  textos: { gap: gap.default },
  base: { alignItems: 'center', gap: gap.loose },
});
