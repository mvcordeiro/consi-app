import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { guardarArquivo, useArquivoAberto } from '@/data/arquivos';
import { LIMITES_MIDIA, REGEX_LINK, useAtualizacoes, type Atualizacao, type MidiaAtualizacao } from '@/data/atualizacoes';
import { horaMinuto, inicioDoDia } from '@/data/emocoes';
import { borderWidth, radius, space, useTema } from '@/theme';

import { CampoTexto } from '../CampoTexto';
import { FotoAnexada, VisualizarFoto } from '../diario/Fotos';
import { GravandoAudio, PlayerAudio, useGravador } from '../diario/Audio';
import { Folha, ItemFolha } from '../Folha';
import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';

const LADO_MARCADOR = 28;

/** "Hoje", "Ontem" ou "22 de nov." */
function rotuloDia(em: number) {
  const dia = inicioDoDia(0, new Date(em)).getTime();
  if (dia === inicioDoDia(0).getTime()) return 'Hoje';
  if (dia === inicioDoDia(1).getTime()) return 'Ontem';
  return new Date(em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

const ICONE: Record<MidiaAtualizacao['tipo'] | 'texto', NomeIcone> = {
  texto: 'pena-escrita',
  foto: 'inserir-imagem',
  video: 'claquete',
  audio: 'microfone',
};

/**
 * "Suas atualizações" (issue #6), a segunda visão do detalhe de uma atividade salva: no topo o
 * compositor (texto com links tocáveis, foto, vídeo até 60 s, áudio até 5 min) e, abaixo, a
 * linha do tempo como a de "Sua semana": dias do mais recente ao mais antigo, a hora à esquerda,
 * o marcador do tipo ligado ao próximo por um traço e o conteúdo num card. Segurar um card abre
 * Editar e Apagar. Tudo fica só no aparelho.
 */
export function Atualizacoes({ atividadeId }: { atividadeId: string }) {
  const { cores } = useTema();
  const { lista, adicionar, editar, apagar } = useAtualizacoes(atividadeId);
  const gravador = useGravador();
  const [texto, setTexto] = useState('');
  const [midia, setMidia] = useState<MidiaAtualizacao | null>(null);
  const [editando, setEditando] = useState<Atualizacao | null>(null);
  const [menu, setMenu] = useState<Atualizacao | null>(null);
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  const pararAudio = async () => {
    const r = await gravador.parar();
    if (r) setMidia({ tipo: 'audio', uri: r.uri, duracao: r.duracao });
  };

  // Áudio passou do limite: para sozinho.
  useEffect(() => {
    if (!gravador.gravando || gravador.segundos < LIMITES_MIDIA.audioSeg) return;
    const t = setTimeout(() => void pararAudio(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravador.segundos]);

  const escolher = async (tipo: 'foto' | 'video') => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [tipo === 'foto' ? 'images' : 'videos'],
      quality: 0.8,
      videoMaxDuration: LIMITES_MIDIA.videoSeg,
    }).catch(() => null);
    const a = r && !r.canceled ? r.assets[0] : null;
    if (!a) return;
    if (tipo === 'video' && a.duration && a.duration / 1000 > LIMITES_MIDIA.videoSeg + 1) return;
    const uri = await guardarArquivo(a.uri);
    setMidia(tipo === 'foto' ? { tipo: 'foto', uri } : { tipo: 'video', uri, duracao: a.duration ? a.duration / 1000 : undefined });
  };

  const limpar = () => {
    setTexto('');
    setMidia(null);
    setEditando(null);
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t && !midia) return;
    if (editando) await editar(editando.id, { texto: t || undefined, midia: midia ?? undefined });
    else await adicionar({ texto: t || undefined, midia: midia ?? undefined });
    limpar();
  };

  const pode = !!texto.trim() || !!midia;

  // Do mais recente para o mais antigo, agrupado por dia.
  const dias: { rotulo: string; itens: Atualizacao[] }[] = [];
  for (const a of [...lista].sort((x, y) => y.em - x.em)) {
    const r = rotuloDia(a.em);
    const ultimo = dias[dias.length - 1];
    if (ultimo?.rotulo === r) ultimo.itens.push(a);
    else dias.push({ rotulo: r, itens: [a] });
  }

  return (
    <View style={styles.secao}>
      {/* Compositor */}
      <View style={[styles.compositor, { borderColor: cores.border.subtle }]}>
        {editando ? (
          <View style={styles.linha}>
            <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.flex}>
              Editando a atualização
            </Texto>
            <Pressable onPress={limpar} accessibilityRole="button" hitSlop={8}>
              <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                Cancelar
              </Texto>
            </Pressable>
          </View>
        ) : null}
        {midia ? (
          <View style={styles.linha}>
            <View style={styles.flex}>
              <Midia midia={midia} onAbrirFoto={setFotoAberta} />
            </View>
            <Pressable onPress={() => setMidia(null)} accessibilityRole="button" accessibilityLabel="Tirar o anexo" hitSlop={8}>
              <Icone nome="excluir" />
            </Pressable>
          </View>
        ) : null}
        {gravador.gravando ? (
          <GravandoAudio segundos={gravador.segundos} onParar={() => void pararAudio()} />
        ) : (
          <CampoTexto
            placeholder="Como foi? Um link, uma ideia, um passo…"
            value={texto}
            onChangeText={setTexto}
            maxLength={LIMITES_MIDIA.textoMax}
            multiline
            alturaMinima={56}
            acessibilidade="Nova atualização"
          />
        )}
        <View style={styles.linha}>
          <BotaoIcone icone="inserir-imagem" rotulo="Foto" onPress={() => void escolher('foto')} />
          <BotaoIcone icone="claquete" rotulo="Vídeo (até 60 s)" onPress={() => void escolher('video')} />
          <BotaoIcone
            icone="microfone"
            rotulo="Gravar áudio (até 5 min)"
            onPress={() => (gravador.gravando ? void pararAudio() : void gravador.iniciar())}
          />
          <View style={styles.flex} />
          <BotaoIcone icone="aviao-papel" rotulo={editando ? 'Salvar edição' : 'Adicionar atualização'} onPress={() => void enviar()} desligado={!pode} />
        </View>
      </View>

      {/* Linha do tempo */}
      {dias.length ? (
        dias.map((d) => (
          <View key={d.rotulo} style={styles.dia}>
            <Texto estilo="Títulos/Pequeno" accessibilityRole="header" style={styles.rotuloDia}>
              {d.rotulo}
            </Texto>
            {d.itens.map((a, i) => (
              <LinhaDoTempo key={a.id} hora={horaMinuto(a.em)} icone={ICONE[a.midia?.tipo ?? 'texto']} linha={i < d.itens.length - 1}>
                <Pressable
                  onLongPress={() => setMenu(a)}
                  delayLongPress={320}
                  accessibilityHint="Segure para editar ou apagar"
                  style={({ pressed }) => [
                    styles.card,
                    { borderColor: cores.border.subtle, backgroundColor: pressed ? cores.bg.sunken : cores.bg.base },
                  ]}
                >
                  {a.midia ? <Midia midia={a.midia} onAbrirFoto={setFotoAberta} /> : null}
                  {a.texto ? <TextoComLinks texto={a.texto} /> : null}
                  {a.editadaEm ? (
                    <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                      editada
                    </Texto>
                  ) : null}
                </Pressable>
              </LinhaDoTempo>
            ))}
          </View>
        ))
      ) : (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
          Ainda não há atualizações. Conte como foi, guarde um link, uma foto, um vídeo ou um áudio: só você vê.
        </Texto>
      )}

      <Folha visivel={!!menu} onFechar={() => setMenu(null)} titulo="Atualização">
        <View>
          <ItemFolha
            rotulo="Editar"
            icone={(cor) => <Icone nome="lapis" cor={cor} />}
            onPress={() => {
              if (!menu) return;
              setEditando(menu);
              setTexto(menu.texto ?? '');
              setMidia(menu.midia ?? null);
              setMenu(null);
            }}
          />
          <ItemFolha
            rotulo="Apagar"
            icone={(cor) => <Icone nome="lixeira" cor={cor} />}
            onPress={() => {
              if (menu) void apagar(menu.id);
              setMenu(null);
            }}
          />
        </View>
      </Folha>
      <VisualizarFoto uri={fotoAberta} onFechar={() => setFotoAberta(null)} />
    </View>
  );
}

