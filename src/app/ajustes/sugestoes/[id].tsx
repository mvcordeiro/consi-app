import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Folha, Texto, useAviso } from '@/components';
import { Divisoria } from '@/components/ajustes';
import {
  BotoesVoto,
  Carregando,
  Chip,
  ChipModeracao,
  ChipStatus,
  FalhaNuvem,
  mensagemErro,
  NOME_CATEGORIA,
  quando,
  RespostaConsi,
  TelaAjustes,
  useCarregar,
  Vazio,
} from '@/components/comunidade';
import { apagarMinhaSugestao, denunciar, detalheSugestao } from '@/data/nuvem/sugestoes';
import { LIMITES } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

/**
 * Detalhe de uma sugestão. O título da sugestão é o título da página; embaixo, chips (status e
 * categoria) e "Enviada …"; depois a descrição, os votos, a resposta do Consi como mensagem e a
 * versão em que saiu. Quem enviou vê a revisão e pode apagar enquanto pendente; os outros podem
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
        {/* Cabeçalho: título, chips e quando */}
        <View style={styles.cabecalho}>
          <Texto estilo="Títulos/Grande" accessibilityRole="header">
            {s.titulo}
          </Texto>
          <View style={styles.chips}>
            {publicada ? <ChipStatus status={s.status} /> : <ChipModeracao moderacao={s.moderacao} />}
            {s.categoria ? <Chip rotulo={NOME_CATEGORIA[s.categoria]} /> : null}
          </View>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            {`Enviada ${quando(s.criadaEm)}${s.minha ? ' por você' : ''}`}
          </Texto>
        </View>

        {s.descricao ? <Texto cor={cores.text.secondary}>{s.descricao}</Texto> : null}

        {publicada ? (
          <View style={styles.votos}>
            <BotoesVoto sugestao={s} desligado={s.minha} onMudar={(m) => setDados((d) => (d ? { ...d, ...m } : d))} onErro={mostrarAviso} />
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              {s.minha ? 'Você não vota na sua própria ideia' : `${s.votosPos} a favor · ${s.votosNeg} contra`}
            </Texto>
          </View>
        ) : s.minha && s.moderacao === 'pendente' ? (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            Só você vê esta sugestão por enquanto. Ela fica pública depois de revisada.
          </Texto>
        ) : null}

        {s.resposta || s.versao ? <Divisoria /> : null}

        {s.resposta ? <RespostaConsi texto={s.resposta} titulo={publicada ? 'Consi respondeu' : 'Motivo da revisão'} /> : null}

        {s.versao ? (
          <Botao rotulo={`Saiu na versão ${s.versao.versao}`} estilo="secundario" onPress={() => router.push('/ajustes/novidades' as Href)} />
        ) : null}

        {/* Ação discreta no fim, só para quem pode */}
        {(s.minha && s.moderacao === 'pendente') || (!s.minha && publicada) ? (
          <Pressable
            onPress={() => setFolha(s.minha ? 'apagar' : 'denunciar')}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.acaoDiscreta, pressed && { opacity: 0.6 }]}
          >
            <Texto estilo="Texto/Botões e rótulos" cor={s.minha ? cores.feedback.error : cores.text.tertiary}>
              {s.minha ? 'Apagar sugestão' : 'Denunciar sugestão'}
            </Texto>
          </Pressable>
        ) : null}
      </>
    );
  }

  return (
    <TelaAjustes voltar="Sugestões" aviso={aviso}>
      <View style={styles.pagina}>{corpo}</View>
      <Folha
        visivel={folha === 'denunciar'}
        onFechar={() => setFolha(null)}
        titulo="Denunciar sugestão?"
        descricao="Conte o que há de errado, se quiser. Com 3 denúncias ela sai do ar até ser revisada."
      >
        <CampoTexto placeholder="Motivo (opcional)" value={motivo} onChangeText={setMotivo} maxLength={LIMITES.motivoMax} acessibilidade="Motivo da denúncia" />
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
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  pagina: { gap: space[24] },
  cabecalho: { gap: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  votos: { flexDirection: 'row', alignItems: 'center', gap: space[12], marginLeft: -space[8] },
  acaoDiscreta: { alignSelf: 'center', paddingVertical: space[8], marginTop: space[16] },
});
