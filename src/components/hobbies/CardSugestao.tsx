import { StyleSheet, View } from 'react-native';

import type { Atividade } from '@/data/catalogo';
import { radius, space, useTema } from '@/theme';

import { Avatar } from '../Avatar';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { BotaoCard } from './BotaoCard';
import { IconeHobby } from './IconeHobby';

/** Altura do "Card 01 / Current" de Para você (Figma 671:5300): 24 + 212 + 32 + 48 + 24. */
export const ALTURA_CARD_SUGESTAO = 340;

type Props = {
  sugestao: Atividade;
  totalComentarios: number;
  onIgnorar: () => void;
  onConversa: () => void;
  onAceitar: () => void;
  onMais: () => void;
};

/**
 * Card / Para você (Figma 671:5300, e o botão do meio das telas de interação 574:3136):
 * autor + tempo, ícone do hobby, título (Títulos/Grande), prévia com "mais" e as três ações —
 * ignorar (bg/error-subtle), conversa com a contagem (bg/base) e aceitar (bg/success-subtle).
 */
export function CardSugestao({ sugestao, totalComentarios, onIgnorar, onConversa, onAceitar, onMais }: Props) {
  const { cores } = useTema();
  const autor = sugestao.permissoes.mostrarAutor
    ? sugestao.autor
    : { usuario: 'Alguém da comunidade', iniciais: '·' };
  return (
    <View style={styles.conteudo}>
      <View style={styles.corpo}>
        <View style={styles.topo}>
          <View style={styles.autor}>
            <Avatar tamanho={24} foto={autor.foto} iniciais={autor.iniciais} />
            <Texto estilo="Texto/Pequeno" numberOfLines={1} style={styles.encolher}>
              {autor.usuario}
            </Texto>
            {sugestao.quando ? <Texto estilo="Texto/Pequeno">{`· ${sugestao.quando}`}</Texto> : null}
          </View>
          <View style={styles.icone}>
            <IconeHobby hobby={sugestao.hobby} icone={sugestao.icone} caixa={24} />
          </View>
        </View>
        <View style={styles.textos}>
          <Texto estilo="Títulos/Grande" numberOfLines={3} style={styles.titulo}>
            {sugestao.titulo}
          </Texto>
          <Texto estilo="Texto/Médio" numberOfLines={2} style={styles.resumo}>
            {`${sugestao.resumo}... `}
            <Texto estilo="Texto/Médio" cor={cores.text.tertiary} onPress={onMais} accessibilityRole="link">
              mais
            </Texto>
          </Texto>
        </View>
      </View>
      <View style={styles.acoes}>
        <BotaoCard
          fundo={cores.bg['error-subtle']}
          icone={<Icone nome="rosto-mal-humorado" />}
          acessibilidade="Ignorar sugestão"
          onPress={onIgnorar}
        />
        {sugestao.permissoes.comentarios ? (
          <BotaoCard
            fundo={cores.bg.base}
            icone={<Icone nome="conversa" />}
            rotulo={String(totalComentarios)}
            acessibilidade={`Conversa, ${totalComentarios} comentários`}
            onPress={onConversa}
          />
        ) : null}
        <BotaoCard
          fundo={cores.bg['success-subtle']}
          icone={<Icone nome="rosto-positivo" />}
          acessibilidade="Aceitar sugestão"
          onPress={onAceitar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    height: ALTURA_CARD_SUGESTAO,
    justifyContent: 'space-between',
    paddingHorizontal: space[20],
    paddingVertical: space[24],
    borderRadius: radius.card,
  },
  corpo: { gap: space[32] },
  topo: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  autor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[8], minWidth: 0 },
  encolher: { flexShrink: 1 },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  textos: { gap: space[12] },
  // larguras do Figma: título 286 e prévia 273 de 346 disponíveis
  titulo: { maxWidth: 286 },
  resumo: { maxWidth: 273 },
  acoes: { flexDirection: 'row', gap: space[8] },
});
