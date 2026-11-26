import * as Clipboard from 'expo-clipboard';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type HostInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Avatar, Botao, CabecalhoVoltar, Etiqueta, Icone, IconeDuracao, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { IconeHobby } from '@/components/hobbies';
import { vibrar } from '@/components/hobbies/Arraste';
import { LogoConsi } from '@/components/hobbies/assets';
import { rotuloDuracao } from '@/data/duracao';
import { hobbyInfo, type Bloco } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { useAutorExibido } from '@/data/perfil';
import { borderWidth, inset, radius, space, useTema } from '@/theme';

/** Até três itens do conteúdo para o cartão (listas, tarefas ou passos). */
function destaques(blocos: Bloco[]) {
  return blocos.filter((b) => ['lista', 'numerada', 'tarefa'].includes(b.tipo) && b.texto).slice(0, 3);
}

/**
 * Compartilhar atividade (menu "•••" → Compartilhar). Página avulsa com um cartão que explica a
 * atividade — hobby, título, resumo, tempo e alguns passos — com a marca do Consi embaixo.
 * O cartão vira imagem (react-native-view-shot) para copiar ou baixar.
 */
export default function Compartilhar() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const h = useHobbies();
  const exibir = useAutorExibido();
  const cartao = useRef<HostInstance>(null);
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [ocupado, setOcupado] = useState<'copiar' | 'baixar' | 'enviar' | null>(null);

  const item = h.item(id);
  if (!item) return null;
  const { a } = item;
  const hobby = hobbyInfo(a.hobby);
  const autor = a.permissoes.mostrarAutor ? exibir(a.autor) : null;
  const itens = destaques(a.conteudo);

  const capturar = (result: 'base64' | 'tmpfile' | 'data-uri') =>
    captureRef(cartao, { format: 'png', quality: 1, result });

  const copiar = async () => {
    setOcupado('copiar');
    try {
      const base64 = await capturar('base64');
      await Clipboard.setImageAsync(base64);
      vibrar('sucesso');
      mostrarAviso('Imagem copiada');
    } catch {
      mostrarAviso('Não deu para copiar a imagem');
    } finally {
      setOcupado(null);
    }
  };

  const baixar = async () => {
    setOcupado('baixar');
    try {
      if (Platform.OS === 'web') {
        const uri = await capturar('data-uri');
        const link = document.createElement('a');
        link.href = uri;
        link.download = `consi-${a.id}.png`;
        link.click();
      } else {
        const permissao = await requestPermissionsAsync(true);
        if (!permissao.granted) {
          mostrarAviso('Permita o acesso às fotos para salvar');
          return;
        }
        await Asset.create(await capturar('tmpfile'));
      }
      vibrar('sucesso');
      mostrarAviso('Imagem salva nas suas fotos');
    } catch {
      mostrarAviso('Não deu para salvar a imagem');
    } finally {
      setOcupado(null);
    }
  };

  const enviar = async () => {
    setOcupado('enviar');
    try {
      const uri = await capturar('tmpfile');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      mostrarAviso('Não deu para compartilhar agora');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.sunken }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Compartilhar" />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <Aparecer escalaInicial={0.94} deslocamento={0} duracao={700}>
          {/* O que fica dentro deste View vira a imagem */}
          <View ref={cartao} collapsable={false} style={[styles.cartao, { backgroundColor: cores.bg.base }]}>
            <View style={[styles.corpo, { backgroundColor: cores.bg.raised }]}>
              <View style={styles.topo}>
                <View style={[styles.selo, { backgroundColor: cores.bg.base }]}>
                  <IconeHobby hobby={a.hobby} icone={a.icone} caixa={32} />
                </View>
                <View style={styles.etiquetas}>
                  <Etiqueta rotulo={hobby.nome} />
                  <Etiqueta rotulo={rotuloDuracao(a.minutos)} tom="info" iconeNode={<IconeDuracao minutos={a.minutos} />} />
                </View>
              </View>
              <Texto estilo="Títulos/Grande">{a.titulo}</Texto>
              <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
                {a.resumo}
              </Texto>
              {itens.length ? (
                <View style={styles.itens}>
                  {itens.map((b, i) => (
                    <View key={b.id} style={styles.item}>
                      <View style={[styles.numero, { borderColor: cores.border.focus }]}>
                        <Texto estilo="Legenda/Pequena">{i + 1}</Texto>
                      </View>
                      <Texto estilo="Texto/Pequeno" style={styles.flex}>
                        {b.texto}
                      </Texto>
                    </View>
                  ))}
                </View>
              ) : null}
              {autor ? (
                <View style={styles.autor}>
                  <Avatar tamanho={24} foto={autor.foto} iniciais={autor.iniciais} />
                  <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                    {`Ideia de ${autor.usuario}`}
                  </Texto>
                </View>
              ) : null}
            </View>
            {/* Marca do Consi embaixo */}
            <View style={styles.marca}>
              <LogoConsi width={68} height={25} corTraco={cores.icon.primary} />
              <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.direita}>
                Você consigo,{'\n'}no seu ritmo.
              </Texto>
            </View>
          </View>
        </Aparecer>
      </ScrollView>
      <View style={styles.rodape}>
        <View style={styles.botoes}>
          <View style={styles.flex}>
            <Botao
              rotulo={ocupado === 'copiar' ? 'Copiando…' : 'Copiar imagem'}
              estilo="secundario"
              icone={(cor) => <Icone nome="area-transferencia" tamanho={20} cor={cor} />}
              disabled={!!ocupado}
              onPress={copiar}
            />
          </View>
          <View style={styles.flex}>
            <Botao
              rotulo={ocupado === 'baixar' ? 'Salvando…' : 'Baixar imagem'}
              corRotulo={cores.text['on-primary']}
              icone={(cor) => <Icone nome="baixar" tamanho={20} cor={cor} />}
              disabled={!!ocupado}
              onPress={baixar}
            />
          </View>
        </View>
        {Platform.OS !== 'web' ? (
          <Botao
            rotulo="Enviar para…"
            estilo="secundario"
            icone={(cor) => <Icone nome="compartilhar" tamanho={20} cor={cor} />}
            disabled={!!ocupado}
            onPress={enviar}
          />
        ) : null}
      </View>
      {aviso}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg },
  cartao: { borderRadius: radius.sheet, padding: space[12], gap: space[16] },
  corpo: { borderRadius: radius.card, padding: inset.lg, gap: space[16] },
  topo: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  selo: { width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  etiquetas: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  itens: { gap: space[8] },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8] },
  numero: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autor: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[12],
    paddingBottom: space[8],
  },
  direita: { textAlign: 'right' },
  rodape: { gap: space[12], paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
  botoes: { flexDirection: 'row', gap: space[12] },
});
