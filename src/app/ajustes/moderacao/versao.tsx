import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Alternancia, Botao, CampoTexto, Filtro, Folha, Texto, useAviso } from '@/components';
import { Carregando, FalhaNuvem, mensagemErro, NOME_ITEM, TelaAjustes, useCarregar } from '@/components/comunidade';
import { apagarVersao, criarVersao, editarVersao, listarVersoes } from '@/data/nuvem/moderacao';
import type { ItemVersao, TipoItemVersao, Versao } from '@/data/nuvem/tipos';
import { space, useTema } from '@/theme';

const TIPOS: TipoItemVersao[] = ['novo', 'melhoria', 'correcao'];
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Criar ou editar uma nota de versão (changelog). Sem `id`, cria. Itens por tipo (Novo, Melhorias,
 * Correções); só aparece em Novidades depois de "Publicada" ligada. Rascunhos ficam só aqui.
 */
export default function EditarVersao() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { dados, erro, carregando, tentarDeNovo } = useCarregar(
    async () => (id ? ((await listarVersoes()).find((v) => v.id === id) ?? null) : null),
    [id],
  );

  if (id && carregando) return <TelaAjustes titulo="Versão" voltar="Moderação"><Carregando /></TelaAjustes>;
  if (id && erro) return <TelaAjustes titulo="Versão" voltar="Moderação"><FalhaNuvem erro={erro} onTentar={tentarDeNovo} /></TelaAjustes>;
  return <Formulario key={dados?.id ?? 'nova'} inicial={dados} />;
}

function Formulario({ inicial }: { inicial: Versao | null }) {
  const { cores } = useTema();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [versao, setVersao] = useState(inicial?.versao ?? '');
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [data, setData] = useState(inicial?.data ?? hoje());
  const [itens, setItens] = useState<ItemVersao[]>(inicial?.itens.length ? inicial.itens : [{ tipo: 'novo', texto: '' }]);
  const [publicada, setPublicada] = useState(inicial?.publicada ?? false);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const itensValidos = itens.map((i) => ({ ...i, texto: i.texto.trim() })).filter((i) => i.texto);
  const valido = versao.trim().length > 0 && DATA_VALIDA.test(data) && itensValidos.length > 0;

  const mudarItem = (i: number, mudanca: Partial<ItemVersao>) => setItens((l) => l.map((x, j) => (j === i ? { ...x, ...mudanca } : x)));

  const salvar = async () => {
    if (!valido || ocupado) return;
    setOcupado(true);
    try {
      const dados = { versao, titulo: titulo || null, data, itens: itensValidos, publicada };
      if (inicial) await editarVersao(inicial.id, dados);
      else await criarVersao(dados);
      router.back();
    } catch (e) {
      mostrarAviso(mensagemErro(e));
      setOcupado(false);
    }
  };

  const apagar = async () => {
    if (!inicial) return;
    setOcupado(true);
    try {
      await apagarVersao(inicial.id);
      router.back();
    } catch (e) {
      mostrarAviso(mensagemErro(e));
      setOcupado(false);
    }
  };

  return (
    <TelaAjustes
      titulo={inicial ? `Versão ${inicial.versao}` : 'Nova versão'}
      voltar="Moderação"
      aviso={aviso}
      rodape={<Botao rotulo={ocupado ? 'Salvando…' : 'Salvar'} onPress={salvar} estado={valido && !ocupado ? 'normal' : 'desabilitado'} disabled={!valido || ocupado} />}
    >
      <View style={styles.linha}>
        <View style={styles.flex}>
          <CampoTexto titulo="Versão" value={versao} onChangeText={setVersao} placeholder="1.1.0" acessibilidade="Número da versão" />
        </View>
        <View style={styles.flex}>
          <CampoTexto
            titulo="Data"
            value={data}
            onChangeText={setData}
            placeholder="AAAA-MM-DD"
            maxLength={10}
            acessibilidade="Data, no formato ano, mês e dia"
            erro={DATA_VALIDA.test(data) ? undefined : 'Use AAAA-MM-DD'}
          />
        </View>
      </View>
      <CampoTexto titulo="Título (opcional)" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Ajustes do seu jeito" acessibilidade="Título da versão" />

      <View style={[styles.bloco, { borderTopColor: cores.border.subtle }]}>
        <Texto estilo="Títulos/Pequeno">O que mudou</Texto>
        {itens.map((item, i) => (
          <View key={i} style={[styles.item, { borderColor: cores.border.subtle }]}>
            <View style={styles.opcoes}>
              {TIPOS.map((t) => (
                <Filtro key={t} rotulo={NOME_ITEM[t]} ativo={item.tipo === t} onPress={() => mudarItem(i, { tipo: t })} />
              ))}
            </View>
            <CampoTexto value={item.texto} onChangeText={(texto) => mudarItem(i, { texto })} placeholder="Descreva em uma frase, do ponto de vista de quem usa" multiline acessibilidade={`Item ${i + 1}`} />
            {itens.length > 1 ? (
              <Pressable onPress={() => setItens((l) => l.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remover item ${i + 1}`} hitSlop={8}>
                <Texto estilo="Texto/Botões e rótulos" cor={cores.feedback.error}>
                  Remover
                </Texto>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Botao rotulo="Adicionar item" estilo="secundario" onPress={() => setItens((l) => [...l, { tipo: 'novo', texto: '' }])} />
      </View>

      <View style={[styles.bloco, styles.linha, { borderTopColor: cores.border.subtle }]}>
        <View style={styles.flex}>
          <Texto estilo="Títulos/Pequeno">Publicada</Texto>
          <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
            Aparece em Novidades para todos e acende o ponto de “novo” em Ajustes.
          </Texto>
        </View>
        <Alternancia rotulo="Publicada" ligado={publicada} onMudar={setPublicada} />
      </View>

      {inicial ? <Botao rotulo="Apagar versão" estilo="secundario" onPress={() => setConfirmarApagar(true)} /> : null}

      <Folha visivel={confirmarApagar} onFechar={() => setConfirmarApagar(false)} titulo="Apagar versão?" descricao="Sai de Novidades. As sugestões ligadas a ela continuam lançadas, sem versão.">
        <Botao rotulo="Apagar" onPress={apagar} estado={ocupado ? 'desabilitado' : 'normal'} disabled={ocupado} />
        <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setConfirmarApagar(false)} />
      </Folha>
    </TelaAjustes>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  flex: { flex: 1, gap: space[4] },
  bloco: { gap: space[12], paddingTop: space[16], borderTopWidth: 1 },
  item: { gap: space[8], paddingTop: space[12], borderTopWidth: 1 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
});
