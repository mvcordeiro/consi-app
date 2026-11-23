import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, CabecalhoAba, Filtro, Folha, Icone, ItemFolha, Texto, useAviso, useEspacoBarra } from '@/components';
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
 * gesto (esquerda apaga, direita finaliza). O "+" pergunta se é uma atividade ou um hobby novo;
 * o "•••" abre "Seus hobbies", onde dá para remover cada hobby.
 * Telas secundárias em src/app/hobby/.
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
  // null = "Todos": sugestões de todos os hobbies da pessoa, intercaladas (o filtro padrão).
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

  // Vindo do widget "Para você" ("Não agora"): tira aquela sugestão da pilha, uma vez.
  const { ignorar: paraIgnorar } = useLocalSearchParams<{ ignorar?: string }>();
  const ignorouDoWidget = useRef<string | null>(null);
  const { carregado, item, ignorar } = h;
  useEffect(() => {
    if (!carregado || !paraIgnorar || ignorouDoWidget.current === paraIgnorar) return;
    ignorouDoWidget.current = paraIgnorar;
    const sugestao = item(paraIgnorar);
    if (sugestao?.tipo === 'catalogo') ignorar(sugestao.a);
  }, [carregado, paraIgnorar, item, ignorar]);

  // Os hobbies podem ter mudado no onboarding ou na tela de edição.
  const { sincronizarOnboarding } = h;
  useFocusEffect(useCallback(() => sincronizarOnboarding(), [sincronizarOnboarding]));

  const hobbyFiltro = filtro && h.hobbies.includes(filtro) ? filtro : null;
  const hobbyAba = aba && h.hobbies.includes(aba) ? aba : h.hobbies[0];

  // "Todos": uma de cada hobby por vez, para a pilha não começar com 20 de um hobby só.
  const pilha = hobbyFiltro ? h.pilha(hobbyFiltro) : intercalar(h.hobbies.map((hb) => h.pilha(hb)));
  const podeRever = hobbyFiltro ? h.temIgnoradas(hobbyFiltro) : h.hobbies.some((hb) => h.temIgnoradas(hb));
  const reverIgnoradas = () =>
    hobbyFiltro ? h.reverIgnoradas(hobbyFiltro) : h.hobbies.forEach((hb) => h.reverIgnoradas(hb));
  const sugerir = () => irPara.criar('comunidade', hobbyFiltro ?? undefined);
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

  // "+" de Suas atividades: pergunta antes se é uma atividade nova ou um hobby novo.
  const [adicionar, setAdicionar] = useState(false);
  const depoisDaFolha = (fn: () => void) => {
    setAdicionar(false);
    // espera a folha descer antes de abrir a próxima tela
    setTimeout(fn, 220);
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
              <Filtro
                rotulo="Todos"
                ativo={!hobbyFiltro}
                onPress={() => setFiltro(null)}
                icone={(cor) => <Icone nome="blocos" tamanho={16} cor={cor} />}
              />
              {h.hobbies.map((hb) => (
                <Filtro
                  key={hb}
                  rotulo={hobbyInfo(hb).nome}
                  ativo={hb === hobbyFiltro}
                  onPress={() => setFiltro(hb)}
                  icone={(cor) => <IconeHobby hobby={hb} caixa={16} cor={cor} />}
                />
              ))}
              {/* Sempre a última etiqueta; tracejada por ser uma ação, não um filtro */}
              <Filtro
                rotulo="Sugerir atividade"
                tracejado
                onPress={sugerir}
                iconeDireita={(cor) => <Icone nome="adicionar" tamanho={16} cor={cor} />}
              />
            </ScrollView>
          </Aparecer>
        </View>

        <Aparecer atraso={300} key={hobbyFiltro ?? 'todos'} style={styles.pilha}>
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
                podeRever={podeRever}
                onRever={reverIgnoradas}
                onSugerir={sugerir}
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
              onPress={() => setAdicionar(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Adicionar atividade ou hobby"
              style={styles.botaoIcone}
            >
              <Icone nome="adicionar" />
            </Pressable>
            <Pressable
              onPress={irPara.editar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Gerenciar seus hobbies"
              style={styles.botaoIcone}
            >
              <Icone nome="menu-horizontal" />
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

      {/* "+" de Suas atividades: atividade nova (no hobby da aba) ou hobby novo */}
      <Folha visivel={adicionar} onFechar={() => setAdicionar(false)} titulo="O que você quer adicionar?">
        <View>
          <ItemFolha
            rotulo={`Nova atividade de ${hobbyInfo(hobbyAba).nome}`}
            icone={(cor) => <Icone nome="lista-tarefas" cor={cor} />}
            onPress={() => depoisDaFolha(() => irPara.criar('privada', hobbyAba))}
          />
          <ItemFolha
            rotulo="Novo hobby"
            icone={(cor) => <Icone nome="lampada" cor={cor} />}
            onPress={() => depoisDaFolha(irPara.novoHobby)}
          />
        </View>
      </Folha>

      {aviso}
    </View>
  );
}

/** Intercala as listas: a primeira de cada, depois a segunda de cada… */
function intercalar<T>(listas: T[][]): T[] {
  const saida: T[] = [];
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) for (const l of listas) if (l[i]) saida.push(l[i]);
  return saida;
}

/**
 * Fim da pilha (sem design no Figma): mesmo tamanho do card, em bg/sunken com borda border/focus.
 * Em "Todos" (`hobby` null), fala de todos os hobbies. Sempre dá para sugerir uma atividade;
 * se a pessoa ignorou alguma, também dá para revê-las.
 */
function PilhaVazia({
  hobby,
  podeRever,
  onRever,
  onSugerir,
}: {
  hobby: HobbyId | null;
  podeRever: boolean;
  onRever: () => void;
  onSugerir: () => void;
}) {
  const { cores } = useTema();
  const nome = hobby ? hobbyInfo(hobby).nome : null;
  return (
    <View style={[styles.vazio, { backgroundColor: cores.bg.sunken, borderColor: cores.border.focus }]}>
      {hobby ? <IconeHobby hobby={hobby} caixa={32} /> : <Icone nome="blocos" tamanho={32} />}
      <View style={styles.vazioTextos}>
        <Texto estilo="Títulos/Médio" style={styles.centro}>
          {podeRever ? 'Por hoje é isso' : 'Ainda não há sugestões aqui'}
        </Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
          {podeRever
            ? `Você viu todas as sugestões${nome ? ` de ${nome}` : ''}. Novas ideias chegam amanhã.`
            : `Que tal ser a primeira pessoa a sugerir algo${nome ? ` de ${nome}` : ''}?`}
        </Texto>
      </View>
      <View style={styles.botoesVazio}>
        {podeRever ? <Botao rotulo="Rever as que ignorei" estilo="secundario" onPress={onRever} /> : null}
        <Botao
          rotulo="Sugerir atividade"
          estilo="secundario"
          icone={(cor) => <Icone nome="adicionar" tamanho={16} cor={cor} />}
          onPress={onSugerir}
        />
      </View>
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
  botoes: { gap: space[12] },
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
  botoesVazio: { alignSelf: 'stretch', gap: space[8] },
  abaVazia: {
    alignItems: 'center',
    gap: space[8],
    padding: space[24],
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
});
