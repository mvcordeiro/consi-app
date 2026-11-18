import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { sentimentos, type AtividadeMinha } from '@/data/catalogo';
import { dataCurta } from '@/data/hobbiesEstado';
import { radius, space, useTema } from '@/theme';

import { Etiqueta } from '../Etiqueta';
import { Icone } from '../Icone';
import { Texto } from '../Texto';
import { ABA_A, AbaArraste, BordasArraste, sairPeloLado, useArrasteLateral, useLarguraTela, voltarAoLugar } from './Arraste';
import { Ponto } from './assets';
import { BotaoCard } from './BotaoCard';
import { IconeHobby } from './IconeHobby';

type Props = {
  atividade: AtividadeMinha;
  onAbrir: () => void;
  onMenu: () => void;
  /** Botão "Apagar" (confirma antes). */
  onApagar: () => void;
  /** Arrastar para a esquerda: apaga na hora (com "Desfazer" no aviso). */
  onArrastarApagar?: () => void;
  onConversa: () => void;
  onFinalizar: () => void;
  onArrastando?: (a: boolean) => void;
  /** Margem lateral da página: as abas de feedback vão até a borda da tela. */
  margem: number;
};

/** Altura aproximada do card, para centralizar a aba de feedback. */
const ALTURA_CARD = 276;

/**
 * Card / Suas atividades (Figma 671:5710): ícone do hobby e menu "•••", título (Títulos/Pequeno),
 * prévia com "mais" e as ações Apagar, Conversa (com o ponto de mensagem nova) e Finalizar.
 * Tem o mesmo gesto de "Para você": arrastar para a esquerda apaga, para a direita finaliza.
 * Concluída, troca as ações pela data e pelo sentimento e não arrasta.
 */
export function CardAtividade({
  atividade,
  onAbrir,
  onMenu,
  onApagar,
  onArrastarApagar,
  onConversa,
  onFinalizar,
  onArrastando,
  margem,
}: Props) {
  const { cores } = useTema();
  const largura = useLarguraTela();
  const concluida = atividade.status === 'concluida';
  const arraste = useArrasteLateral({
    onArrastando,
    onSoltar: (lado, pan) => {
      if (lado === 'esquerda' && onArrastarApagar) sairPeloLado(pan, 'esquerda', largura, onArrastarApagar);
      else {
        voltarAoLugar(pan);
        if (lado === 'direita') onFinalizar();
      }
    },
  });
  const giro = arraste.pan.interpolate({ inputRange: [-96, 0, 96], outputRange: ['-2deg', '0deg', '2deg'] });

  const card = (
    <View style={[styles.card, { backgroundColor: cores.bg.raised }]}>
      <View style={styles.corpo}>
        <View style={styles.topo}>
          <IconeHobby hobby={atividade.hobby} icone={atividade.icone} caixa={24} />
          <View style={styles.topoDireita}>
            {atividade.lembrete && !concluida ? (
              <Etiqueta rotulo={atividade.lembrete.rotulo} tom="info" iconeNode={<Icone nome="calendario" tamanho={16} />} />
            ) : null}
            <Pressable
              onPress={onMenu}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Mais opções de ${atividade.titulo}`}
              style={styles.menu}
            >
              <Icone nome="menu-horizontal" />
            </Pressable>
          </View>
        </View>
        <Pressable onPress={onAbrir} accessibilityRole="button" style={styles.textos}>
          <Texto estilo="Títulos/Pequeno" numberOfLines={2}>
            {atividade.titulo}
          </Texto>
          <Texto estilo="Texto/Médio" numberOfLines={2}>
            {`${atividade.resumo}... `}
            <Texto estilo="Texto/Médio" cor={cores.text.tertiary}>
              mais
            </Texto>
          </Texto>
        </Pressable>
      </View>

      {concluida ? (
        <View style={styles.etiquetas}>
          <Etiqueta
            rotulo={atividade.concluidaEm ? `Concluída em ${dataCurta(atividade.concluidaEm)}` : 'Concluída'}
            tom="sucesso"
            iconeNode={<Icone nome="rosto-positivo" tamanho={16} cor={cores.text.primary} />}
          />
          {atividade.sentimento ? <Etiqueta rotulo={sentimentos[atividade.sentimento].rotulo} tom="info" /> : null}
        </View>
      ) : (
        <View style={styles.acoes}>
          <BotaoCard
            fundo={cores.bg['error-subtle']}
            icone={<Icone nome="lixeira" />}
            rotulo="Apagar"
            acessibilidade={`Apagar ${atividade.titulo}`}
            onPress={onApagar}
          />
          {atividade.permissoes.comentarios ? (
            <BotaoCard
              esticar={false}
              style={styles.conversa}
              fundo={cores.bg.base}
              icone={<Icone nome="conversa" />}
              acessibilidade={atividade.novidade ? 'Conversa, mensagem nova' : 'Conversa'}
              onPress={onConversa}
              sobreposicao={
                atividade.novidade ? (
                  <View pointerEvents="none" style={styles.ponto}>
                    <Ponto width={16} height={16} corAlerta={cores.feedback.error} />
                  </View>
                ) : null
              }
            />
          ) : null}
          <BotaoCard
            fundo={cores.bg['success-subtle']}
            icone={<Icone nome="rosto-positivo" />}
            rotulo="Finalizar"
            acessibilidade={`Finalizar ${atividade.titulo}`}
            onPress={onFinalizar}
          />
        </View>
      )}
    </View>
  );

  if (concluida) return card;

  return (
    <View style={{ marginHorizontal: -margem }}>
      <Animated.View
        {...arraste.handlers}
        style={{ marginHorizontal: margem, transform: [{ translateX: arraste.pan }, { rotate: giro }] }}
      >
        {card}
        <BordasArraste progressoEsq={arraste.progressoEsq} progressoDir={arraste.progressoDir} />
      </Animated.View>
      <AbaArraste
        lado="esquerda"
        progresso={arraste.progressoEsq}
        cor={cores.feedback.error}
        icone="lixeira"
        corIcone={cores.bg['error-subtle']}
        topo={(ALTURA_CARD - ABA_A) / 2}
      />
      <AbaArraste
        lado="direita"
        progresso={arraste.progressoDir}
        cor={cores.feedback.success}
        icone="rosto-positivo"
        corIcone={cores.bg['success-subtle']}
        topo={(ALTURA_CARD - ABA_A) / 2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[20],
    paddingHorizontal: space[20],
    paddingVertical: space[24],
    borderRadius: radius.card,
  },
  corpo: { gap: space[32] },
  topo: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topoDireita: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  menu: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  textos: { gap: space[12] },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  conversa: { width: 64 },
  // No Figma o ponto (Ellipse 8) fica 4 px acima do botão, encostado na borda direita.
  ponto: { position: 'absolute', top: -4, right: 0 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
