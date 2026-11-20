import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar, CampoTexto, Folha, Icone, ItemFolha, Texto } from '@/components';
import { Aparecer } from '@/components/animacao';
import { montarArvore, PainelReacoes, Thread, type Ancora } from '@/components/conversa';
import { IconeHobby } from '@/components/hobbies';
import { vibrar } from '@/components/hobbies/Arraste';
import { guardarArquivo } from '@/data/arquivos';
import type { Comentario } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { borderWidth, inset, primitivas, radius, size, space, useTema } from '@/theme';

/**
 * Conversa de uma atividade (botão "Conversa" dos cards; sem design no Figma).
 * Threads com respostas (estilo Reddit): arrastar um comentário para a esquerda responde,
 * segurar abre as reações (com vibração). Dá para enviar imagens da galeria ou da câmera.
 * O campo fica sempre visível, inclusive com o teclado aberto, e envia com o avião de papel do DS.
 */
export default function ConversaTela() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const h = useHobbies();
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<Comentario | null>(null);
  const [reagindo, setReagindo] = useState<{ c: Comentario; ancora: Ancora } | null>(null);
  const [anexar, setAnexar] = useState(false);
  const [vendo, setVendo] = useState<string | null>(null);
  const campo = useRef<TextInputInstance>(null);
  const rolagem = useRef<{ scrollToEnd: (o: { animated: boolean }) => void } | null>(null);

  const item = h.item(id);
  const { marcarLida } = h;
  useEffect(() => {
    if (id) marcarLida(id);
  }, [id, marcarLida]);

  if (!item || !id) return null;
  const { a } = item;
  const permitido = a.permissoes.comentarios;
  const lista = h.comentarios(id);
  const arvore = montarArvore(lista);
  const total = h.totalComentarios(id);
  const anteriores = Math.max(total - lista.length, 0);
  const podeEnviar = !!texto.trim() || !!imagem;

  const enviar = () => {
    if (!podeEnviar) return;
    h.comentar(id, { texto, imagem: imagem ?? undefined, paiId: respondendo?.id });
    vibrar('sucesso');
    setTexto('');
    setImagem(null);
    setRespondendo(null);
    setTimeout(() => rolagem.current?.scrollToEnd({ animated: true }), 80);
  };

  const responder = (c: Comentario) => {
    setRespondendo(c);
    campo.current?.focus();
  };

  const pegarImagem = async (deOnde: 'galeria' | 'camera') => {
    setAnexar(false);
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    let r: ImagePicker.ImagePickerResult;
    if (deOnde === 'camera') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return;
      r = await ImagePicker.launchCameraAsync(opcoes);
    } else {
      r = await ImagePicker.launchImageLibraryAsync(opcoes);
    }
    if (!r.canceled && r.assets[0]) setImagem(await guardarArquivo(r.assets[0].uri));
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* "padding" nas duas plataformas: com o edge-to-edge do Android, é o que mantém o campo acima do teclado */}
      <KeyboardAvoidingView style={styles.tela} behavior="padding">
        <View style={styles.margemTopo}>
          <CabecalhoVoltar rotulo={total === 1 ? '1 comentário' : `${total} comentários`} />
        </View>
        <ScrollView
          ref={(r: unknown) => {
            rolagem.current = r as typeof rolagem.current;
          }}
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Aparecer style={[styles.resumo, { backgroundColor: cores.bg.raised }]}>
            <IconeHobby hobby={a.hobby} icone={a.icone} caixa={24} />
            <Texto estilo="Títulos/Pequeno" style={styles.flex} numberOfLines={2}>
              {a.titulo}
            </Texto>
          </Aparecer>

          {!permitido ? (
            <View style={styles.vazio}>
              <Icone nome="cadeado" cor={cores.text.tertiary} />
              <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
                Quem criou esta atividade desativou os comentários.
              </Texto>
            </View>
          ) : (
            <>
              {anteriores > 0 ? (
                <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                  {`${anteriores} comentários anteriores`}
                </Texto>
              ) : null}
              {arvore.length ? (
                <>
                  <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
                    Segure para reagir · arraste para a esquerda para responder
                  </Texto>
                  {arvore.map((no, i) => (
                    <Aparecer key={no.c.id} atraso={Math.min(i, 6) * 60}>
                      <Thread
                        no={no}
                        acoes={{
                          minhaReacao: h.minhaReacao,
                          onResponder: responder,
                          onReagir: (c, r) => h.reagir(c.id, r),
                          onSegurar: (c, ancora) => setReagindo({ c, ancora }),
                          onAbrirImagem: setVendo,
                        }}
                      />
                    </Aparecer>
                  ))}
                </>
              ) : (
                <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={[styles.centro, styles.vazio]}>
                  Ninguém comentou ainda. Conte como está sendo para você.
                </Texto>
              )}
            </>
          )}
        </ScrollView>

        {permitido ? (
          <View style={[styles.rodape, { borderTopColor: cores.border.subtle, backgroundColor: cores.bg.base }]}>
            {respondendo ? (
              <View style={[styles.faixa, { backgroundColor: cores.bg.raised }]}>
                <Icone nome="responder" tamanho={16} cor={cores.text.secondary} />
                <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.flex} numberOfLines={1}>
                  {`Respondendo a ${respondendo.autor.usuario}${respondendo.texto ? `: ${respondendo.texto}` : ''}`}
                </Texto>
                <Pressable onPress={() => setRespondendo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancelar resposta">
                  <Icone nome="excluir" tamanho={16} cor={cores.text.secondary} />
                </Pressable>
              </View>
            ) : null}
            {imagem ? (
              <View style={styles.previa}>
                <Image source={{ uri: imagem }} style={styles.previaImagem} />
                <Pressable
                  onPress={() => setImagem(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remover imagem"
                  style={[styles.removerPrevia, { backgroundColor: cores.bg.scrim }]}
                >
                  <Icone nome="excluir" tamanho={12} cor={primitivas.neutral[0]} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.linhaEntrada}>
              <Pressable
                onPress={() => setAnexar(true)}
                accessibilityRole="button"
                accessibilityLabel="Enviar imagem"
                style={[styles.botaoRedondo, { borderColor: cores.border.subtle }]}
              >
                <Icone nome="anexar-imagem" tamanho={22} />
              </Pressable>
              <View style={styles.flex}>
                <CampoTexto
                  ref={campo}
                  acessibilidade={respondendo ? `Responder a ${respondendo.autor.usuario}` : 'Seu comentário'}
                  placeholder={respondendo ? 'Escreva sua resposta…' : 'Escreva algo gentil…'}
                  value={texto}
                  onChangeText={setTexto}
                  multiline
                  maxLength={500}
                />
              </View>
              <Pressable
                onPress={enviar}
                disabled={!podeEnviar}
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                style={({ pressed }) => [
                  styles.botaoRedondo,
                  {
                    borderColor: 'transparent',
                    backgroundColor: podeEnviar
                      ? pressed
                        ? cores.action.primary.pressed
                        : cores.action.primary.default
                      : cores.bg.disabled,
                  },
                ]}
              >
                <Icone nome="aviao-papel" tamanho={20} cor={podeEnviar ? cores.text['on-primary'] : cores.text.disabled} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <PainelReacoes
        ancora={reagindo?.ancora ?? null}
        atual={reagindo ? h.minhaReacao(reagindo.c.id) : undefined}
        onFechar={() => setReagindo(null)}
        onEscolher={(r) => {
          if (reagindo) h.reagir(reagindo.c.id, r);
          setReagindo(null);
        }}
      />

      <Folha visivel={anexar} onFechar={() => setAnexar(false)} titulo="Enviar imagem">
        <View>
          <ItemFolha rotulo="Escolher da galeria" icone={(cor) => <Icone nome="anexar-imagem" cor={cor} />} onPress={() => pegarImagem('galeria')} />
          <ItemFolha rotulo="Tirar uma foto" icone={(cor) => <Icone nome="camera" cor={cor} />} onPress={() => pegarImagem('camera')} />
        </View>
      </Folha>

      <Modal visible={!!vendo} transparent animationType="fade" onRequestClose={() => setVendo(null)}>
        <Pressable style={[styles.visor, { backgroundColor: primitivas.overlay['black-60'] }]} onPress={() => setVendo(null)} accessibilityLabel="Fechar imagem">
          {vendo ? <Image source={{ uri: vendo }} style={styles.visorImagem} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[12] },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: inset.md, borderRadius: radius.card, marginBottom: space[8] },
  centro: { textAlign: 'center' },
  vazio: { alignItems: 'center', gap: space[12], paddingVertical: space[24] },
  rodape: { gap: space[8], paddingHorizontal: inset.md, paddingTop: space[12], paddingBottom: space[8], borderTopWidth: borderWidth.thin },
  faixa: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12], paddingVertical: space[8], borderRadius: radius.md },
  previa: { alignSelf: 'flex-start' },
  previaImagem: { width: 72, height: 72, borderRadius: radius.md },
  removerPrevia: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaEntrada: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  botaoRedondo: {
    width: size['touch-target'],
    height: size['touch-target'],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  visor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: inset.md },
  visorImagem: { width: '100%', height: '80%' },
});
