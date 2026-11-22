import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { Carregando, dataLonga, FalhaNuvem, NOME_ITEM, TelaComunidade, useCarregar, Vazio } from '@/components/comunidade';
import { listarNovidades, marcarNovidadesVistas } from '@/data/nuvem/novidades';
import type { TipoItemVersao, Versao } from '@/data/nuvem/tipos';
import { radius, space, useTema } from '@/theme';

const ORDEM_ITENS: TipoItemVersao[] = ['novo', 'melhoria', 'correcao'];

/**
 * Ajustes → Novidades: o que mudou em cada versão publicada, da mais nova para a mais antiga.
 * Abre offline com a última cópia (e avisa). Ao abrir, marca a versão mais nova como vista,
 * o que apaga o ponto de "novo" em Ajustes.
 */
export default function Novidades() {
  const { cores } = useTema();
  const { dados, erro, carregando, tentarDeNovo } = useCarregar(() => listarNovidades(), []);

  useEffect(() => {
    if (dados?.versoes.length) void marcarNovidadesVistas(dados.versoes);
  }, [dados]);

  let corpo;
  if (carregando) corpo = <Carregando rotulo="Carregando novidades" />;
  else if (erro || !dados) corpo = <FalhaNuvem erro={erro} onTentar={tentarDeNovo} />;
  else if (!dados.versoes.length) corpo = <Vazio titulo="Nenhuma novidade ainda" descricao="Quando sair uma versão nova, o que mudou aparece aqui." />;
  else
    corpo = (
      <>
        {dados.origem === 'cache' ? (
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} accessibilityLiveRegion="polite">
            Sem conexão: mostrando a última lista salva.
          </Texto>
        ) : null}
        {dados.versoes.map((v, i) => (
          <CartaoVersao key={v.id} versao={v} maisNova={i === 0} />
        ))}
      </>
    );

  return <TelaComunidade titulo="Novidades">{corpo}</TelaComunidade>;
}

function CartaoVersao({ versao, maisNova }: { versao: Versao; maisNova: boolean }) {
  const { cores } = useTema();
  return (
    <View style={[styles.cartao, { backgroundColor: cores.bg.raised }]} accessible={false}>
      <View style={styles.topo}>
        <Texto estilo="Texto/Botões e rótulos" cor={cores.text.tertiary}>
          {`VERSÃO ${versao.versao}${maisNova ? ' · ATUAL' : ''}`}
        </Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {dataLonga(versao.data)}
        </Texto>
      </View>
      {versao.titulo ? (
        <Texto estilo="Títulos/Pequeno" accessibilityRole="header">
          {versao.titulo}
        </Texto>
      ) : null}

      {ORDEM_ITENS.map((tipo) => {
        const itens = versao.itens.filter((i) => i.tipo === tipo);
        if (!itens.length) return null;
        return (
          <View key={tipo} style={styles.grupo}>
            <Texto estilo="Texto/Botões e rótulos">{NOME_ITEM[tipo]}</Texto>
            {itens.map((item, i) => (
              <View key={i} style={styles.item}>
                <Texto cor={cores.text.secondary}>•</Texto>
                <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.flex}>
                  {item.texto}
                </Texto>
              </View>
            ))}
          </View>
        );
      })}

      {versao.sugestoes.length ? (
        <View style={[styles.grupo, styles.ideias, { borderTopColor: cores.border.subtle }]}>
          <Texto estilo="Texto/Botões e rótulos">Ideias da comunidade</Texto>
          {versao.sugestoes.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: '/ajustes/sugestoes/[id]', params: { id: s.id } })}
              accessibilityRole="link"
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            >
              <Texto estilo="Texto/Pequeno" cor={cores.text.link} style={styles.flex}>
                {s.titulo}
              </Texto>
              <Texto estilo="Texto/Pequeno" cor={cores.icon.secondary}>
                ›
              </Texto>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: space[12], padding: space[16], borderRadius: radius.card },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[8] },
  grupo: { gap: space[4] },
  item: { flexDirection: 'row', gap: space[8], alignItems: 'flex-start', minHeight: 24 },
  ideias: { borderTopWidth: 1, paddingTop: space[12] },
  flex: { flex: 1 },
});
