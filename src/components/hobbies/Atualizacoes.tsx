import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { guardarArquivo } from '@/data/arquivos';
import { LIMITES_MIDIA, REGEX_LINK, useAtualizacoes, type Atualizacao, type MidiaAtualizacao } from '@/data/atualizacoes';
import { horaMinuto } from '@/data/emocoes';
import { radius, space, useTema } from '@/theme';

import { CampoTexto } from '../CampoTexto';
import { FotoAnexada, VisualizarFoto } from '../diario/Fotos';
import { GravandoAudio, PlayerAudio, useGravador } from '../diario/Audio';
import { Folha, ItemFolha } from '../Folha';
import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';

/**
 * "Suas atualizações" no detalhe de uma atividade salva (issue #6): linha do tempo privada,
 * como um chat. Texto (links tocáveis), foto, vídeo (até 60 s) e áudio (até 5 min). Segurar uma
 * atualização abre Editar e Apagar. Tudo fica só no aparelho.
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

  return (
    <View style={styles.secao}>
      <Texto estilo="Títulos/Pequeno" accessibilityRole="header">
        Suas atualizações
      </Texto>
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Uma linha do tempo só sua: como foi, um link, uma foto, um vídeo ou um áudio.
      </Texto>

      {lista.map((a) => (
        <Pressable
          key={a.id}
          onLongPress={() => setMenu(a)}
          delayLongPress={320}
          accessibilityHint="Segure para editar ou apagar"
          style={({ pressed }) => [styles.balao, { backgroundColor: pressed ? cores.bg.sunken : cores.bg.raised }]}
        >
          {a.midia ? <Midia midia={a.midia} onAbrirFoto={setFotoAberta} /> : null}
          {a.texto ? <TextoComLinks texto={a.texto} /> : null}
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {`${new Date(a.em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · ${horaMinuto(a.em)}${a.editadaEm ? ' · editada' : ''}`}
          </Texto>
        </Pressable>
      ))}

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
            placeholder="Escreva uma atualização…"
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
  secao: { gap: space[12] },
  balao: { padding: space[12], borderRadius: radius.lg, gap: space[8] },
  compositor: { gap: space[8], paddingTop: space[8], borderTopWidth: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  botaoIcone: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden' },
  link: { textDecorationLine: 'underline' },
});
