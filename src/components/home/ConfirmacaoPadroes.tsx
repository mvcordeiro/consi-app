import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { padroes } from '@/data/home';
import { radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { Etiqueta } from '../Etiqueta';
import { ProgressoSegmentos } from '../ProgressoSegmentos';
import { Texto } from '../Texto';
import { RostoBocaFechada, RostoPositivo, RostoTonto } from './assets';
import type { IconeSvg } from '../onboarding/assets';

export type RespostaPadrao = 'faz-sentido' | 'em-parte' | 'nao-e-bem-isso' | 'pulou';

const respostas: { id: RespostaPadrao; rotulo: string; icone: IconeSvg; largura: number; altura: number }[] = [
  { id: 'faz-sentido', rotulo: 'Faz sentido', icone: RostoPositivo, largura: 23.25, altura: 24 },
  { id: 'em-parte', rotulo: 'Em parte', icone: RostoTonto, largura: 24, altura: 23.83 },
  { id: 'nao-e-bem-isso', rotulo: 'Não é bem isso', icone: RostoBocaFechada, largura: 24.02, altura: 23.64 },
];

/**
 * Variação 05 / Confirmação um a um — mostra um padrão por vez e pede a opinião.
 * Cada resposta avança para o próximo; depois do último a seção some.
 */
export function ConfirmacaoPadroes({ onResponder }: { onResponder?: (id: string, r: RespostaPadrao) => void }) {
  const { cores } = useTema();
  const [indice, setIndice] = useState(0);
  const padrao = padroes[indice];

  if (!padrao) return null;

  const responder = (r: RespostaPadrao) => {
    onResponder?.(padrao.id, r);
    setIndice((i) => i + 1);
  };

  return (
    <View style={styles.secao}>
      <ProgressoSegmentos
        total={padroes.length}
        atual={indice + 1}
        rotulo={`Padrão ${indice + 1} de ${padroes.length}`}
      />
      <View style={styles.cabecalho}>
        <Texto estilo="Títulos/Médio">Isso faz sentido para você?</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Só você sabe se esse padrão é real.
        </Texto>
      </View>
      <Aparecer key={padrao.id} deslocamento={8} duracao={500}>
        <View style={[styles.card, { backgroundColor: cores.bg.raised }]}>
          <Etiqueta rotulo="Padrão encontrado" />
          <Texto estilo="Títulos/Médio">{padrao.titulo}</Texto>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            {padrao.descricao}
          </Texto>
        </View>
      </Aparecer>
      <View style={styles.respostas}>
        {respostas.map(({ id, rotulo, icone: Icone, largura, altura }) => (
          <Botao
            key={id}
            estilo="secundario"
            rotulo={rotulo}
            icone={<Icone width={largura} height={altura} corTraco={cores.action.neutral.default} />}
            onPress={() => responder(id)}
          />
        ))}
      </View>
      <Pressable onPress={() => responder('pulou')} hitSlop={12} accessibilityRole="button">
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary} style={styles.centro}>
          Pular por enquanto
        </Texto>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  cabecalho: { gap: space[4] },
  card: { gap: space[12], padding: space[20], borderRadius: radius.lg, overflow: 'hidden' },
  respostas: { gap: 10 },
  centro: { textAlign: 'center' },
});
