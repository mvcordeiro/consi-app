import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appPorId, comAppsDoAparelho, useApps } from '@/data/apps';
import {
  appsAcompanhados,
  apagarGrupo,
  grupoDoApp,
  ID_LIVRE,
  INTERVALOS,
  MENSAGENS_PRONTAS,
  MODOS,
  ORDEM_MODOS,
  PAUSA_MAXIMA,
  PAUSA_MINIMA,
  PAUSAS,
  salvarGrupo,
  type AoIgnorar,
  type Grupo,
} from '@/data/gruposHome';
import {
  autoresDoPeriodo,
  frasesDoPeriodo,
  nomeDoPeriodo,
  PERIODOS,
  sortearFrase,
  type PeriodoFilosofico,
} from '@/data/frases';
import { borderWidth, inset, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { CabecalhoVoltar } from '../CabecalhoVoltar';
import { CampoTexto } from '../CampoTexto';
import { fundoDoTom } from '../Etiqueta';
import { Filtro } from '../Filtro';
import { Folha } from '../Folha';
import { IconeApp } from '../home/Grupos';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

import { FolhaIcone } from './FolhaIcone';
import { OpcoesTimer } from './OpcoesTimer';

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
  const [folha, setFolha] = useState<'icone' | 'mensagem' | 'apps' | 'desfazer' | 'pausa' | null>(null);
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
                  extra={{
                    rotulo: PAUSAS.includes(g.pausaSegundos) ? 'Personalizar' : `${g.pausaSegundos} s · editar`,
                    ativo: !PAUSAS.includes(g.pausaSegundos),
                    onPress: () => setFolha('pausa'),
                  }}
                />
              </Secao>
              <Secao titulo="Mensagem da pausa">
                <Pressable
                  onPress={() => setFolha('mensagem')}
                  accessibilityRole="button"
                  accessibilityLabel={`Mensagem da pausa: ${g.mensagemFilosofica ? `frases filosóficas, ${nomeDoPeriodo(g.periodoFilosofico)}` : g.mensagem}. Trocar`}
                  style={({ pressed }) => [
                    styles.linhaAcao,
                    { backgroundColor: cores.bg.raised, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Icone nome="aspas" tamanho={20} />
                  <View style={styles.flex}>
                    <Texto estilo="Texto/Médio">
                      {g.mensagemFilosofica ? 'Frases filosóficas, uma a cada pausa' : g.mensagem}
                    </Texto>
                    {g.mensagemFilosofica ? (
                      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                        {nomeDoPeriodo(g.periodoFilosofico)}
                      </Texto>
                    ) : null}
                  </View>
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
        filosofica={!!g.mensagemFilosofica}
        periodo={g.periodoFilosofico ?? null}
        onFechar={() => setFolha(null)}
        onEscolher={(mensagem, periodo) => {
          mudar(
            mensagem === null
              ? { mensagemFilosofica: true, periodoFilosofico: periodo ?? null }
              : { mensagem, mensagemFilosofica: false },
          );
          setFolha(null);
        }}
      />
      <FolhaPausa
        visivel={folha === 'pausa'}
        atual={g.pausaSegundos}
        onFechar={() => setFolha(null)}
        onEscolher={(pausaSegundos) => {
          mudar({ pausaSegundos });
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
  fundo,
  acessorio,
}: {
  ativo: boolean;
  titulo: string;
  descricao: string;
  icone?: ReactNode;
  onPress: () => void;
  /** Fundo do card. Nas folhas (bg/raised), use bg/base para ter contraste. */
  fundo?: string;
  /** Um botão a mais antes do rádio (ex.: o "•••" das frases filosóficas). */
  acessorio?: ReactNode;
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
          backgroundColor: fundo ?? cores.bg.raised,
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
      {acessorio}
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
  extra,
}: {
  valores: number[];
  atual: number;
  rotulo: (v: number) => string;
  onEscolher: (v: number) => void;
  /** Um chip a mais no fim (ex.: "Personalizar"). */
  extra?: { rotulo: string; ativo: boolean; onPress: () => void };
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sangria} contentContainerStyle={styles.chips}>
      {valores.map((v) => (
        <Filtro key={v} rotulo={rotulo(v)} ativo={v === atual} onPress={() => onEscolher(v)} />
      ))}
      {extra ? <Filtro rotulo={extra.rotulo} ativo={extra.ativo} onPress={extra.onPress} /> : null}
    </ScrollView>
  );
}

/** Prévia (só visual) da tela de pausa: o rótulo acima do quadro, e nele a contagem e a mensagem. */
function PreviaPausa({ grupo }: { grupo: Grupo }) {
  const { cores } = useTema();
  // Com as frases filosóficas, a prévia mostra uma do período escolhido (outra a cada troca).
  const periodo = grupo.periodoFilosofico ?? null;
  const exemplo = useMemo(() => sortearFrase(periodo), [periodo]);
  return (
    <View style={styles.previaBloco}>
    <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
      PRÉVIA DA PAUSA
    </Texto>
    <View style={[styles.previa, { backgroundColor: cores.bg.sunken, borderColor: cores.border.subtle }]}>
      <View style={[styles.contagem, { borderColor: cores.border.focus }]}>
        <Texto estilo="Títulos/Médio">{grupo.pausaSegundos}s</Texto>
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        {grupo.mensagemFilosofica ? exemplo.texto : grupo.mensagem}
      </Texto>
      {grupo.mensagemFilosofica ? (
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.centro}>
          {exemplo.autor}
        </Texto>
      ) : null}
    </View>
    </View>
  );
}

/** Tempo de pausa personalizado: de 1 em 1 ou de 5 em 5 segundos, entre 3 s e 5 min. */
function FolhaPausa({
  visivel,
  atual,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  atual: number;
  onFechar: () => void;
  onEscolher: (s: number) => void;
}) {
  const { cores } = useTema();
  const [valor, setValor] = useState(atual);
  const [aberta, setAberta] = useState(visivel);
  if (visivel !== aberta) {
    setAberta(visivel);
    if (visivel) setValor(atual);
  }
  const somar = (d: number) => setValor((v) => Math.min(PAUSA_MAXIMA, Math.max(PAUSA_MINIMA, v + d)));
  const rotulo = valor >= 60 ? `${Math.floor(valor / 60)} min${valor % 60 ? ` ${valor % 60} s` : ''}` : `${valor} s`;
  return (
    <Folha
      visivel={visivel}
      onFechar={onFechar}
      titulo="Tempo de pausa"
      descricao={`Quanto tempo você espera antes de abrir o app. No mínimo ${PAUSA_MINIMA} segundos.`}
    >
      <View style={styles.seletor}>
        {[-5, -1].map((d) => (
          <Pressable
            key={d}
            onPress={() => somar(d)}
            disabled={valor <= PAUSA_MINIMA}
            accessibilityRole="button"
            accessibilityLabel={`Menos ${-d} segundos`}
            style={[styles.passoPausa, { backgroundColor: cores.bg.base, opacity: valor <= PAUSA_MINIMA ? 0.4 : 1 }]}
          >
            <Texto estilo="Texto/Botões e rótulos">{d}</Texto>
          </Pressable>
        ))}
        <Texto estilo="Títulos/Grande" style={styles.valorPausa} accessibilityLiveRegion="polite">
          {rotulo}
        </Texto>
        {[1, 5].map((d) => (
          <Pressable
            key={d}
            onPress={() => somar(d)}
            disabled={valor >= PAUSA_MAXIMA}
            accessibilityRole="button"
            accessibilityLabel={`Mais ${d} segundos`}
            style={[styles.passoPausa, { backgroundColor: cores.bg.base, opacity: valor >= PAUSA_MAXIMA ? 0.4 : 1 }]}
          >
            <Texto estilo="Texto/Botões e rótulos">+{d}</Texto>
          </Pressable>
        ))}
      </View>
      <Botao rotulo={`Usar ${rotulo}`} onPress={() => onEscolher(valor)} />
    </Folha>
  );
}

function FolhaMensagem({
  visivel,
  atual,
  filosofica,
  periodo,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  atual: string;
  /** As frases filosóficas estão escolhidas. */
  filosofica: boolean;
  /** Período das frases filosóficas (null = todos). */
  periodo: PeriodoFilosofico | null;
  onFechar: () => void;
  /** null = frases filosóficas, do `periodo` escolhido (null = todos). */
  onEscolher: (m: string | null, periodo?: PeriodoFilosofico | null) => void;
}) {
  const { cores } = useTema();
  const propria = MENSAGENS_PRONTAS.includes(atual) ? '' : atual;
  const [texto, setTexto] = useState(propria);
  // Menu dos períodos (aberto pelo "•••" das frases); fecha sempre que a folha reabre.
  const [periodos, setPeriodos] = useState(false);
  const [aberta, setAberta] = useState(visivel);
  if (visivel !== aberta) {
    setAberta(visivel);
    if (visivel) setPeriodos(false);
  }
  const descricaoFrases = filosofica
    ? `${nomeDoPeriodo(periodo)} · uma frase diferente a cada pausa`
    : 'Uma frase diferente a cada pausa. Toque em ••• para escolher o período.';
  return (
    <Folha
      visivel={visivel}
      onFechar={onFechar}
      titulo="Mensagem da pausa"
      descricao="Aparece na pausa, antes de abrir o app."
    >
      <ScrollView style={styles.listaMensagens} keyboardShouldPersistTaps="handled">
      <View style={styles.lista}>
        <Opcao
          ativo={filosofica}
          titulo="Frases filosóficas"
          descricao={descricaoFrases}
          icone={<Icone nome="aspas" tamanho={20} />}
          fundo={cores.bg.base}
          onPress={() => onEscolher(null, periodo)}
          acessorio={
            <Pressable
              onPress={() => setPeriodos((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Escolher o período das frases"
              accessibilityState={{ expanded: periodos }}
              style={({ pressed }) => [
                styles.botaoMais,
                { backgroundColor: periodos || pressed ? cores.bg.raised : 'transparent' },
              ]}
            >
              <Icone nome="menu-horizontal" tamanho={18} cor={cores.icon.primary} />
            </Pressable>
          }
        />
        {periodos ? (
          <Aparecer style={[styles.menuPeriodos, { backgroundColor: cores.bg.base, borderColor: cores.border.subtle }]}>
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.menuTitulo}>
              PERÍODO DAS FRASES
            </Texto>
            <ItemPeriodo
              titulo="Todos os períodos"
              descricao={`${frasesDoPeriodo(null).length} frases, de Heráclito a Camus`}
              ativo={filosofica && !periodo}
              onPress={() => onEscolher(null, null)}
            />
            {PERIODOS.map((p) => (
              <ItemPeriodo
                key={p.id}
                titulo={p.nome}
                descricao={`${p.quando} · ${autoresDoPeriodo(p.id).join(', ')}…`}
                ativo={filosofica && periodo === p.id}
                onPress={() => onEscolher(null, p.id)}
              />
            ))}
          </Aparecer>
        ) : null}
        {MENSAGENS_PRONTAS.map((m) => (
          <Opcao key={m} ativo={!filosofica && m === atual} titulo={m} descricao="" fundo={cores.bg.base} onPress={() => onEscolher(m)} />
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
      </ScrollView>
    </Folha>
  );
}

/** Uma linha do menu de períodos: nome, época e autores, com o selo no escolhido. */
function ItemPeriodo({
  titulo,
  descricao,
  ativo,
  onPress,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      style={({ pressed }) => [
        styles.itemPeriodo,
        { backgroundColor: ativo ? cores.bg.selected : pressed ? cores.bg.raised : 'transparent' },
      ]}
    >
      <View style={styles.flex}>
        <Texto estilo="Texto/Médio">{titulo}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} numberOfLines={1}>
          {descricao}
        </Texto>
      </View>
      {ativo ? <Icone nome="selo" tamanho={18} cor={cores.icon.primary} /> : null}
    </Pressable>
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
                    backgroundColor: cores.bg.base,
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
  previaBloco: { gap: space[8] },
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
  desfazer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], paddingVertical: space[8] },
  rodape: { paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
  listaMensagens: { maxHeight: 460 },
  botaoMais: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  menuPeriodos: { padding: space[8], gap: space[2], borderRadius: radius.card, borderWidth: borderWidth.thin },
  menuTitulo: { paddingHorizontal: space[8], paddingTop: space[4], paddingBottom: space[4] },
  itemPeriodo: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: space[8],
    paddingVertical: space[8],
    borderRadius: radius.md,
  },
  seletor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8] },
  passoPausa: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  valorPausa: { minWidth: 110, textAlign: 'center' },
  gradeIcones: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12], justifyContent: 'center' },
  opcaoIcone: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  listaApps: { maxHeight: 420 },
  caixa: { width: 22, height: 22, borderRadius: 6, borderWidth: borderWidth.thick, alignItems: 'center', justifyContent: 'center' },
  confirmar: { paddingTop: space[16] },
});
