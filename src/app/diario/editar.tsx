import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao, Folha } from '@/components';
import { deixarAviso } from '@/components/diario/avisoPendente';
import { EditorMomento } from '@/components/diario/EditarMomento';
import { apagarMomento, atualizarMomento, restaurarMomento, useMomentos } from '@/data/momentos';
import { space, useTema } from '@/theme';

/**
 * Editar momento (Figma 760:6339) — a mesma tela de edição para quem chega pela lista ou
 * pela linha do tempo (sempre a partir da entrada aberta, /diario/momento).
 * Salvar volta para a entrada com "Alterações salvas" e Desfazer; Cancelar com alterações
 * pergunta antes de descartar; Apagar pede confirmação e volta para a tela de antes da entrada.
 */
export default function EditarMomento() {
  const { cores } = useTema();
  const { em } = useLocalSearchParams<{ em: string }>();
  const todos = useMomentos();
  const momento = todos.find((m) => m.em === Number(em));
  const marcadoresUsados = useMemo(() => [...new Set(todos.flatMap((m) => m.marcadores ?? []))], [todos]);
  const [descartar, setDescartar] = useState(false);
  const [apagar, setApagar] = useState(false);

  if (!momento) return <View style={[styles.tela, { backgroundColor: cores.bg.sunken }]} />;

  const confirmarApagar = () => {
    setApagar(false);
    const antes = momento;
    apagarMomento(antes.em);
    deixarAviso({ titulo: 'Momento apagado', momento: antes, desfazer: () => restaurarMomento(antes) });
    // fecha a edição e a entrada (que não existe mais)
    router.dismiss(2);
  };

  return (
    <View style={styles.tela}>
      <EditorMomento
        key={momento.em}
        momento={momento}
        marcadoresUsados={marcadoresUsados}
        onFechar={(alterado) => (alterado ? setDescartar(true) : router.back())}
        onSalvar={(emAntes, mudancas) => {
          const antes = momento;
          atualizarMomento(emAntes, mudancas);
          const depois = { ...antes, ...mudancas };
          deixarAviso({
            titulo: 'Alterações salvas',
            momento: depois,
            desfazer: () => {
              // volta exatamente ao que era (inclusive o horário)
              apagarMomento(depois.em).then(() => restaurarMomento(antes));
            },
          });
          // se o horário mudou, a entrada aberta acha o momento pelo novo instante (emAtual)
          router.back();
        }}
        onApagar={() => setApagar(true)}
      />

      <Folha
        visivel={descartar}
        onFechar={() => setDescartar(false)}
        titulo="Descartar alterações?"
        descricao="O que você mudou neste momento não será salvo."
      >
        <View style={styles.botoes}>
          <Botao rotulo="Continuar editando" onPress={() => setDescartar(false)} />
          <Botao
            rotulo="Descartar"
            estilo="secundario"
            estado="erro"
            onPress={() => {
              setDescartar(false);
              router.back();
            }}
          />
        </View>
      </Folha>

      <Folha
        visivel={apagar}
        onFechar={() => setApagar(false)}
        titulo="Apagar este momento?"
        descricao="Ele sai do seu diário e da sua semana. Você ainda pode desfazer logo depois."
      >
        <View style={styles.botoes}>
          <Botao rotulo="Apagar momento" estado="erro" onPress={confirmarApagar} />
          <Botao rotulo="Manter" estilo="secundario" onPress={() => setApagar(false)} />
        </View>
      </Folha>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  botoes: { gap: space[12] },
});
