import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Etiqueta, Filtro, Folha, Texto, useAviso } from '@/components';
import {
  Carregando,
  FalhaNuvem,
  mensagemErro,
  NOME_CATEGORIA,
  NOME_MODERACAO,
  NOME_STATUS,
  quando,
  TelaAjustes,
  TOM_STATUS,
  useCarregar,
  Vazio,
} from '@/components/comunidade';
import {
  apagar,
  aprovar,
  definirStatus,
  denunciasDe,
  editar,
  esconder,
  listarVersoes,
  mesclar,
  rejeitar,
  responder,
} from '@/data/nuvem/moderacao';
import { buscarParecidas, detalheSugestao } from '@/data/nuvem/sugestoes';
import {
  CATEGORIAS_SUGESTAO,
  LIMITES,
  STATUS_SUGESTAO,
  type CategoriaSugestao,
  type StatusSugestao,
  type Sugestao,
} from '@/data/nuvem/tipos';
import { radius, space, useTema } from '@/theme';

type FolhaAberta = 'rejeitar' | 'editar' | 'versao' | 'mesclar' | 'apagar' | null;

/**
 * Moderar uma sugestão: aprovar ou rejeitar (com motivo, visto só pelo autor), esconder ou voltar
 * a publicar, editar o texto, mudar o status (ao marcar Lançada, escolher a versão do changelog),
 * escrever a resposta oficial, juntar com uma parecida e apagar spam. Mostra as denúncias.
 */