/** Uma linha da linha do tempo, como em "Sua semana": hora, marcador ligado ao próximo e o card. */
function LinhaDoTempo({ hora, icone, linha, children }: { hora: string; icone: NomeIcone; linha: boolean; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={styles.linhaTempo}>
      <Texto estilo="Texto/Botões e rótulos" style={styles.hora}>
        {hora}
      </Texto>
      <View style={styles.trilho}>
        <View style={[styles.marcador, { backgroundColor: cores.bg.sunken }]}>
          <Icone nome={icone} tamanho={16} cor={cores.text.primary} />
        </View>
        {linha ? <View style={[styles.traco, { backgroundColor: cores.border.subtle }]} /> : null}
      </View>
      <View style={[styles.conteudoLinha, linha && styles.comEspaco]}>{children}</View>
    </View>
  );
}

function BotaoIcone({ icone, rotulo, onPress, desligado }: { icone: NomeIcone; rotulo: string; onPress: () => void; desligado?: boolean }) {
  return (
    <Pressable
      onPress={desligado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!desligado }}
      hitSlop={6}
      style={({ pressed }) => [styles.botaoIcone, { opacity: desligado ? 0.35 : pressed ? 0.6 : 1 }]}
    >
      <Icone nome={icone} />
    </Pressable>
  );
}

