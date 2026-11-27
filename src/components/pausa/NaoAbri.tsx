import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { space, tempo, useTema } from '@/theme';

import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { AnelProgresso } from '../onboarding/AnelProgresso';

/** Quanto tempo a tela fica antes de sumir sozinha. */
export const DURACAO_NAO_ABRI = tempo.naoAbri;

const TITULO = 'Boa! Dessa vez você não abriu.';
/** Quando a pessoa já estava usando o app e escolheu parar. */
const TITULO_DEPOIS_DE_USAR = 'Boa! Você soube a hora de parar.';
const DESCRICAO = 'Registramos essa escolha no Consi.\nQue tal aproveitar e contar como você está?';
const LADO_ANEL = 152;

/**
 * Depois de "Dessa vez não abro" (sem frame no Figma; pedido do produto): o mesmo emoji do botão
 * no centro, uma mensagem positiva e o convite para o check-in. Um anel em contorno em volta do
 * emoji esvazia em 10 s, mostrando o tempo até a tela sumir. Embaixo, "Fazer check-in" em
 * destaque (botão principal, rótulo em text/primary) e "Sair" com aparência de desabilitado
 * (mas tocável). Depois de já ter usado o app, o título muda para "soube a hora de parar".
 */
export function NaoAbri({
  depoisDeUsar = false,
  onCheckin,
  onFim,
}: {
  depoisDeUsar?: boolean;
  onCheckin: () => void;
  onFim: () => void;
}) {
  const { cores } = useTema();
  const [restante] = useState(() => new Animated.Value(1));
  const saiu = useRef(false);
  const titulo = depoisDeUsar ? TITULO_DEPOIS_DE_USAR : TITULO;
  const fimTitulo = fimDoTexto(titulo, 250);

  useEffect(() => {
    const a = Animated.timing(restante, {
      toValue: 0,
      duration: DURACAO_NAO_ABRI,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    a.start(({ finished }) => {
      if (finished && !saiu.current) {
        saiu.current = true;
        onFim();
      }
    });
    return () => a.stop();
  }, [restante, onFim]);

  const sair = (acao: () => void) => () => {
    if (saiu.current) return;
    saiu.current = true;
    restante.stopAnimation();
    acao();
  };

  return (
    <View style={styles.tela}>
      <View style={styles.centro}>
        <Aparecer escalaInicial={0.85} deslocamento={0} duracao={700}>
          <View
            style={styles.anel}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`A tela fecha sozinha em ${DURACAO_NAO_ABRI / 1000} segundos`}
          >
            <View style={StyleSheet.absoluteFill}>
              <AnelProgresso
                progresso={restante}
                tamanho={LADO_ANEL}
                espessura={2}
                corTrilho={cores.border.subtle}
                corArco={cores.border.focus}
              />
            </View>
            <Icone nome="rosto-positivo" tamanho={72} />
          </View>
        </Aparecer>
        <View style={styles.textos}>
          <TextoAnimado texto={titulo} estilo="Títulos/Grande" atraso={250} />
          <TextoAnimado texto={DESCRICAO} estilo="Texto/Médio" cor={cores.text.secondary} atraso={fimTitulo} />
        </View>
      </View>
      <Aparecer atraso={fimDoTexto(DESCRICAO, fimTitulo)} style={styles.rodape}>
        <Botao rotulo="Fazer check-in" corRotulo={cores.text.primary} onPress={sair(onCheckin)} />
        <Botao rotulo="Sair" estilo="secundario" apagado onPress={sair(onFim)} />
      </Aparecer>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[40], paddingHorizontal: space[24] },
  anel: { width: LADO_ANEL, height: LADO_ANEL, alignItems: 'center', justifyContent: 'center' },
  textos: { alignItems: 'center', gap: space[12], maxWidth: 320 },
  // mesmas margens dos botões da pausa (Figma: 12 + 16 px nas laterais, 40 px embaixo)
  rodape: { paddingHorizontal: space[12] + space[16], paddingBottom: space[40], gap: space[12] },
});
