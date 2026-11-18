import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alternancia, Botao, CabecalhoVoltar, CampoTexto, Filtro, Folha, Icone, Texto, type NomeIcone } from '@/components';
import { Aparecer } from '@/components/animacao';
import { BarraBlocos, EditorBlocos, useEditorBlocos } from '@/components/blocos';
import { CardSugestao, IconeHobby } from '@/components/hobbies';
import { catalogoHobbies, hobbyInfo, type AtividadeMinha, type HobbyId, type Permissoes, type Visibilidade } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { borderWidth, inset, primitivas, radius, space, tipografia, useTema } from '@/theme';

const MINUTOS = [5, 10, 15, 30, 45, 60, 90, 120];
const MAX_RESUMO = 70;

/** "30 min", "1 h", "1h30", "2 h". */
function rotuloMinutos(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}` : `${h} h`;
}
/** Ícones que a pessoa pode escolher: os dos hobbies e alguns gerais do Design System. */
const ICONES: NomeIcone[] = [
  ...new Set<NomeIcone>([
    ...catalogoHobbies.map((h) => h.icone).filter((i) => i !== 'lampada'),
    'lampada',
    'rosto-positivo',
    'gesto-comemoracao',
    'beijo-coracao',
    'calendario',
    'caderno',
  ]),
];

/**
 * Criar ou editar uma atividade (sem design no Figma). Abre por três caminhos:
 * "Sugerir atividade +" em Para você (publica para a comunidade), o "+" de Suas atividades
 * (só para a pessoa) e "Editar" / "Editar (remix)" de uma atividade.
 * O conteúdo usa o editor de blocos (estilo Notion); a pessoa escolhe capa, ícone, hobby,
 * tempo, quem pode ver e o que os outros podem fazer (comentar, remixar, ver o nome dela).
 */
export default function CriarAtividade() {
  const h = useHobbies();
  const params = useLocalSearchParams<{ id?: string; visibilidade?: Visibilidade; hobby?: HobbyId }>();
  const existente = params.id ? h.item(params.id)?.minha : undefined;
  // Espera o estado carregar para preencher com a atividade certa.
  if (!h.carregado) return null;
  return <Formulario key={existente?.id ?? 'nova'} existente={existente} params={params} />;
}

function Formulario({
  existente,
  params,
}: {
  existente: AtividadeMinha | undefined;
  params: { visibilidade?: Visibilidade; hobby?: HobbyId };
}) {
  const { cores } = useTema();
  const h = useHobbies();
  const editando = !!existente;
  const remix = !!existente && !existente.criadaPorMim;

  const [hobby, setHobby] = useState<HobbyId>(existente?.hobby ?? params.hobby ?? h.hobbies[0]);
  const [icone, setIcone] = useState<NomeIcone | undefined>(existente?.icone);
  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [resumo, setResumo] = useState(existente?.resumo ?? '');
  const [minutos, setMinutos] = useState(existente?.minutos ?? 30);
  const [capa, setCapa] = useState<string | undefined>(typeof existente?.capa === 'string' ? existente.capa : undefined);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(existente?.visibilidade ?? params.visibilidade ?? 'privada');
  const [permissoes, setPermissoes] = useState<Permissoes>(
    existente?.permissoes ?? { comentarios: true, remix: true, mostrarAutor: true },
  );
  const [escolhendoIcone, setEscolhendoIcone] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const editor = useEditorBlocos(existente?.conteudo ?? []);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTeclado(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTeclado(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const conteudo = editor.blocos.filter((b) => b.tipo === 'imagem' || b.tipo === 'divisor' || b.texto?.trim());
  const primeiroTexto = conteudo.find((b) => b.texto?.trim())?.texto?.trim() ?? '';
  const resumoFinal = (resumo.trim() || primeiroTexto).slice(0, MAX_RESUMO);
  const valido = titulo.trim().length > 2;
  const publicar = visibilidade === 'comunidade';
  const opcoesHobby = [...new Set([...h.hobbies, hobby])];

  const escolherCapa = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (!r.canceled && r.assets[0]) setCapa(r.assets[0].uri);
  };

  const salvar = () => {
    if (!valido) return;
    const dados = {
      hobby,
      icone,
      titulo: titulo.trim(),
      resumo: resumoFinal,
      conteudo,
      minutos,
      capa,
      permissoes,
      visibilidade: remix ? 'privada' : visibilidade,
    } as const;
    if (existente) {
      h.atualizar(existente.id, dados);
      router.back();
    } else {
      const nova = h.criar(dados);
      router.replace({ pathname: '/hobby/detalhe', params: { id: nova.id } });
    }
  };

  const rotulo = editando ? (remix ? 'Remix' : 'Editar atividade') : publicar ? 'Sugerir atividade' : 'Nova atividade';
  const acao = editando ? 'Salvar alterações' : publicar ? 'Publicar sugestão' : 'Criar atividade';

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <View style={styles.margemTopo}>
          <CabecalhoVoltar
            rotulo={rotulo}
            direita={
              <Pressable onPress={() => setPrevia(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ver prévia do card">
                <Icone nome="olho" />
              </Pressable>
            }
          />
        </View>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {remix ? (
            <View style={[styles.aviso, { backgroundColor: cores.bg.sunken }]}>
              <Icone nome="repetir" />
              <Texto estilo="Texto/Pequeno" style={styles.flex}>
                {`Você está fazendo um remix da atividade de ${existente?.remixDe?.usuario ?? existente?.autor.usuario}. As mudanças ficam só na sua cópia.`}
              </Texto>
            </View>
          ) : null}

          {/* Capa */}
          <Aparecer>
            {capa ? (
              <View>
                <Image source={{ uri: capa }} style={[styles.capa, { backgroundColor: cores.bg.raised }]} />
                <View style={styles.capaAcoes}>
                  <BotaoSobreImagem rotulo="Trocar capa" icone="anexar-imagem" onPress={escolherCapa} />
                  <BotaoSobreImagem rotulo="Remover capa" icone="excluir" onPress={() => setCapa(undefined)} />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={escolherCapa}
                accessibilityRole="button"
                style={[styles.capaVazia, { borderColor: cores.border.subtle }]}
              >
                <Icone nome="anexar-imagem" cor={cores.text.secondary} />
                <Texto estilo="Texto/Botões e rótulos" cor={cores.text.secondary}>
                  Adicionar capa (opcional)
                </Texto>
              </Pressable>
            )}
          </Aparecer>

          {/* Ícone e hobby */}
          <Aparecer atraso={60} style={styles.linhaIcone}>
            <Pressable
              onPress={() => setEscolhendoIcone(true)}
              accessibilityRole="button"
              accessibilityLabel="Escolher ícone"
              style={[styles.icone, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}
            >
              <IconeHobby hobby={hobby} icone={icone} caixa={32} />
              <View style={[styles.lapis, { backgroundColor: cores.action.primary.default }]}>
                <Icone nome="lapis" tamanho={12} cor={cores.text['on-primary']} />
              </View>
            </Pressable>
            <View style={styles.flex}>
              <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                HOBBY
              </Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {opcoesHobby.map((hb) => (
                  <Filtro
                    key={hb}
                    rotulo={hobbyInfo(hb).nome}
                    ativo={hb === hobby}
                    onPress={() => setHobby(hb)}
                    icone={(cor) => <IconeHobby hobby={hb} caixa={16} cor={cor} />}
                  />
                ))}
              </ScrollView>
            </View>
          </Aparecer>

          {/* Título e resumo */}
          <Aparecer atraso={120} style={styles.bloco}>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Dê um nome para a atividade"
              placeholderTextColor={cores.text.tertiary}
              multiline
              maxLength={90}
              accessibilityLabel="Título"
              style={[tipografia['Títulos/Grande'], styles.titulo, { color: cores.text.primary }]}
            />
            <CampoTexto
              rotulo={`Resumo do card · ${resumo.length}/${MAX_RESUMO}`}
              placeholder={primeiroTexto ? primeiroTexto.slice(0, 48) + '…' : 'Uma frase que convide a fazer'}
              value={resumo}
              onChangeText={setResumo}
              maxLength={MAX_RESUMO}
            />
          </Aparecer>

          {/* Conteúdo em blocos */}
          <Aparecer atraso={180} style={styles.bloco}>
            <View style={styles.rotuloSecao}>
              <Texto estilo="Títulos/Pequeno">Conteúdo</Texto>
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                Digite / para escolher um bloco · # título · - lista · [] tarefa
              </Texto>
            </View>
            <View style={[styles.editor, { borderColor: cores.border.subtle }]}>
              <EditorBlocos editor={editor} />
            </View>
          </Aparecer>

          {/* Tempo */}
          <Aparecer atraso={220} style={styles.bloco}>
            <Texto estilo="Títulos/Pequeno">Quanto tempo leva?</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.sangria}>
              {MINUTOS.map((m) => (
                <Filtro
                  key={m}
                  rotulo={rotuloMinutos(m)}
                  ativo={m === minutos}
                  onPress={() => setMinutos(m)}
                  icone={(cor) => <Icone nome="relogio" tamanho={16} cor={cor} />}
                />
              ))}
            </ScrollView>
          </Aparecer>

          {/* Visibilidade e permissões */}
          {remix ? null : (
            <Aparecer atraso={260} style={styles.bloco}>
              <Texto estilo="Títulos/Pequeno">Quem pode ver</Texto>
              <View style={styles.opcoes}>
                <Opcao
                  icone="cadeado"
                  titulo="Só eu"
                  descricao="Fica nas suas atividades."
                  ativa={visibilidade === 'privada'}
                  onPress={() => setVisibilidade('privada')}
                />
                <Opcao
                  icone="rede-mundial"
                  titulo="Comunidade"
                  descricao={`Aparece em Para você para quem curte ${hobbyInfo(hobby).nome}.`}
                  ativa={visibilidade === 'comunidade'}
                  onPress={() => setVisibilidade('comunidade')}
                />
              </View>
              {publicar ? (
                <View style={[styles.permissoes, { backgroundColor: cores.bg.raised }]}>
                  <Permissao
                    icone="conversa"
                    titulo="Permitir comentários"
                    descricao="Outras pessoas podem conversar sobre a atividade."
                    ligado={permissoes.comentarios}
                    onMudar={(v) => setPermissoes((p) => ({ ...p, comentarios: v }))}
                  />
                  <Permissao
                    icone="repetir"
                    titulo="Permitir remix"
                    descricao="Quem adicionar pode editar a própria cópia."
                    ligado={permissoes.remix}
                    onMudar={(v) => setPermissoes((p) => ({ ...p, remix: v }))}
                  />
                  <Permissao
                    icone="olho"
                    titulo="Mostrar meu nome"
                    descricao="Desligado, aparece como “Alguém da comunidade”."
                    ligado={permissoes.mostrarAutor}
                    onMudar={(v) => setPermissoes((p) => ({ ...p, mostrarAutor: v }))}
                  />
                </View>
              ) : null}
            </Aparecer>
          )}
        </ScrollView>

        {teclado && editor.focado ? (
          <BarraBlocos editor={editor} />
        ) : (
          <View style={styles.rodape}>
            {!valido ? (
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                Dê um nome para continuar.
              </Texto>
            ) : null}
            <Botao rotulo={acao} corRotulo={cores.text['on-primary']} disabled={!valido} onPress={salvar} />
          </View>
        )}
      </KeyboardAvoidingView>

      <Folha visivel={escolhendoIcone} onFechar={() => setEscolhendoIcone(false)} titulo="Ícone da atividade">
        <ScrollView style={styles.gradeRolagem} contentContainerStyle={styles.grade}>
          <Pressable
            onPress={() => {
              setIcone(undefined);
              setEscolhendoIcone(false);
            }}
            style={[styles.celula, { borderColor: !icone ? cores.border.focus : 'transparent', backgroundColor: cores.bg.base }]}
            accessibilityLabel="Usar o ícone do hobby"
          >
            <IconeHobby hobby={hobby} caixa={24} />
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              Hobby
            </Texto>
          </Pressable>
          {ICONES.map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setIcone(n);
                setEscolhendoIcone(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={n}
              style={[styles.celula, { borderColor: icone === n ? cores.border.focus : 'transparent', backgroundColor: cores.bg.base }]}
            >
              <Icone nome={n} />
            </Pressable>
          ))}
        </ScrollView>
      </Folha>

      <Folha visivel={previa} onFechar={() => setPrevia(false)} titulo="Prévia do card" descricao="Assim ela aparece em Para você.">
        <View style={[styles.previa, { backgroundColor: cores.bg.raised }]} pointerEvents="none">
          <CardSugestao
            sugestao={{
              id: 'previa',
              hobby,
              icone,
              titulo: titulo || 'Dê um nome para a atividade',
              resumo: resumoFinal || 'Uma frase que convide a fazer',
              conteudo,
              minutos,
              autor: { usuario: 'Você', iniciais: 'EU' },
              quando: 'agora',
              permissoes,
              totalComentarios: 0,
            }}
            totalComentarios={0}
            onIgnorar={() => {}}
            onAceitar={() => {}}
            onConversa={() => {}}
            onMais={() => {}}
          />
        </View>
      </Folha>
    </SafeAreaView>
  );
}

function Opcao({
  icone,
  titulo,
  descricao,
  ativa,
  onPress,
}: {
  icone: NomeIcone;
  titulo: string;
  descricao: string;
  ativa: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativa }}
      style={[
        styles.opcao,
        {
          backgroundColor: ativa ? cores.bg.raised : 'transparent',
          borderColor: cores.border.focus,
          borderWidth: ativa ? borderWidth.thick : borderWidth.thin,
        },
      ]}
    >
      <Icone nome={icone} />
      <Texto estilo="Texto/Botões e rótulos">{titulo}</Texto>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
        {descricao}
      </Texto>
    </Pressable>
  );
}

function Permissao({
  icone,
  titulo,
  descricao,
  ligado,
  onMudar,
}: {
  icone: NomeIcone;
  titulo: string;
  descricao: string;
  ligado: boolean;
  onMudar: (v: boolean) => void;
}) {
  const { cores } = useTema();
  return (
    <View style={styles.permissao}>
      <Icone nome={icone} />
      <View style={styles.flex}>
        <Texto estilo="Texto/Botões e rótulos">{titulo}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
          {descricao}
        </Texto>
      </View>
      <Alternancia ligado={ligado} onMudar={onMudar} rotulo={titulo} />
    </View>
  );
}

/** Botão redondo sobre a capa, em bg/scrim com ícone branco. */
function BotaoSobreImagem({ rotulo, icone, onPress }: { rotulo: string; icone: NomeIcone; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={[styles.sobreImagem, { backgroundColor: cores.bg.scrim }]}
    >
      <Icone nome={icone} tamanho={18} cor={primitivas.neutral[0]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[32], paddingBottom: space[48] },
  sangria: { marginHorizontal: -inset.lg, paddingHorizontal: inset.lg },
  aviso: { flexDirection: 'row', gap: space[12], padding: inset.md, borderRadius: radius.md },
  capa: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card },
  capaAcoes: { position: 'absolute', right: space[12], bottom: space[12], flexDirection: 'row', gap: space[8] },
  sobreImagem: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  capaVazia: {
    height: 96,
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
  },
  linhaIcone: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  icone: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lapis: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: space[8], paddingTop: space[8] },
  bloco: { gap: space[16] },
  titulo: { padding: 0, outlineStyle: 'none' } as object,
  rotuloSecao: { gap: space[4] },
  editor: { padding: inset.md, borderRadius: radius.card, borderWidth: borderWidth.thin, minHeight: 160 },
  opcoes: { flexDirection: 'row', gap: space[12] },
  opcao: { flex: 1, gap: space[8], padding: inset.md, borderRadius: radius.card },
  permissoes: { padding: inset.md, borderRadius: radius.card, gap: space[20] },
  permissao: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  rodape: { gap: space[8], paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
  centro: { textAlign: 'center' },
  gradeRolagem: { maxHeight: 380 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  celula: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: borderWidth.thick,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  previa: { borderRadius: radius.card },
});
