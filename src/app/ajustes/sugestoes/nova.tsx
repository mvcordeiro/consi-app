import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, CampoTexto, Filtro, Texto, useAviso } from '@/components';
import { CardSugestao, mensagemErro, NOME_CATEGORIA, TelaAjustes } from '@/components/comunidade';
import { buscarParecidas, enviarSugestao } from '@/data/nuvem/sugestoes';
import { CATEGORIAS_SUGESTAO, LIMITES, type CategoriaSugestao, type Sugestao } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

/** Espera a pessoa parar de digitar antes de procurar parecidas. */
const ESPERA_BUSCA = 500;

/**
 * Nova sugestão: título (5 a 80 caracteres), descrição opcional (até 1000) e categoria.
 * Enquanto a pessoa escreve o título, mostra sugestões parecidas para ela votar em vez de
 * duplicar. Depois de enviar, explica que a ideia passa por revisão antes de ficar pública.
 */
export default function NovaSugestao() {
  const { cores } = useTema();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaSugestao | null>(null);
  const [parecidas, setParecidas] = useState<Sugestao[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  const t = titulo.trim();
  const tituloValido = t.length >= LIMITES.tituloMin && t.length <= LIMITES.tituloMax;
  // Com título curto demais a busca não roda: a lista some sem precisar limpar o estado.
  const mostrarParecidas = t.length >= LIMITES.tituloMin && parecidas.length > 0;

  useEffect(() => {
    if (t.length < LIMITES.tituloMin) return;
    let vivo = true;
    const timer = setTimeout(() => {
      buscarParecidas(t, 3)
        .then((r) => vivo && setParecidas(r.filter((s) => s.moderacao === 'publicada')))
        .catch(() => vivo && setParecidas([]));
    }, ESPERA_BUSCA);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [t]);

  const enviar = async () => {
    if (!tituloValido || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviarSugestao({ titulo: t, descricao: descricao.trim() || undefined, categoria });
      setEnviada(true);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  if (enviada) {
    return (
      <TelaAjustes titulo="Recebemos sua ideia" voltar="Sugestões" rodape={<Botao rotulo="Voltar para as sugestões" onPress={() => router.back()} />}>
        <Texto cor={cores.text.secondary}>
          Obrigado! Ela aparece para todos depois de revisada. Enquanto isso, você acompanha em Sugestões → Minhas.
        </Texto>
      </TelaAjustes>
    );
  }

  return (
    <TelaAjustes
      titulo="Nova sugestão"
      voltar="Sugestões"
      aviso={aviso}
      rodape={
        <>
          {erro ? (
            <Texto estilo="Texto/Pequeno" cor={cores.feedback.error} accessibilityLiveRegion="assertive">
              {erro}
            </Texto>
          ) : null}
          <Botao
            rotulo={enviando ? 'Enviando…' : 'Enviar sugestão'}
            onPress={enviar}
            estado={tituloValido && !enviando ? 'normal' : 'desabilitado'}
            disabled={!tituloValido || enviando}
          />
        </>
      }
    >
      <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
        Conte o que você gostaria que o Consi fizesse. Sem dados pessoais: a sugestão fica pública depois de revisada.
      </Texto>

      <CampoTexto
        titulo="Título"
        rotulo={`${t.length}/${LIMITES.tituloMax}`}
        placeholder="Ex.: Lembrete para beber água na pausa"
        value={titulo}
        onChangeText={setTitulo}
        maxLength={LIMITES.tituloMax}
        returnKeyType="next"
        acessibilidade="Título da sugestão"
        erro={t.length > 0 && t.length < LIMITES.tituloMin ? `Use pelo menos ${LIMITES.tituloMin} caracteres.` : undefined}
      />

      {mostrarParecidas ? (
        <View style={styles.bloco} accessibilityLiveRegion="polite">
          <Texto estilo="Títulos/Pequeno">Já existe algo assim?</Texto>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            Se uma destas for a sua ideia, vote nela: ideias com mais votos sobem na fila.
          </Texto>
          {parecidas.map((s) => (
            <CardSugestao
              key={s.id}
              sugestao={s}
              onAbrir={() => router.push({ pathname: '/ajustes/sugestoes/[id]', params: { id: s.id } })}
              onMudar={(m) => setParecidas((l) => l.map((x) => (x.id === s.id ? { ...x, ...m } : x)))}
              onErro={mostrarAviso}
            />
          ))}
        </View>
      ) : null}

      <CampoTexto
        titulo="Detalhes (opcional)"
        rotulo={`${descricao.length}/${LIMITES.descricaoMax}`}
        placeholder="Quando isso ajudaria? Como você imagina?"
        value={descricao}
        onChangeText={setDescricao}
        maxLength={LIMITES.descricaoMax}
        multiline
        alturaMinima={120}
        acessibilidade="Detalhes da sugestão"
      />

      <View style={styles.bloco}>
        <Texto estilo="Títulos/Pequeno">Sobre qual parte do app?</Texto>
        <View style={styles.opcoes} accessibilityRole="radiogroup">
          {CATEGORIAS_SUGESTAO.map((c) => (
            <Filtro key={c} rotulo={NOME_CATEGORIA[c]} ativo={categoria === c} onPress={() => setCategoria(categoria === c ? null : c)} />
          ))}
        </View>
      </View>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space[8] },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
