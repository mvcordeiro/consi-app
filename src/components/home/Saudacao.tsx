import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { borderWidth, space, useCoresSvg, useTema } from '@/theme';

import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { IlustracaoSentimentos, LogoHome, fotoPerfil } from './assets';

/** Frame 74 — logo do Consi à esquerda e foto de perfil à direita. */
export function TopoHome() {
  const { cores } = useTema();
  return (
    <Aparecer deslocamento={0} duracao={600} style={styles.topo}>
      <LogoHome width={34.19} height={40} corTraco={cores.icon.primary} />
      <View style={[styles.perfil, { borderColor: cores.border.subtle }]} accessibilityLabel="Seu perfil">
        <Image source={fotoPerfil} style={styles.foto} resizeMode="cover" />
      </View>
    </Aparecer>
  );
}

// Medidas do Figma: área da ilustração 392 × 343,65 e o SVG um pouco maior (sobra das bordas).
const LARGURA_ARTE = 392;
const ALTURA_ARTE = 343.649;
const SVG = { largura: 396.087, altura: 347.218, esquerda: 0.0049, topo: 0.0075 };

/**
 * Saudação — "Olá, nome! Como você está hoje?" e a ilustração dos sentimentos,
 * que fica no pé da primeira tela, logo acima da barra de navegação.
 */
export function Saudacao({ nome, altura }: { nome: string; altura: number }) {
  const { cores } = useTema();
  const svg = useCoresSvg();
  const { width } = useWindowDimensions();
  const titulo = `${nome ? `Olá, ${nome}!` : 'Olá!'}\nComo você está hoje?`;
  const fimTitulo = fimDoTexto(titulo, 200);

  const largura = Math.min(LARGURA_ARTE, width - 44);
  const escala = largura / LARGURA_ARTE;

  return (
    <View style={[styles.saudacao, { minHeight: altura }]}>
      <View style={styles.textos}>
        <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={200} />
        <TextoAnimado
          texto="Selecione o sentimento que te represente agora."
          estilo="Texto/Pequeno"
          cor={cores.text.tertiary}
          atraso={fimTitulo}
        />
      </View>
      <Aparecer atraso={fimTitulo} escalaInicial={0.96} duracao={1000}>
        <View style={{ width: largura, height: ALTURA_ARTE * escala }}>
          <IlustracaoSentimentos
            width={SVG.largura * escala}
            height={SVG.altura * escala}
            style={{ marginLeft: -SVG.esquerda * largura, marginTop: -SVG.topo * ALTURA_ARTE * escala }}
            corTraco={svg.corTraco}
            corSuave={svg.corSuave}
          />
        </View>
      </Aparecer>
    </View>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  perfil: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  foto: { width: 38.57, height: 51.43, marginLeft: -1, marginTop: -3.86 },
  saudacao: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[64],
    paddingTop: space[24],
    paddingBottom: space[64],
  },
  textos: { alignSelf: 'stretch', gap: space[12] },
});
