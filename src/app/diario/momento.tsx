import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, Etiqueta, Icone, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { ChevronEsquerda } from '@/components/diario/assets';
import { PlayerAudio } from '@/components/diario/Audio';
import { useAvisoPendente } from '@/components/diario/avisoPendente';
import { TextoComDestaques } from '@/components/diario/CampoMomento';
import { FotoAnexada, VisualizarFoto } from '@/components/diario/Fotos';
import { Premo } from '@/components/diario/Premo';
import { emocaoPorId } from '@/data/emocoes';
import { diaLongo, editado, emAtual, hora, useMomentos, type Momento } from '@/data/momentos';
import { space, useTema } from '@/theme';

/** De onde o momento veio, para a legenda do pé da entrada. */
function origemDoMomento(m: Momento) {
  if (m.origem === 'pausa') return 'Registrado numa pausa';
  if (m.origem === 'home') return 'Registrado no Início';
  if (m.origem === 'hobby') return 'Ao finalizar uma atividade';
  if (m.origem === 'widget') return 'Registrado pelo widget';
  return 'Escrito no Diário';
}

/**
 * Entrada aberta: o momento sozinho, para ler. A mesma tela para quem chega pela lista
 * ou pelos "Momentos do dia" da linha do tempo. Mostra o Premo da emoção, o nome, quando foi,
 * os marcadores, o texto com os destaques e os anexos. Editar é discreto, no canto
 * (lápis), e leva para a tela única de edição (/diario/editar).
 */
export default function EntradaMomento() {
  const { cores } = useTema();
  const { em } = useLocalSearchParams<{ em: string }>();
  const todos = useMomentos();
  const momento = todos.find((m) => m.em === emAtual(Number(em)));
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [foto, setFoto] = useState<string | null>(null);

  // volta da edição: "Alterações salvas" com o desfazer
  useAvisoPendente((a) => mostrarAviso(a.titulo, a.desfazer ? { rotulo: 'Desfazer', onPress: a.desfazer } : undefined));

  const editar = () => momento && router.push({ pathname: '/diario/editar', params: { em: String(momento.em) } });

  if (!momento) {
    return (
      <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.sunken }]}>
        <Cabecalho />
        <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
          Esse momento não está mais no seu diário.
        </Texto>
      </SafeAreaView>
    );
  }

  const data = new Date(momento.em);
  const fotos = momento.anexos?.filter((a) => a.tipo === 'foto') ?? [];
  const audios = momento.anexos?.filter((a) => a.tipo === 'audio') ?? [];

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.sunken }]} edges={['top', 'bottom', 'left', 'right']}>
      <Cabecalho titulo={diaLongo(data)} onEditar={editar} />

      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <Aparecer escalaInicial={0.85} deslocamento={0} duracao={700} style={styles.premo}>
          <Premo id={momento.id} tamanho={102} flutuar />
        </Aparecer>
        <Aparecer atraso={120} deslocamento={8} duracao={600} style={styles.titulos}>
          <Texto estilo="Títulos/Destaque" style={styles.centro}>
            {emocaoPorId(momento.id)?.nome ?? 'Momento'}
          </Texto>
          <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.centro}>
            {hora(momento.em)} · {origemDoMomento(momento)}
          </Texto>
          {momento.marcadores?.length ? (
            <View style={styles.marcadores}>
              {momento.marcadores.map((m) => (
                <Etiqueta key={m} rotulo={m} fundo={cores.bg.base} />
              ))}
            </View>
          ) : null}
        </Aparecer>

        <Aparecer atraso={220} deslocamento={10} duracao={600} style={styles.blocos}>
          {/* Escrito a partir de uma pergunta da Página de hoje: a pergunta fica em destaque, no
              mesmo desenho do cartão da pergunta no Diário. */}
          {momento.pergunta ? (
            <View
              style={[styles.pergunta, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}
              accessibilityLabel={
                momento.origem === 'hobby'
                  ? `Atividade concluída: ${momento.pergunta}`
                  : `Você respondeu à pergunta: ${momento.pergunta}`
              }
            >
              <View style={styles.perguntaTopo}>
                <Icone nome="aspas" tamanho={16} cor={cores.text.accent} />
                <Texto estilo="Legenda/Pequena" cor={cores.text.accent}>
                  {momento.origem === 'hobby' ? 'Atividade concluída' : 'Você respondeu'}
                </Texto>
              </View>
              <Texto estilo="Títulos/Pequeno">{momento.pergunta}</Texto>
            </View>
          ) : null}
          <View style={[styles.cartao, { backgroundColor: cores.bg.base }]}>
            {momento.texto ? (
              <TextoComDestaques texto={momento.texto} destaques={momento.destaques} estilo="Texto/Grande" cor={cores.text.primary} />
            ) : (
              <View style={styles.vazio}>
                <Texto estilo="Texto/Médio" cor={cores.text.tertiary}>
                  Você ainda não escreveu sobre esse momento.
                </Texto>
                <Botao rotulo="Escrever sobre ele" estilo="secundario" onPress={editar} />
              </View>
            )}
            {audios.map((a, i) => (
              <View key={a.uri + i} style={styles.linha}>
                <PlayerAudio uri={a.uri} duracao={a.duracao} />
              </View>
            ))}
            {fotos.length ? (
              <View style={styles.linha}>
                {fotos.map((a, i) => (
                  <FotoAnexada key={a.uri + i} uri={a.uri} tamanho={72} onPress={() => setFoto(a.uri)} />
                ))}
              </View>
            ) : null}
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.editado}>
              {editado(momento.editadoEm)}
            </Texto>
          </View>
        </Aparecer>
      </ScrollView>

      {aviso}
      <VisualizarFoto uri={foto} onFechar={() => setFoto(null)} />
    </SafeAreaView>
  );
}

/** Voltar, a data no meio e o lápis de editar (icon/secondary, discreto) à direita. */
function Cabecalho({ titulo, onEditar }: { titulo?: string; onEditar?: () => void }) {
  const { cores } = useTema();
  return (
    <View style={styles.cabecalho}>
      <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.lado}>
        <ChevronEsquerda width={24} height={24} corTraco={cores.icon.primary} />
      </Pressable>
      <Texto estilo="Texto/Botões e rótulos" style={styles.titulo} numberOfLines={1}>
        {titulo ?? ''}
      </Texto>
      <View style={[styles.lado, styles.direita]}>
        {onEditar ? (
          <Pressable onPress={onEditar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Editar momento">
            <Icone nome="lapis" tamanho={22} cor={cores.icon.secondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  cabecalho: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: space[12] },
  lado: { width: 44, justifyContent: 'center' },
  direita: { alignItems: 'flex-end' },
  titulo: { flex: 1, textAlign: 'center' },
  conteudo: { paddingHorizontal: space[24], paddingTop: space[32], paddingBottom: space[40], gap: space[24] },
  premo: { alignItems: 'center' },
  titulos: { alignItems: 'center', gap: space[8] },
  centro: { textAlign: 'center' },
  marcadores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[8], marginTop: space[8] },
  cartao: { gap: space[16], paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14, borderRadius: 20 },
  blocos: { gap: space[12] },
  pergunta: { gap: space[8], padding: space[16], borderRadius: 20, borderWidth: 1 },
  perguntaTopo: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  vazio: { gap: space[16], paddingVertical: space[8] },
  linha: { flexDirection: 'row', gap: 10 },
  editado: { alignSelf: 'flex-end' },
});