export default function ModerarSugestao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const { dados, erro, carregando, tentarDeNovo, recarregar } = useCarregar(async () => {
    const [s, denuncias] = await Promise.all([detalheSugestao(id), denunciasDe(id)]);
    return s ? { s, denuncias } : null;
  }, [id]);
  const [folha, setFolha] = useState<FolhaAberta>(null);
  const [ocupado, setOcupado] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [resposta, setResposta] = useState<string | null>(null);

  const fazer = async (acao: () => Promise<unknown>, sucesso: string, depois?: () => void) => {
    setOcupado(true);
    try {
      await acao();
      setFolha(null);
      mostrarAviso(sucesso);
      if (depois) depois();
      else await recarregar();
    } catch (e) {
      mostrarAviso(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  };

  if (carregando) return <TelaAjustes titulo="Moderar" voltar="Moderação"><Carregando /></TelaAjustes>;
  if (erro) return <TelaAjustes titulo="Moderar" voltar="Moderação"><FalhaNuvem erro={erro} onTentar={tentarDeNovo} /></TelaAjustes>;
  if (!dados) return <TelaAjustes titulo="Moderar" voltar="Moderação"><Vazio titulo="Sugestão não encontrada" /></TelaAjustes>;

  const { s, denuncias } = dados;
  const textoResposta = resposta ?? s.resposta ?? '';
  const estado = ocupado ? 'desabilitado' : 'normal';

  const mudarStatus = (status: StatusSugestao) => {
    if (status === s.status) return;
    if (status === 'lancada') setFolha('versao');
    else void fazer(() => definirStatus(s.id, status), `Status: ${NOME_STATUS[status]}.`);
  };

  return (
    <TelaAjustes titulo="Moderar" voltar="Moderação" aviso={aviso}>
      <View style={styles.etiquetas}>
        <Etiqueta rotulo={NOME_MODERACAO[s.moderacao]} tom={s.moderacao === 'publicada' ? 'sucesso' : s.moderacao === 'pendente' ? 'aviso' : 'erro'} />
        <Etiqueta rotulo={NOME_STATUS[s.status]} tom={TOM_STATUS[s.status]} />
        {s.categoria ? <Etiqueta rotulo={NOME_CATEGORIA[s.categoria]} /> : null}
      </View>
      <Texto estilo="Títulos/Médio">{s.titulo}</Texto>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {`Enviada ${quando(s.criadaEm)} · ${s.pontos} pontos (${s.votosPos} a favor, ${s.votosNeg} contra)`}
      </Texto>
      {s.descricao ? <Texto cor={cores.text.secondary}>{s.descricao}</Texto> : null}
      {s.duplicadaDe ? (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Juntada com outra sugestão.
        </Texto>
      ) : null}

      {denuncias.length ? (
        <Bloco titulo={`Denúncias (${denuncias.length})`}>
          {denuncias.map((d, i) => (
            <Texto key={i} estilo="Texto/Pequeno" cor={cores.text.secondary}>
              {`${quando(d.criadaEm)}: ${d.motivo ?? 'sem motivo'}`}
            </Texto>
          ))}
        </Bloco>
      ) : null}

      <Bloco titulo="Publicação">
        {s.moderacao === 'pendente' ? (
          <>
            <Botao rotulo="Aprovar e publicar" onPress={() => fazer(() => aprovar(s.id), 'Publicada.')} estado={estado} disabled={ocupado} />
            <Botao rotulo="Rejeitar" estilo="secundario" onPress={() => setFolha('rejeitar')} estado={estado} disabled={ocupado} />
          </>
        ) : s.moderacao === 'publicada' ? (
          <Botao rotulo="Esconder" estilo="secundario" onPress={() => fazer(() => esconder(s.id), 'Escondida.')} estado={estado} disabled={ocupado} />
        ) : (
          <Botao rotulo="Publicar" onPress={() => fazer(() => aprovar(s.id), 'Publicada.')} estado={estado} disabled={ocupado} />
        )}
      </Bloco>

      <Bloco titulo="Status" descricao="Aparece para todos na lista e no detalhe.">
        <View style={styles.etiquetas} accessibilityRole="radiogroup">
          {STATUS_SUGESTAO.map((st) => (
            <Filtro key={st} rotulo={NOME_STATUS[st]} ativo={s.status === st} onPress={() => mudarStatus(st)} />
          ))}
        </View>
      </Bloco>

      <Bloco titulo="Resposta oficial" descricao={s.moderacao === 'rejeitada' ? 'Numa rejeitada, é o motivo que só o autor vê.' : 'Aparece em destaque no detalhe da sugestão.'}>
        <CampoTexto
          value={textoResposta}
          onChangeText={setResposta}
          multiline
          alturaMinima={96}
          maxLength={LIMITES.respostaMax}
          placeholder="Ex.: Obrigado! Isso entra no próximo mês."
          acessibilidade="Resposta oficial"
        />
        <Botao
          rotulo="Salvar resposta"
          estilo="secundario"
          onPress={() => fazer(() => responder(s.id, textoResposta), textoResposta.trim() ? 'Resposta salva.' : 'Resposta apagada.')}
          estado={resposta === null || ocupado ? 'desabilitado' : 'normal'}
          disabled={resposta === null || ocupado}
        />
      </Bloco>

      <Bloco titulo="Mais ações">
        <Botao rotulo="Editar texto" estilo="secundario" onPress={() => setFolha('editar')} />
        <Botao rotulo="Juntar com outra parecida" estilo="secundario" onPress={() => setFolha('mesclar')} />
        <Botao rotulo="Apagar de vez" estilo="secundario" onPress={() => setFolha('apagar')} />
      </Bloco>

      <Folha visivel={folha === 'rejeitar'} onFechar={() => setFolha(null)} titulo="Rejeitar sugestão?" descricao="Ela não fica pública. O motivo aparece só para quem enviou.">
        <CampoTexto value={motivo} onChangeText={setMotivo} placeholder="Motivo (opcional)" maxLength={LIMITES.respostaMax} acessibilidade="Motivo" />
        <Botao rotulo="Rejeitar" onPress={() => fazer(() => rejeitar(s.id, motivo), 'Rejeitada.')} estado={estado} disabled={ocupado} />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setFolha(null)} />
      </Folha>

      <FolhaEditar visivel={folha === 'editar'} sugestao={s} onFechar={() => setFolha(null)} ocupado={ocupado} onSalvar={(c) => fazer(() => editar(s.id, c), 'Texto salvo.')} />

      <FolhaVersao
        visivel={folha === 'versao'}
        onFechar={() => setFolha(null)}
        ocupado={ocupado}
        onEscolher={(versaoId) => fazer(() => definirStatus(s.id, 'lancada', versaoId), 'Marcada como lançada.')}
      />

      <FolhaMesclar
        visivel={folha === 'mesclar'}
        sugestao={s}
        onFechar={() => setFolha(null)}
        ocupado={ocupado}
        onEscolher={(destino) => fazer(() => mesclar(s.id, destino.id), `Juntada com "${destino.titulo}".`, () => router.back())}
      />

      <Folha visivel={folha === 'apagar'} onFechar={() => setFolha(null)} titulo="Apagar de vez?" descricao="Some a sugestão, os votos e as denúncias. Use só para spam: rejeitar ou esconder mantém o histórico.">
        <Botao rotulo="Apagar" onPress={() => fazer(() => apagar(s.id), 'Apagada.', () => router.back())} estado={estado} disabled={ocupado} />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setFolha(null)} />
      </Folha>
    </TelaAjustes>
  );
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  const { cores } = useTema();
  return (
    <View style={[styles.bloco, { borderTopColor: cores.border.subtle }]}>
      <Texto estilo="Títulos/Pequeno" accessibilityRole="header">
        {titulo}
      </Texto>
      {descricao ? (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          {descricao}
        </Texto>
      ) : null}
      {children}
    </View>
  );
}

