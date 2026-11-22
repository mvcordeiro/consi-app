import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Etiqueta, Folha, Texto, useAviso } from '@/components';
import {
  BotoesVoto,
  Carregando,
  FalhaNuvem,
  mensagemErro,
  NOME_CATEGORIA,
  NOME_MODERACAO,
  NOME_STATUS,
  quando,
  TelaComunidade,
  TOM_STATUS,
  useCarregar,
  Vazio,
} from '@/components/comunidade';
import { apagarMinhaSugestao, denunciar, detalheSugestao } from '@/data/nuvem/sugestoes';
import { LIMITES } from '@/data/nuvem/tipos';
import { radius, space, useTema } from '@/theme';

/**
 * Detalhe de uma sugestão: título, status, descrição, votos, resposta oficial e a versão em que
 * saiu. Quem enviou vê o estado da revisão e pode apagar enquanto está pendente; os outros podem
 * denunciar (3 denúncias escondem a sugestão até a moderação olhar).
 */
export default function DetalheSugestao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const { dados: s, setDados, erro, carregando, tentarDeNovo } = useCarregar(() => detalheSugestao(id), [id]);
  const [folha, setFolha] = useState<'denunciar' | 'apagar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const fazer = async (acao: () => Promise<void>, sucesso: string, depois?: () => void) => {
    setOcupado(true);
    try {
      await acao();
      setFolha(null);
      mostrarAviso(sucesso);
      depois?.();
    } catch (e) {
      mostrarAviso(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  };

  let corpo;
  if (carregando) corpo = <Carregando rotulo="Carregando sugestão" />;
  else if (erro) corpo = <FalhaNuvem erro={erro} onTentar={tentarDeNovo} />;
  else if (!s) corpo = <Vazio titulo="Sugestão não encontrada" descricao="Ela pode ter sido removida ou juntada com outra parecida." />;
  else {
    const publicada = s.moderacao === 'publicada';
    corpo = (
      <>
        <View style={styles.etiquetas}>
          {publicada ? (
            <Etiqueta rotulo={NOME_STATUS[s.status]} tom={TOM_STATUS[s.status]} />
          ) : (
            <Etiqueta rotulo={NOME_MODERACAO[s.moderacao]} tom={s.moderacao === 'pendente' ? 'aviso' : 'erro'} />
          )}
          {s.categoria ? <Etiqueta rotulo={NOME_CATEGORIA[s.categoria]} /> : null}
        </View>
        <Texto estilo="Títulos/Médio">{s.titulo}</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {`Enviada ${quando(s.criadaEm)}${s.minha ? ' · por você' : ''}`}
        </Texto>
        {s.descricao ? <Texto cor={cores.text.secondary}>{s.descricao}</Texto> : null}

        {publicada ? (
          <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]}>
            <View style={styles.flex}>
              <Texto estilo="Títulos/Pequeno">Votos</Texto>
              <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
                {s.minha ? 'Você não pode votar na sua própria ideia.' : `${s.votosPos} a favor · ${s.votosNeg} contra`}
              </Texto>
            </View>
            <BotoesVoto
              sugestao={s}
              horizontal
              desligado={s.minha}
              onMudar={(m) => setDados((d) => (d ? { ...d, ...m } : d))}
              onErro={mostrarAviso}
            />
          </View>
        ) : s.minha ? (
          <View style={[styles.cartao, styles.coluna, { backgroundColor: cores.bg.raised }]}>
            <Texto estilo="Títulos/Pequeno">{s.moderacao === 'pendente' ? 'Em revisão' : NOME_MODERACAO[s.moderacao]}</Texto>
            <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
              {s.moderacao === 'pendente'
                ? 'Só você vê esta sugestão por enquanto. Ela fica pública depois de revisada.'
                : 'Esta sugestão não foi publicada.'}
            </Texto>
          </View>
        ) : null}

        {s.resposta ? (
          <View style={[styles.cartao, styles.coluna, { backgroundColor: cores.bg.raised, borderLeftColor: cores.action.primary.default }, styles.resposta]}>
            <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
              {publicada ? 'RESPOSTA DO CONSI' : 'MOTIVO'}
            </Texto>
            <Texto>{s.resposta}</Texto>
          </View>
        ) : null}

        {s.versao ? (
          <Botao
            rotulo={`Saiu na versão ${s.versao.versao}`}
            estilo="secundario"
            onPress={() => router.push('/ajustes/novidades')}
          />
        ) : null}

        {s.minha && s.moderacao === 'pendente' ? (
          <Botao rotulo="Apagar sugestão" estilo="secundario" onPress={() => setFolha('apagar')} />
        ) : null}
        {!s.minha && publicada ? (
          <Botao rotulo="Denunciar" estilo="secundario" onPress={() => setFolha('denunciar')} />
        ) : null}
      </>
    );
  }

  return (
    <TelaComunidade titulo="Sugestão" voltar="Sugestões" aviso={aviso}>
      {corpo}
      <Folha
        visivel={folha === 'denunciar'}
        onFechar={() => setFolha(null)}
        titulo="Denunciar sugestão?"
        descricao="Conte o que há de errado, se quiser. Com 3 denúncias ela sai do ar até ser revisada."
      >
        <CampoTexto
          placeholder="Motivo (opcional)"
          value={motivo}
          onChangeText={setMotivo}
          maxLength={LIMITES.motivoMax}
          acessibilidade="Motivo da denúncia"
        />
        <Botao
          rotulo="Denunciar"
          onPress={() => fazer(() => denunciar(id, motivo), 'Denúncia enviada. Obrigado por avisar.')}
          estado={ocupado ? 'desabilitado' : 'normal'}
          disabled={ocupado}
        />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setFolha(null)} />
      </Folha>
      <Folha
        visivel={folha === 'apagar'}
        onFechar={() => setFolha(null)}
        titulo="Apagar sugestão?"
        descricao="Ela ainda não foi revisada, então ninguém mais viu. Não dá para desfazer."
      >
        <Botao
          rotulo="Apagar"
          onPress={() => fazer(() => apagarMinhaSugestao(id), 'Sugestão apagada.', () => router.back())}
          estado={ocupado ? 'desabilitado' : 'normal'}
          disabled={ocupado}
        />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setFolha(null)} />
      </Folha>
    </TelaComunidade>
  );
}

const styles = StyleSheet.create({
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16], borderRadius: radius.card },
  coluna: { flexDirection: 'column', alignItems: 'stretch', gap: space[8] },
  resposta: { borderLeftWidth: 3 },
  flex: { flex: 1, gap: space[4] },
});
