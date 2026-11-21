import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, CabecalhoAba, Filtro, Icone, Texto, useAviso, useEspacoBarra } from '@/components';
import { Aparecer } from '@/components/animacao';
import {
  AbasHobbies,
  ALTURA_CARD_SUGESTAO,
  CardAtividade,
  IconeHobby,
  irPara,
  PilhaSugestoes,
  useAcoesAtividade,
  type Decisao,
} from '@/components/hobbies';
import { hobbyInfo, type Atividade, type HobbyId } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { borderWidth, radius, space, useTema } from '@/theme';

const MARGEM = space[24];
/** Quantas atividades em andamento aparecem por hobby antes do "Ver tudo". */
const NA_ABA = 3;

/**
 * Hobbies (Figma 671:5292). "Para você" é uma pilha de sugestões com filtro por hobby e a
 * interação de arrastar da seção 671:5840; os filtros terminam em "+ Novo hobby" e
 * "Sugerir atividade +". "Suas atividades" lista o que a pessoa aceitou ou criou, com o mesmo
 * gesto (esquerda apaga, direita finaliza). Telas secundárias em src/app/hobby/.
 */
export default function Hobbies() {
  const { cores } = useTema();
  const { top } = useSafeAreaInsets();
  const espacoBarra = useEspacoBarra();
  const h = useHobbies();
  const [aviso, mostrarAviso] = useAviso();
  const acoes = useAcoesAtividade({
    aoApagar: () => mostrarAviso('Atividade apagada'),
    aoAgendar: (r) => mostrarAviso(r ? `Lembrete para ${r}` : 'Lembrete removido'),
  });
  const [arrastando, setArrastando] = useState(false);
  const [filtro, setFiltro] = useState<HobbyId | null>(null);
  const [aba, setAba] = useState<HobbyId | null>(null);

  // Vindo da pausa ("Quero explorar esse hobby"), abre no hobby escolhido na roda.
  const { hobby: doParametro } = useLocalSearchParams<{ hobby?: HobbyId }>();
  const [ultimoParametro, setUltimoParametro] = useState<HobbyId | undefined>(undefined);
  if (doParametro !== ultimoParametro) {
    setUltimoParametro(doParametro);
    if (doParametro) {
      setFiltro(doParametro);
      setAba(doParametro);
    }
  }

  // Os hobbies podem ter mudado no onboarding ou na tela de edição.
  const { sincronizarOnboarding } = h;
  useFocusEffect(useCallback(() => sincronizarOnboarding(), [sincronizarOnboarding]));

  const hobbyFiltro = filtro && h.hobbies.includes(filtro) ? filtro : h.hobbies[0];
  const hobbyAba = aba && h.hobbies.includes(aba) ? aba : h.hobbies[0];

  const pilha = h.pilha(hobbyFiltro);
  const naAba = h.atividades.filter((a) => a.hobby === hobbyAba && a.status === 'andamento');

  const decidir = (s: Atividade, d: Decisao) => {
    if (d === 'ignorar') {
      h.ignorar(s);
      return;
    }
    h.aceitar(s);
    setAba(s.hobby);
    mostrarAviso(`Adicionada em Suas atividades · ${hobbyInfo(s.hobby).nome}`);
  };

  const apagarArrastando = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    h.apagar(id);
    mostrarAviso('Atividade apagada', {
      rotulo: 'Desfazer',
      onPress: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        h.desfazerApagar();
      },
    });
  };

  if (!h.carregado) return null;

  return (
    <View style={styles.flex}>
      <ScrollView
        scrollEnabled={!arrastando}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.conteudo, { paddingTop: top, paddingBottom: espacoBarra + space[64] }]}
      >
        <CabecalhoAba />

        {/* Título e filtros ficam acima da pilha: o card que sai sobe por trás deles. */}
        <View style={styles.acima}>
          <Aparecer atraso={100}>
            <Texto estilo="Títulos/Grande">Para você</Texto>
          </Aparecer>
          <Aparecer atraso={200}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sangria}
              contentContainerStyle={styles.filtros}
            >
              {h.hobbies.map((hb) => (
                <Filtro
                  key={hb}
                  rotulo={hobbyInfo(hb).nome}
                  ativo={hb === hobbyFiltro}
                  onPress={() => setFiltro(hb)}
                  icone={(cor) => <IconeHobby hobby={hb} caixa={16} cor={cor} />}
                />
              ))}
              <Filtro
                rotulo="Novo hobby"
                onPress={irPara.novoHobby}
                icone={(cor) => <Icone nome="adicionar" tamanho={16} cor={cor} />}
              />
              {/* Sempre a última etiqueta */}
              <Filtro
                rotulo="Sugerir atividade"
                onPress={() => irPara.criar('comunidade', hobbyFiltro)}
                iconeDireita={(cor) => <Icone nome="adicionar" tamanho={16} cor={cor} />}
              />
            </ScrollView>
          </Aparecer>
        </View>

        <Aparecer atraso={300} key={hobbyFiltro} style={styles.pilha}>
          <PilhaSugestoes
            sugestoes={pilha}
            margem={MARGEM}
            totalComentarios={h.totalComentarios}
            onDecidir={decidir}
            onConversa={(s) => irPara.conversa(s.id)}
            onMais={(s) => irPara.detalhe(s.id)}
            onArrastando={setArrastando}
            vazio={
              <PilhaVazia
                hobby={hobbyFiltro}
                podeRever={h.temIgnoradas(hobbyFiltro)}
                onRever={() => h.reverIgnoradas(hobbyFiltro)}
                onSugerir={() => irPara.criar('comunidade', hobbyFiltro)}
              />
            }
          />
          {pilha.length ? (
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.dica}>
              Arraste para esquerda para ignorar, direita para aceitar.
            </Texto>
          ) : null}
        </Aparecer>

        <View style={styles.atividades}>
          <View style={styles.tituloLinha}>
            <Texto estilo="Títulos/Grande" style={styles.flex}>
              Suas atividades
            </Texto>
            <Pressable
              onPress={() => irPara.criar('privada', hobbyAba)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Criar atividade"
              style={styles.botaoIcone}
            >
              <Icone nome="adicionar" />
            </Pressable>
            <Pressable
              onPress={irPara.editar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Editar seus hobbies"
              style={styles.botaoIcone}
            >
              <Icone nome="engrenagem" />
            </Pressable>
          </View>

          <AbasHobbies hobbies={h.hobbies} ativo={hobbyAba} onEscolher={setAba} margem={MARGEM} />

          <View style={styles.lista}>
            {naAba.length ? (
              naAba.slice(0, NA_ABA).map((a, i) => (
                <Aparecer key={a.id} atraso={i * 80}>
                  <CardAtividade
                    atividade={a}
                    margem={MARGEM}
                    onArrastando={setArrastando}
                    onAbrir={() => irPara.detalhe(a.id)}
                    onMenu={() => acoes.abrirMenu(a)}
                    onApagar={() => acoes.confirmarApagar(a)}
                    onArrastarApagar={() => apagarArrastando(a.id)}
                    onConversa={() => irPara.conversa(a.id)}
                    onFinalizar={() => irPara.finalizar(a.id)}
                  />
                </Aparecer>
              ))
            ) : (
              <AbaVazia hobby={hobbyAba} onCriar={() => irPara.criar('privada', hobbyAba)} />
            )}
            {naAba.length ? (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                Arraste para esquerda para apagar, direita para finalizar.
              </Texto>
            ) : null}
          </View>

          <Botao rotulo="Ver tudo" corRotulo={cores.text['on-primary']} onPress={() => irPara.atividades(hobbyAba)} />
        </View>
      </ScrollView>
      {acoes.folhas}
      {aviso}
    </View>
  );
}

