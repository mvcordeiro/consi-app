import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { padroes } from '@/data/home';
import { duration, easing, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { emocaoPorId } from '@/data/emocoes';

import { BalaoEmocao } from './BalaoEmocao';
import { Etiqueta } from '../Etiqueta';
import type { IconeSvg } from '../onboarding/assets';
import { ProgressoSegmentos } from '../ProgressoSegmentos';
import { Texto } from '../Texto';
import { RostoBocaFechada, RostoPositivo, RostoTonto } from './assets';

export type RespostaPadrao = 'faz-sentido' | 'em-parte' | 'nao-e-bem-isso' | 'pulou';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);
/** Tempo com a resposta marcada (estado Ativo) antes de trocar de padrão. */
const ESPERA_RESPOSTA_MS = 500;

const respostas: { id: RespostaPadrao; rotulo: string; icone: IconeSvg; largura: number; altura: number }[] = [
  { id: 'faz-sentido', rotulo: 'Faz sentido', icone: RostoPositivo, largura: 23.25, altura: 24 },
  { id: 'em-parte', rotulo: 'Em parte', icone: RostoTonto, largura: 24, altura: 23.83 },
  { id: 'nao-e-bem-isso', rotulo: 'Não é bem isso', icone: RostoBocaFechada, largura: 24.02, altura: 23.64 },
];

/**
 * Variação 05 / Confirmação um a um — mostra um padrão por vez e pede a opinião.
 * A resposta tocada fica preenchida (action/primary) por 0,5 s; o card sai e o próximo padrão entra.
 * Depois do último, aparece a conclusão — um card centralizado, diferente dos padrões —
 * com "Quero responder novamente".
 */
export function ConfirmacaoPadroes({ onResponder }: { onResponder?: (id: string, r: RespostaPadrao) => void }) {
  const { cores } = useTema();
  const [indice, setIndice] = useState(0);
  const [escolhida, setEscolhida] = useState<RespostaPadrao | null>(null);
  const [saida] = useState(() => new Animated.Value(1));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const padrao = padroes[indice];
  const concluido = indice >= padroes.length;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const responder = (r: RespostaPadrao) => {
    if (escolhida || !padrao) return;
    setEscolhida(r);
    onResponder?.(padrao.id, r);
    timer.current = setTimeout(() => {
      Animated.timing(saida, { toValue: 0, duration: duration.slow, easing: curva, useNativeDriver: nativo }).start(
        () => {
          setIndice((i) => i + 1);
          setEscolhida(null);
          saida.setValue(1);
        },
      );
    }, ESPERA_RESPOSTA_MS);
  };

  const recomecar = () => {
    setEscolhida(null);
    setIndice(0);
  };

  const atual = Math.min(indice + 1, padroes.length);

  return (
    <View style={styles.secao}>
      {concluido ? (
        <Aparecer key="conclusao" deslocamento={16} escalaInicial={0.96} duracao={800}>
          <Conclusao onRecomecar={recomecar} />
        </Aparecer>
      ) : (
        <>
          <ProgressoSegmentos total={padroes.length} atual={atual} rotulo={`Padrão ${atual} de ${padroes.length}`} />
          <View style={styles.cabecalho}>
            <Texto estilo="Títulos/Médio">Isso faz sentido para você?</Texto>
            <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
              Só você sabe se esse padrão é real.
            </Texto>
          </View>
          <View style={styles.secao}>
            {/* Só o card troca: o atual sai com fade e o próximo entra com appear-in; as respostas ficam */}
            <Animated.View
              style={{
                opacity: saida,
                transform: [{ translateY: saida.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
              }}
            >
            <Aparecer key={padrao.id} deslocamento={12} duracao={700}>
              <View style={[styles.card, { backgroundColor: cores.bg.raised }]}>
                <Etiqueta rotulo="Padrão encontrado" />
                <Texto estilo="Títulos/Médio">{padrao.titulo}</Texto>
                <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
                  {padrao.descricao}
                </Texto>
              </View>
            </Aparecer>
            </Animated.View>
            <View style={styles.respostas}>
              {respostas.map(({ id, rotulo, icone: Icone, largura, altura }) => (
                <Botao
                  key={id}
                  estilo="secundario"
                  // a escolhida fica preenchida (fade de action/primary) até o próximo padrão entrar
                  selecionado={escolhida === id}
                  disabled={!!escolhida && escolhida !== id}
                  rotulo={rotulo}
                  icone={(cor) => (
                    <Icone
                      width={largura}
                      height={altura}
                      corTraco={escolhida === id ? cor : cores.action.neutral.default}
                    />
                  )}
                  onPress={() => responder(id)}
                />
              ))}
            </View>
            <Pressable
              onPress={() => responder('pulou')}
              hitSlop={12}
              accessibilityRole="button"
              disabled={!!escolhida}
            >
              <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary} style={styles.centro}>
                Pular por enquanto
              </Texto>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

/** Conclusão — card centralizado com borda, balão Alegria flutuando e o botão principal. */
function Conclusao({ onRecomecar }: { onRecomecar: () => void }) {
  const { cores } = useTema();
  const alegria = emocaoPorId('alegria');
  return (
    <View style={[styles.conclusao, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
      {alegria ? (
        <BalaoEmocao Svg={alegria.Svg} Textura={alegria.Textura} circulo={alegria.circulo} tamanho={72} />
      ) : null}
      <View style={styles.textosConclusao}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
          {padroes.length} DE {padroes.length} PADRÕES RESPONDIDOS
        </Texto>
        <Texto estilo="Títulos/Médio" style={styles.centro}>
          Obrigado por compartilhar!
        </Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
          Continue usando o Consi para receber novas reflexões sobre você.
        </Texto>
      </View>
      <View style={styles.largo}>
        <Botao rotulo="Quero responder novamente" corRotulo={cores.text.primary} onPress={onRecomecar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  cabecalho: { gap: space[4] },
  card: { gap: space[12], padding: space[20], borderRadius: radius.lg, overflow: 'hidden' },
  respostas: { gap: 10 },
  centro: { textAlign: 'center' },
  conclusao: {
    alignItems: 'center',
    gap: space[20],
    paddingHorizontal: space[24] - 1,
    paddingTop: space[32] - 1,
    paddingBottom: space[24] - 1,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  textosConclusao: { alignSelf: 'stretch', gap: space[8] },
  largo: { alignSelf: 'stretch' },
});
