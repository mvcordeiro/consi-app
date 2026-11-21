import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Botao, CabecalhoVoltar, Etiqueta, Icone, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { Blocos } from '@/components/blocos';
import { ChevronDireita } from '@/components/home/assets';
import { IconeHobby, irPara, useAcoesAtividade } from '@/components/hobbies';
import { hobbyInfo, sentimentos } from '@/data/catalogo';
import { emocaoPorId } from '@/data/emocoes';
import { dataCurta, useHobbies } from '@/data/hobbiesEstado';
import { borderWidth, inset, radius, space, useTema } from '@/theme';

/**
 * Detalhe de uma sugestão ou atividade (aberto pelo "mais" e por "Ver detalhes").
 * O conteúdo é em blocos (títulos, texto, listas, tarefas, imagens…), cada atividade com a
 * estrutura dela. Nas atividades da pessoa, as tarefas podem ser marcadas e, se ela criou ou o
 * autor permite remix, dá para editar. As ações do rodapé mudam conforme o estado.
 */
export default function Detalhe() {
  const { cores } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const h = useHobbies();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const acoes = useAcoesAtividade({
    aoApagar: () => router.back(),
    aoAgendar: (r) => mostrarAviso(r ? `Lembrete para ${r}` : 'Lembrete removido'),
  });

  const encontrado = h.item(id);
  // Uma sugestão já aceita mostra a versão da pessoa.
  const item = encontrado?.tipo === 'catalogo' ? (h.item(`a-${encontrado.a.id}`) ?? encontrado) : encontrado;
  if (!item || !id) return null;

  const { a } = item;
  const minha = item.minha;
  const naPilha = item.tipo === 'catalogo' && h.pilha(a.hobby).some((s) => s.id === a.id);
  const editavel = minha ? h.podeEditar(minha) : false;
  const autor = a.permissoes.mostrarAutor ? a.autor : { usuario: 'Alguém da comunidade', iniciais: '·' };
  const total = h.totalComentarios(a.id);
  const capa = a.capa;

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margem}>
        <CabecalhoVoltar
          rotulo={hobbyInfo(a.hobby).nome}
          direita={
            minha ? (
              <Pressable onPress={() => acoes.abrirMenu(minha)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mais opções">
                <Icone nome="menu-horizontal" />
              </Pressable>
            ) : (
              <Pressable onPress={() => irPara.compartilhar(a.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Compartilhar">
                <Icone nome="compartilhar" />
              </Pressable>
            )
          }
        />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        {capa ? (
          <Aparecer>
            <Image
              source={typeof capa === 'string' ? { uri: capa } : capa}
              style={[styles.capa, { backgroundColor: cores.bg.raised }]}
              resizeMode="cover"
            />
          </Aparecer>
        ) : null}

        <Aparecer style={styles.etiquetas}>
          <Etiqueta
            rotulo={hobbyInfo(a.hobby).nome}
            iconeNode={<IconeHobby hobby={a.hobby} icone={a.icone} caixa={16} cor={cores.text.primary} />}
          />
          <Etiqueta rotulo={`${a.minutos} min`} tom="info" iconeNode={<Icone nome="relogio" tamanho={16} />} />
          {minha?.lembrete && minha.status === 'andamento' ? (
            <Etiqueta rotulo={minha.lembrete.rotulo} tom="info" iconeNode={<Icone nome="calendario" tamanho={16} />} />
          ) : null}
          {minha?.status === 'concluida' ? <Etiqueta rotulo="Concluída" tom="sucesso" /> : null}
          {a.permissoes.remix ? (
            <Etiqueta rotulo="Remix liberado" iconeNode={<Icone nome="repetir" tamanho={16} />} />
          ) : null}
          {minha?.visibilidade === 'privada' && minha.criadaPorMim ? (
            <Etiqueta rotulo="Só você vê" iconeNode={<Icone nome="cadeado" tamanho={16} />} />
          ) : null}
        </Aparecer>

        <Aparecer atraso={80} style={styles.bloco}>
          <Texto estilo="Títulos/Grande">{a.titulo}</Texto>
          {minha?.criadaPorMim ? null : (
            <View style={styles.autor}>
              <Avatar tamanho={24} foto={autor.foto} iniciais={autor.iniciais} />
              <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.flex}>
                {minha?.remixDe
                  ? `Remix seu de ${minha.remixDe.usuario}`
                  : item.tipo === 'catalogo'
                    ? `Sugerido por ${autor.usuario} · ${item.a.quando}`
                    : `Sugerido por ${autor.usuario}`}
              </Texto>
            </View>
          )}
        </Aparecer>

        <Aparecer atraso={160}>
          <Blocos blocos={a.conteudo} onAlternarTarefa={minha ? (bid) => h.alternarTarefa(minha.id, bid) : undefined} />
        </Aparecer>

        {minha?.status === 'concluida' ? (
          <Aparecer atraso={200} style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
            <Texto estilo="Títulos/Pequeno">
              {minha.concluidaEm ? `Você concluiu em ${dataCurta(minha.concluidaEm)}` : 'Você concluiu'}
            </Texto>
            {minha.emocao ? (
              <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
                {`Sentiu: ${emocaoPorId(minha.emocao)?.nome ?? ''}`}
              </Texto>
            ) : minha.sentimento ? (
              <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
                {`Sentiu: ${sentimentos[minha.sentimento].rotulo}`}
              </Texto>
            ) : null}
            {minha.nota ? <Texto estilo="Texto/Médio">{`“${minha.nota}”`}</Texto> : null}
          </Aparecer>
        ) : null}

        <Aparecer atraso={240}>
          {a.permissoes.comentarios ? (
            <Pressable
              onPress={() => irPara.conversa(a.id)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cartao,
                styles.linhaConversa,
                { backgroundColor: cores.bg.raised, borderColor: cores.border.focus, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icone nome="conversa" />
              <View style={styles.flex}>
                <Texto estilo="Texto/Botões e rótulos">Conversa</Texto>
                <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
                  {total === 1 ? '1 comentário' : `${total} comentários`}
                </Texto>
              </View>
              <ChevronDireita width={12} height={12} corTraco={cores.text.tertiary} />
            </Pressable>
          ) : (
            <View style={[styles.cartao, styles.linhaConversa, { borderColor: cores.border.subtle }]}>
              <Icone nome="cadeado" cor={cores.text.tertiary} />
              <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.flex}>
                Os comentários estão desativados nesta atividade.
              </Texto>
            </View>
          )}
        </Aparecer>
      </ScrollView>

      <View style={[styles.rodape, { borderTopColor: cores.border.subtle }]}>
        {naPilha && item.tipo === 'catalogo' ? (
          <View style={styles.botoes}>
            <View style={styles.flex}>
              <Botao
                rotulo="Ignorar"
                estilo="secundario"
                onPress={() => {
                  h.ignorar(item.a);
                  router.back();
                }}
              />
            </View>
            <View style={styles.flex}>
              <Botao
                rotulo="Aceitar"
                corRotulo={cores.text['on-primary']}
                onPress={() => {
                  h.aceitar(item.a);
                  router.back();
                }}
              />
            </View>
          </View>
        ) : minha?.status === 'andamento' ? (
          <View style={styles.botoes}>
            {editavel ? (
              <Pressable
                onPress={() => irPara.editarAtividade(minha.id)}
                accessibilityRole="button"
                accessibilityLabel={minha.criadaPorMim ? 'Editar' : 'Editar (remix)'}
                style={[styles.botaoIcone, { borderColor: cores.border.focus }]}
              >
                <Icone nome="lapis" />
              </Pressable>
            ) : null}
            <View style={styles.flex}>
              <Botao rotulo="Apagar" estilo="secundario" estado="erro" onPress={() => acoes.confirmarApagar(minha)} />
            </View>
            <View style={styles.flex}>
              <Botao rotulo="Finalizar" corRotulo={cores.text['on-primary']} onPress={() => irPara.finalizar(minha.id)} />
            </View>
          </View>
        ) : (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
            {minha?.status === 'concluida' ? 'Essa atividade já foi concluída.' : 'Você já decidiu sobre essa sugestão.'}
          </Texto>
        )}
        {minha && !editavel && minha.status === 'andamento' ? (
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
            Quem criou esta atividade não liberou remix, então ela não pode ser editada.
          </Texto>
        ) : null}
      </View>
      {acoes.folhas}
      {aviso}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  margem: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[32] },
  capa: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  bloco: { gap: space[16] },
  autor: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1, minWidth: 0 },
  cartao: { gap: space[8], padding: inset.md, borderRadius: radius.card },
  linhaConversa: { flexDirection: 'row', alignItems: 'center', gap: space[12], borderWidth: borderWidth.thin },
  rodape: { gap: space[8], paddingHorizontal: inset.lg, paddingTop: space[16], paddingBottom: space[8], borderTopWidth: borderWidth.thin },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  botaoIcone: {
    width: 53,
    height: 53,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { textAlign: 'center', paddingVertical: space[8] },
});