function Midia({ midia, onAbrirFoto }: { midia: MidiaAtualizacao; onAbrirFoto: (uri: string) => void }) {
  if (midia.tipo === 'foto') return <FotoAnexada uri={midia.uri} tamanho={160} onPress={() => onAbrirFoto(midia.uri)} />;
  if (midia.tipo === 'audio') return <PlayerAudio uri={midia.uri} duracao={midia.duracao} />;
  return <Video uri={midia.uri} />;
}

function Video({ uri }: { uri: string }) {
  // O vídeo guardado é cifrado (data/arquivos.ts): toca a cópia decifrada.
  const aberto = useArquivoAberto(uri);
  return aberto ? <VideoAberto uri={aberto} /> : <View style={styles.video} />;
}

function VideoAberto({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.video} nativeControls contentFit="cover" />;
}

function TextoComLinks({ texto }: { texto: string }) {
  const { cores } = useTema();
  const partes = texto.split(REGEX_LINK);
  return (
    <Texto estilo="Texto/Médio">
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <Texto
            key={i}
            estilo="Texto/Médio"
            cor={cores.text.link}
            style={styles.link}
            onPress={() => void Linking.openURL(p.startsWith('http') ? p : `https://${p}`)}
            accessibilityRole="link"
          >
            {p}
          </Texto>
        ) : (
          p
        ),
      )}
    </Texto>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  compositor: { gap: space[8], paddingBottom: space[8], borderBottomWidth: borderWidth.thin },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  centro: { textAlign: 'center' },
  dia: { gap: space[12] },
  rotuloDia: { marginBottom: space[4] },
  linhaTempo: { flexDirection: 'row', gap: space[12] },
  hora: { width: 44, paddingTop: 6, fontVariant: ['tabular-nums'] },
  trilho: { width: LADO_MARCADOR, alignItems: 'center' },
  marcador: { width: LADO_MARCADOR, height: LADO_MARCADOR, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  traco: { flex: 1, width: borderWidth.thin, marginVertical: space[4] },
  conteudoLinha: { flex: 1, minWidth: 0 },
  comEspaco: { paddingBottom: space[12] },
  card: {
    gap: space[8],
    paddingHorizontal: space[12] - borderWidth.thin,
    paddingVertical: space[8],
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
  },
  botaoIcone: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden' },
  link: { textDecorationLine: 'underline' },
});