/** Fim da pilha (sem design no Figma): mesmo tamanho do card, em bg/sunken com borda border/focus. */
function PilhaVazia({
  hobby,
  podeRever,
  onRever,
  onSugerir,
}: {
  hobby: HobbyId;
  podeRever: boolean;
  onRever: () => void;
  onSugerir: () => void;
}) {
  const { cores } = useTema();
  const nome = hobbyInfo(hobby).nome;
  return (
    <View style={[styles.vazio, { backgroundColor: cores.bg.sunken, borderColor: cores.border.focus }]}>
      <IconeHobby hobby={hobby} caixa={32} />
      <View style={styles.vazioTextos}>
        <Texto estilo="Títulos/Médio" style={styles.centro}>
          {podeRever ? 'Por hoje é isso' : 'Ainda não há sugestões aqui'}
        </Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
          {podeRever
            ? `Você viu todas as sugestões de ${nome}. Novas ideias chegam amanhã.`
            : `Que tal ser a primeira pessoa a sugerir algo de ${nome}?`}
        </Texto>
      </View>
      {podeRever ? (
        <Botao rotulo="Rever as que ignorei" estilo="secundario" onPress={onRever} />
      ) : (
        <Botao rotulo="Sugerir atividade" estilo="secundario" onPress={onSugerir} />
      )}
    </View>
  );
}

function AbaVazia({ hobby, onCriar }: { hobby: HobbyId; onCriar: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable onPress={onCriar} accessibilityRole="button" style={[styles.abaVazia, { borderColor: cores.border.subtle }]}>
      <Icone nome="adicionar" />
      <Texto estilo="Títulos/Pequeno" style={styles.centro}>
        {`Nenhuma atividade de ${hobbyInfo(hobby).nome} ainda`}
      </Texto>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
        Aceite uma sugestão em Para você ou toque aqui para criar a sua.
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { paddingHorizontal: MARGEM },
  acima: { zIndex: 2, marginTop: space[24], gap: space[12] },
  sangria: { marginHorizontal: -MARGEM },
  filtros: { paddingHorizontal: MARGEM, gap: space[12] },
  pilha: { zIndex: 1, marginTop: space[24] },
  dica: { textAlign: 'center', marginTop: space[24] },
  atividades: { marginTop: space[64], gap: space[24] },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  botaoIcone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  lista: { gap: space[24], marginBottom: space[12] },
  centro: { textAlign: 'center' },
  vazio: {
    height: ALTURA_CARD_SUGESTAO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[20],
    padding: space[24],
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
  },
  vazioTextos: { gap: space[8], alignItems: 'center' },
  abaVazia: {
    alignItems: 'center',
    gap: space[8],
    padding: space[24],
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
});