function FolhaEditar({
  visivel,
  sugestao,
  onFechar,
  onSalvar,
  ocupado,
}: {
  visivel: boolean;
  sugestao: Sugestao;
  onFechar: () => void;
  onSalvar: (c: { titulo: string; descricao: string | null; categoria: CategoriaSugestao | null }) => void;
  ocupado: boolean;
}) {
  const [titulo, setTitulo] = useState(sugestao.titulo);
  const [descricao, setDescricao] = useState(sugestao.descricao ?? '');
  const [categoria, setCategoria] = useState(sugestao.categoria);
  const valido = titulo.trim().length >= LIMITES.tituloMin;
  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Editar texto" descricao="Corrija erros ou tire dados pessoais. Mantenha a ideia de quem enviou.">
      <CampoTexto titulo="Título" value={titulo} onChangeText={setTitulo} maxLength={LIMITES.tituloMax} acessibilidade="Título" />
      <CampoTexto titulo="Detalhes" value={descricao} onChangeText={setDescricao} maxLength={LIMITES.descricaoMax} multiline alturaMinima={80} acessibilidade="Detalhes" />
      <View style={styles.etiquetas}>
        {CATEGORIAS_SUGESTAO.map((c) => (
          <Filtro key={c} rotulo={NOME_CATEGORIA[c]} ativo={categoria === c} onPress={() => setCategoria(categoria === c ? null : c)} />
        ))}
      </View>
      <Botao
        rotulo="Salvar"
        onPress={() => onSalvar({ titulo, descricao: descricao || null, categoria })}
        estado={valido && !ocupado ? 'normal' : 'desabilitado'}
        disabled={!valido || ocupado}
      />
    </Folha>
  );
}

function FolhaVersao({ visivel, onFechar, onEscolher, ocupado }: { visivel: boolean; onFechar: () => void; onEscolher: (id: string | null) => void; ocupado: boolean }) {
  const { cores } = useTema();
  const { dados, carregando } = useCarregar(() => (visivel ? listarVersoes() : Promise.resolve(null)), [visivel]);
  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Saiu em qual versão?" descricao="A sugestão aparece como Ideia da comunidade nas Novidades dessa versão.">
      {carregando ? <Carregando /> : null}
      {dados?.map((v) => (
        <Pressable key={v.id} onPress={() => onEscolher(v.id)} disabled={ocupado} accessibilityRole="button" style={({ pressed }) => [styles.opcao, { borderColor: cores.border.subtle }, pressed && { opacity: 0.7 }]}>
          <Texto estilo="Texto/Botões e rótulos">{`Versão ${v.versao}`}</Texto>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {v.publicada ? 'publicada' : 'rascunho'}
          </Texto>
        </Pressable>
      ))}
      <Botao rotulo="Sem versão por enquanto" estilo="secundario" onPress={() => onEscolher(null)} disabled={ocupado} />
    </Folha>
  );
}

function FolhaMesclar({
  visivel,
  sugestao,
  onFechar,
  onEscolher,
  ocupado,
}: {
  visivel: boolean;
  sugestao: Sugestao;
  onFechar: () => void;
  onEscolher: (destino: Sugestao) => void;
  ocupado: boolean;
}) {
  const { cores } = useTema();
  const [busca, setBusca] = useState(sugestao.titulo);
  const { dados, carregando } = useCarregar(
    () => (visivel && busca.trim().length >= 3 ? buscarParecidas(busca, 6) : Promise.resolve([])),
    [visivel, busca],
  );
  const opcoes = (dados ?? []).filter((d) => d.id !== sugestao.id && d.moderacao === 'publicada');
  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Juntar com qual?" descricao="Os votos desta passam para a escolhida e esta some da lista.">
      <CampoTexto value={busca} onChangeText={setBusca} placeholder="Buscar pelo título" acessibilidade="Buscar sugestão" />
      {carregando ? <Carregando /> : null}
      {!carregando && !opcoes.length ? (
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Nenhuma publicada parecida. Tente outras palavras.
        </Texto>
      ) : null}
      {opcoes.map((o) => (
        <Pressable key={o.id} onPress={() => onEscolher(o)} disabled={ocupado} accessibilityRole="button" style={({ pressed }) => [styles.opcao, { borderColor: cores.border.subtle }, pressed && { opacity: 0.7 }]}>
          <Texto estilo="Texto/Botões e rótulos" numberOfLines={2} style={styles.flex}>
            {o.titulo}
          </Texto>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {`${o.pontos} pts`}
          </Texto>
        </Pressable>
      ))}
    </Folha>
  );
}

const styles = StyleSheet.create({
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  bloco: { gap: space[12], paddingTop: space[16], borderTopWidth: 1 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: space[8], minHeight: 48, paddingHorizontal: space[12], borderWidth: 1, borderRadius: radius.md },
  flex: { flex: 1 },
});
