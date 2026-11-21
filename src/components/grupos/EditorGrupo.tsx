import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appPorId, comAppsDoAparelho, useApps } from '@/data/apps';
import {
  appsAcompanhados,
  apagarGrupo,
  grupoDoApp,
  ICONES_GRUPO,
  ID_LIVRE,
  INTERVALOS,
  MENSAGENS_PRONTAS,
  MODOS,
  ORDEM_MODOS,
  PAUSAS,
  salvarGrupo,
  TEMPOS_NO_APP,
  type AoIgnorar,
  type Grupo,
} from '@/data/gruposHome';
import { borderWidth, inset, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { CabecalhoVoltar } from '../CabecalhoVoltar';
import { CampoTexto } from '../CampoTexto';
import { fundoDoTom } from '../Etiqueta';
import { Filtro } from '../Filtro';
import { Folha } from '../Folha';
import { OpcoesTimer } from './OpcoesTimer';
import { IconeApp } from '../home/Grupos';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

type Props = { inicial: Grupo; novo: boolean };

/**
 * Criar grupo / abrir e editar grupo (sem design no Figma). Uma tela só, em seções:
 * nome e ícone, regra (Não interromper / Apenas pausar / Cuidar tempo), os ajustes da regra
 * (tempo de pausa, mensagem, lembretes) e os aplicativos. Ramificações em folhas: ícone,
 * mensagem, adicionar apps e desfazer o grupo. O "Livre" não muda de nome nem é desfeito,
 * e os apps dele são os que não estão em nenhum grupo.
 */
export function EditorGrupo({ inicial, novo }: Props) {
  const { cores } = useTema();
  const [g, setG] = useState<Grupo>(inicial);
  const [folha, setFolha] = useState<'icone' | 'mensagem' | 'apps' | 'desfazer' | null>(null);
  const livre = g.id === ID_LIVRE;
  const mudar = (parte: Partial<Grupo>) => setG((x) => ({ ...x, ...parte }));
  const nomeValido = g.nome.trim().length > 0;
  const comPausa = g.modo === 'apenas-pausar' || (g.modo === 'cuidar-tempo' && g.aoIgnorar === 'pausa');

  const salvar = () => {
    if (!nomeValido) return;
    salvarGrupo({ ...g, nome: g.nome.trim() });
    router.back();
  };

  const desfazer = () => {
    setFolha(null);
    apagarGrupo(g.id);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo={novo ? 'Novo grupo' : 'Grupo'} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {/* Nome e ícone */}
          <Aparecer style={styles.identidade}>
            <Pressable
              onPress={() => setFolha('icone')}
              accessibilityRole="button"
              accessibilityLabel="Trocar o ícone do grupo"
              style={[styles.iconeGrande, { backgroundColor: fundoDoTom(cores, MODOS[g.modo].tom) }]}
            >
              <Icone nome={g.icone} tamanho={32} />
              <View style={[styles.lapis, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
                <Icone nome="lapis" tamanho={12} />
              </View>
            </Pressable>
            {livre ? (
              <View style={styles.flex}>
                <Texto estilo="Títulos/Grande">Livre</Texto>
                <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
                  Fixado · os apps que não estão em nenhum grupo
                </Texto>
              </View>
            ) : (
              <View style={styles.flex}>
                <CampoTexto
                  rotulo="Nome do grupo"
                  placeholder="Ex.: Trabalho, Música, Estudos"
                  value={g.nome}
                  onChangeText={(nome) => mudar({ nome })}
                  maxLength={24}
                  autoFocus={novo}
                />
              </View>
            )}
          </Aparecer>

          {/* Regra */}
          <Secao titulo="Regra" atraso={100}>
            <View style={styles.lista}>
              {ORDEM_MODOS.map((m) => (
                <Opcao
                  key={m}
                  ativo={g.modo === m}
                  titulo={MODOS[m].nome}
                  descricao={MODOS[m].descricao}
                  icone={<SeloModo modo={m} />}
                  onPress={() => mudar({ modo: m })}
                />
              ))}
            </View>
          </Secao>

          {/* Ajustes de cada regra */}
          {g.modo === 'nao-interromper' ? (
            <Aparecer key="nao" style={[styles.nota, { backgroundColor: cores.bg['success-subtle'] }]}>
              <Texto estilo="Texto/Pequeno">
                Os apps deste grupo abrem direto, sem pausa nem lembretes. Bom para o que te faz bem.
              </Texto>
            </Aparecer>
          ) : null}

          {g.modo === 'cuidar-tempo' ? (
            <Aparecer key="cuidar" style={styles.blocos}>
              <Secao titulo="Lembrar a cada" descricao="Uma notificação enquanto você usa os apps deste grupo.">
                <Chips
                  valores={INTERVALOS}
                  atual={g.intervaloMin}
                  rotulo={(v) => `${v} min`}
                  onEscolher={(intervaloMin) => mudar({ intervaloMin })}
                />
              </Secao>
              <Secao titulo="Se você ignorar o lembrete">
                <View style={styles.lista}>
                  {(
                    [
                      ['resetar', 'Só reiniciar o timer', 'O lembrete volta depois do mesmo intervalo.'],
                      ['pausa', 'Levar para a pausa', 'Você passa pela pausa antes de continuar no app.'],
                    ] as [AoIgnorar, string, string][]
                  ).map(([v, titulo, descricao]) => (
                    <Opcao
                      key={v}
                      ativo={g.aoIgnorar === v}
                      titulo={titulo}
                      descricao={descricao}
                      onPress={() => mudar({ aoIgnorar: v })}
                    />
                  ))}
                </View>
              </Secao>
            </Aparecer>
          ) : null}

          {comPausa ? (
            <Aparecer key="pausa" style={styles.blocos}>
              <Secao titulo="Tempo de pausa" descricao="Quanto tempo você espera antes de poder abrir o app.">
                <Chips
                  valores={PAUSAS}
                  atual={g.pausaSegundos}
                  rotulo={(v) => `${v} s`}
                  onEscolher={(pausaSegundos) => mudar({ pausaSegundos })}
                />
              </Secao>
              <Secao titulo="Mensagem da pausa">
                <Pressable
                  onPress={() => setFolha('mensagem')}
                  accessibilityRole="button"
                  accessibilityLabel={`Mensagem da pausa: ${g.mensagem}. Trocar`}
                  style={({ pressed }) => [
                    styles.linhaAcao,
                    { backgroundColor: cores.bg.raised, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Icone nome="aspas" tamanho={20} />
                  <Texto estilo="Texto/Médio" style={styles.flex}>
                    {g.mensagem}
                  </Texto>
                  <Icone nome="lapis" tamanho={18} cor={cores.text.tertiary} />
                </Pressable>
              </Secao>
              <PreviaPausa grupo={g} />
            </Aparecer>
          ) : null}

          {g.modo !== 'nao-interromper' ? (
            <Aparecer key="timer" style={styles.blocos}>
              <Secao
                titulo="Timer no app"
                descricao={
                  g.modo === 'cuidar-tempo'
                    ? 'Mostra quanto falta para o próximo lembrete enquanto você usa o app.'
                    : 'Mostra quanto falta do tempo que você escolheu depois da pausa.'
                }
              >
                <OpcoesTimer grupo={g} onMudar={mudar} />
              </Secao>
            </Aparecer>
          ) : null}

          {/* Aplicativos */}
          <Secao
            titulo="Aplicativos"
            descricao={
              livre
                ? 'Os apps sem grupo ficam aqui. Para tirar um app do Livre, adicione-o a outro grupo.'
                : 'Cada app fica em um grupo só. Os que você tirar daqui voltam para o Livre.'
            }
          >
            <View style={styles.lista}>
              {g.apps.length ? (
                g.apps.map((id) => {
                  const app = appPorId(id);
                  return (
                    <View key={id} style={[styles.linhaAcao, { backgroundColor: cores.bg.raised }]}>
                      <IconeApp id={id} />
                      <Texto estilo="Texto/Médio" style={styles.flex}>
                        {app?.nome ?? id}
                      </Texto>
                      {livre ? null : (
                        <Pressable
                          onPress={() => mudar({ apps: g.apps.filter((x) => x !== id) })}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Tirar ${app?.nome ?? id} do grupo`}
                        >
                          <Icone nome="subtrair" tamanho={18} cor={cores.text.secondary} />
                        </Pressable>
                      )}
                    </View>
                  );
                })
              ) : (
                <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
                  {livre ? 'Todos os seus apps já estão em algum grupo.' : 'Nenhum app neste grupo ainda.'}
                </Texto>
              )}
              {livre ? null : (
                <Botao
                  rotulo="Adicionar apps"
                  estilo="secundario"
                  icone={(cor) => <Icone nome="adicionar" tamanho={20} cor={cor} />}
                  onPress={() => setFolha('apps')}
                />
              )}
            </View>
          </Secao>

          {novo || livre ? null : (
            <Pressable
              onPress={() => setFolha('desfazer')}
              accessibilityRole="button"
              style={styles.desfazer}
              hitSlop={8}
            >
              <Icone nome="lixeira" tamanho={18} cor={cores.feedback.error} />
              <Texto estilo="Texto/Botões e rótulos" cor={cores.feedback.error}>
                Desfazer grupo
              </Texto>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.rodape}>
        <Botao
          rotulo={novo ? 'Criar grupo' : 'Salvar'}
          corRotulo={cores.text['on-primary']}
          estado={nomeValido ? 'normal' : 'desabilitado'}
          onPress={salvar}
        />
      </View>

      <FolhaIcone
        visivel={folha === 'icone'}
        atual={g.icone}
        onFechar={() => setFolha(null)}
        onEscolher={(icone) => {
          mudar({ icone });
          setFolha(null);
        }}
      />
      <FolhaMensagem
        visivel={folha === 'mensagem'}
        atual={g.mensagem}
        onFechar={() => setFolha(null)}
        onEscolher={(mensagem) => {
          mudar({ mensagem });
          setFolha(null);
        }}
      />
      <FolhaApps
        visivel={folha === 'apps'}
        grupo={g}
        onFechar={() => setFolha(null)}
        onConfirmar={(apps) => {
          mudar({ apps });
          setFolha(null);
        }}
      />
      <Folha
        visivel={folha === 'desfazer'}
        onFechar={() => setFolha(null)}
        titulo="Desfazer este grupo?"
        descricao={`O grupo ${g.nome} some e os apps dele voltam para o Livre, com a regra do Livre.`}
      >
        <View style={styles.lista}>
          <Botao rotulo="Desfazer grupo" estado="erro" onPress={desfazer} />
          <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setFolha(null)} />
        </View>
      </Folha>
    </SafeAreaView>
  );
}

function Secao({
  titulo,
  descricao,
  atraso,
  children,
}: {
  titulo: string;
  descricao?: string;
  atraso?: number;
  children: ReactNode;
}) {
  const { cores } = useTema();
  return (
    <Aparecer atraso={atraso} style={styles.secao}>
      <View style={styles.cabecalho}>
        <Texto estilo="Títulos/Pequeno">{titulo}</Texto>
        {descricao ? (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            {descricao}
          </Texto>
        ) : null}
      </View>
      {children}
    </Aparecer>
  );
}

/** Opção de escolha única: card com título e descrição; o escolhido ganha a borda border/focus e o ponto. */
function Opcao({
  ativo,
  titulo,
  descricao,
  icone,
  onPress,
}: {
  ativo: boolean;
  titulo: string;
  descricao: string;
  icone?: ReactNode;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      style={({ pressed }) => [
        styles.opcao,
        {
          backgroundColor: cores.bg.raised,
          borderColor: ativo ? cores.border.focus : 'transparent',
          borderWidth: ativo ? borderWidth.thick : borderWidth.thin,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icone}
      <View style={styles.flex}>
        <Texto estilo="Texto/Botões e rótulos">{titulo}</Texto>
        {descricao ? (
          <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
            {descricao}
          </Texto>
        ) : null}
      </View>
      <View style={[styles.radio, { borderColor: ativo ? cores.border.focus : cores.border.subtle }]}>
        {ativo ? <View style={[styles.radioPonto, { backgroundColor: cores.action.primary.default }]} /> : null}
      </View>
    </Pressable>
  );
}

/** Círculo com o ícone da regra, no fundo do tom dela. */
function SeloModo({ modo }: { modo: Grupo['modo'] }) {
  const { cores } = useTema();
  const { tom, icone: I } = MODOS[modo];
  return (
    <View style={[styles.seloModo, { backgroundColor: fundoDoTom(cores, tom) }]}>
      <I width={16} height={16} corTraco={cores.text.primary} />
    </View>
  );
}

function Chips({
  valores,
  atual,
  rotulo,
  onEscolher,
}: {
  valores: number[];
  atual: number;
  rotulo: (v: number) => string;
  onEscolher: (v: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sangria} contentContainerStyle={styles.chips}>
      {valores.map((v) => (
        <Filtro key={v} rotulo={rotulo(v)} ativo={v === atual} onPress={() => onEscolher(v)} />
      ))}
    </ScrollView>
  );
}

/** Prévia (só visual) da tela de pausa: mensagem, contagem e a escolha do tempo no app. */
function PreviaPausa({ grupo }: { grupo: Grupo }) {
  const { cores } = useTema();
  return (
    <View style={[styles.previa, { backgroundColor: cores.bg.sunken, borderColor: cores.border.subtle }]}>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
        PRÉVIA DA PAUSA
      </Texto>
      <View style={[styles.contagem, { borderColor: cores.border.focus }]}>
        <Texto estilo="Títulos/Médio">{grupo.pausaSegundos}s</Texto>
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        {grupo.mensagem}
      </Texto>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
        Quanto tempo você precisa nesse app?
      </Texto>
      <View style={styles.temposNoApp}>
        {TEMPOS_NO_APP.map((t) => (
          <View key={t} style={[styles.tempo, { backgroundColor: cores.bg.raised }]}>
            <Texto estilo="Legenda/Pequena">{t} min</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

function FolhaIcone({
  visivel,
  atual,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  atual: Grupo['icone'];
  onFechar: () => void;
  onEscolher: (i: Grupo['icone']) => void;
}) {
  const { cores } = useTema();
  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Ícone do grupo">
      <View style={styles.gradeIcones}>
        {ICONES_GRUPO.map((i) => (
          <Pressable
            key={i}
            onPress={() => onEscolher(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: i === atual }}
            accessibilityLabel={i}
            style={[
              styles.opcaoIcone,
              { backgroundColor: i === atual ? cores.action.primary.default : cores.bg.sunken },
            ]}
          >
            <Icone nome={i} tamanho={24} cor={i === atual ? cores.text['on-primary'] : undefined} />
          </Pressable>
        ))}
      </View>
    </Folha>
  );
}

function FolhaMensagem({
  visivel,
  atual,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  atual: string;
  onFechar: () => void;
  onEscolher: (m: string) => void;
}) {
  const propria = MENSAGENS_PRONTAS.includes(atual) ? '' : atual;
  const [texto, setTexto] = useState(propria);
  return (
    <Folha
      visivel={visivel}
      onFechar={onFechar}
      titulo="Mensagem da pausa"
      descricao="Aparece na pausa, antes de abrir o app."
    >
      <View style={styles.lista}>
        {MENSAGENS_PRONTAS.map((m) => (
          <Opcao key={m} ativo={m === atual} titulo={m} descricao="" onPress={() => onEscolher(m)} />
        ))}
        <CampoTexto
          rotulo="Ou escreva a sua"
          placeholder="Ex.: Lembra do que você combinou com você?"
          value={texto}
          onChangeText={setTexto}
          maxLength={80}
        />
        <Botao
          rotulo="Usar minha mensagem"
          estilo="secundario"
          estado={texto.trim() ? 'normal' : 'desabilitado'}
          onPress={() => texto.trim() && onEscolher(texto.trim())}
        />
      </View>
    </Folha>
  );
}

/** Adicionar apps: todos os apps, marcando os do grupo; os de outro grupo mostram de onde vão sair. */
function FolhaApps({
  visivel,
  grupo,
  onFechar,
  onConfirmar,
}: {
  visivel: boolean;
  grupo: Grupo;
  onFechar: () => void;
  onConfirmar: (apps: string[]) => void;
}) {
  const { cores } = useTema();
  const todos = useApps();
  const [escolhidos, setEscolhidos] = useState(grupo.apps);
  const [busca, setBusca] = useState('');
  // Reabre com os apps atuais do grupo.
  const [aberta, setAberta] = useState(visivel);
  if (visivel !== aberta) {
    setAberta(visivel);
    if (visivel) {
      setEscolhidos(grupo.apps);
      setBusca('');
    }
  }
  // No aparelho há dezenas de apps: os do grupo e os já acompanhados vêm primeiro (a ordem
  // é fixada ao abrir, para a lista não pular enquanto a pessoa marca).
  const ordem = useMemo(() => {
    const acompanhados = new Set(appsAcompanhados());
    const peso = (id: string) => (grupo.apps.includes(id) ? 0 : acompanhados.has(id) ? 1 : 2);
    return [...todos].sort((a, b) => peso(a.id) - peso(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, aberta]);
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const lista = termo ? ordem.filter((a) => a.nome.toLocaleLowerCase('pt-BR').includes(termo)) : ordem;
  const acompanhados = new Set(appsAcompanhados());
  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Aplicativos" descricao="Cada app fica em um grupo só.">
      {comAppsDoAparelho ? (
        <CampoTexto value={busca} onChangeText={setBusca} placeholder="Buscar app" acessibilidade="Buscar app" />
      ) : null}
      <ScrollView style={styles.listaApps} keyboardShouldPersistTaps="handled">
        <View style={styles.lista}>
          {!todos.length ? (
            <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary}>
              Carregando os apps do celular…
            </Texto>
          ) : null}
          {lista.map((a) => {
            const marcado = escolhidos.includes(a.id);
            const outro = grupoDoApp(a.id, grupo.id);
            const ondeFica = acompanhados.has(a.id) ? 'No Livre' : 'Sem pausa';
            return (
              <Pressable
                key={a.id}
                onPress={() => setEscolhidos((e) => (marcado ? e.filter((x) => x !== a.id) : [...e, a.id]))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcado }}
                style={[
                  styles.linhaAcao,
                  {
                    backgroundColor: cores.bg.raised,
                    borderWidth: borderWidth.thin,
                    borderColor: marcado ? cores.border.focus : 'transparent',
                  },
                ]}
              >
                <IconeApp id={a.id} />
                <View style={styles.flex}>
                  <Texto estilo="Texto/Médio">{a.nome}</Texto>
                  <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                    {outro ? (marcado ? `Sai de ${outro.nome}` : `Em ${outro.nome}`) : marcado ? 'Neste grupo' : ondeFica}
                  </Texto>
                </View>
                <View
                  style={[
                    styles.caixa,
                    {
                      borderColor: marcado ? cores.action.primary.default : cores.border.subtle,
                      backgroundColor: marcado ? cores.action.primary.default : 'transparent',
                    },
                  ]}
                >
                  {marcado ? <Icone nome="selo" tamanho={14} cor={cores.text['on-primary']} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.confirmar}>
        <Botao
          rotulo={`Confirmar (${escolhidos.length})`}
          corRotulo={cores.text['on-primary']}
          onPress={() => onConfirmar(escolhidos)}
        />
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[32], paddingBottom: space[48] },
  identidade: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  iconeGrande: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  lapis: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secao: { gap: space[12] },
  cabecalho: { gap: space[4] },
  blocos: { gap: space[32] },
  lista: { gap: space[8] },
  seloModo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: inset.md,
    paddingVertical: space[12],
    borderRadius: radius.card,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: borderWidth.thick, alignItems: 'center', justifyContent: 'center' },
  radioPonto: { width: 10, height: 10, borderRadius: 5 },
  nota: { padding: inset.md, borderRadius: radius.card },
  sangria: { marginHorizontal: -inset.lg },
  chips: { paddingHorizontal: inset.lg, gap: space[8] },
  linhaAcao: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: inset.md,
    paddingVertical: space[8],
    borderRadius: radius.card,
  },
  previa: {
    alignItems: 'center',
    gap: space[12],
    padding: inset.lg,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
  contagem: { width: 64, height: 64, borderRadius: 32, borderWidth: borderWidth.thick, alignItems: 'center', justifyContent: 'center' },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  temposNoApp: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[8] },
  tempo: { paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: radius.full },
  desfazer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], paddingVertical: space[8] },
  rodape: { paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
  gradeIcones: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12], justifyContent: 'center' },
  opcaoIcone: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  listaApps: { maxHeight: 420 },
  caixa: { width: 22, height: 22, borderRadius: 6, borderWidth: borderWidth.thick, alignItems: 'center', justifyContent: 'center' },
  confirmar: { paddingTop: space[16] },
});
