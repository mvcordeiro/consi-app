import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao, CabecalhoVoltar, Folha, Icone, Texto, useAviso } from '@/components';
import { Aparecer } from '@/components/animacao';
import { IconeHobby } from '@/components/hobbies';
import { hobbyInfo, type HobbyId } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import { inset, radius, space, useTema } from '@/theme';

/**
 * Seus hobbies ("•••" de Suas atividades; sem design no Figma).
 * A lista dos hobbies da pessoa, cada um com a lixeira para remover (com confirmação e
 * Desfazer). As atividades do hobby removido ficam guardadas e voltam se ele for adicionado
 * de novo. Pelo menos um hobby precisa ficar.
 */
export default function EditarHobbies() {
  const { cores } = useTema();
  const h = useHobbies();
  const [aviso, mostrarAviso] = useAviso({ comBarra: false });
  const [removendo, setRemovendo] = useState<HobbyId | null>(null);
  // Mantém o nome na folha enquanto ela anima a saída.
  const [ultimo, setUltimo] = useState<HobbyId | null>(null);
  if (removendo && removendo !== ultimo) setUltimo(removendo);

  if (!h.carregado) return null;

  const nome = ultimo ? hobbyInfo(ultimo).nome : '';
  const guardadas = h.atividades.filter((a) => a.hobby === ultimo).length;
  const descricao =
    `${nome} sai de Para você e de Suas atividades. ` +
    (guardadas
      ? `${guardadas === 1 ? 'A sua atividade fica guardada e volta' : `As suas ${guardadas} atividades ficam guardadas e voltam`} se você adicionar o hobby de novo.`
      : 'Você pode adicionar o hobby de novo quando quiser.');

  const remover = () => {
    if (!removendo) return;
    const antes = h.hobbies;
    setRemovendo(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    h.definirHobbies(antes.filter((x) => x !== removendo));
    mostrarAviso(`${hobbyInfo(removendo).nome} saiu dos seus hobbies`, {
      rotulo: 'Desfazer',
      onPress: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        h.definirHobbies(antes);
      },
    });
  };

  const unico = h.hobbies.length === 1;

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Hobbies" />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Aparecer style={styles.textos}>
          <Texto estilo="Títulos/Grande">Seus hobbies</Texto>
          <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
            Os hobbies que aparecem em Para você e em Suas atividades. Remova os que não fazem mais sentido ou explore novos.
          </Texto>
        </Aparecer>
        <View style={styles.lista}>
          {h.hobbies.map((hb, i) => (
            <Aparecer key={hb} atraso={100 + i * 60}>
              <View style={[styles.linha, { backgroundColor: cores.bg.raised }]}>
                <View style={styles.icone}>
                  <IconeHobby hobby={hb} caixa={24} />
                </View>
                <View style={styles.flex}>
                  <Texto estilo="Texto/Médio">{hobbyInfo(hb).nome}</Texto>
                  {unico ? (
                    <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                      Mantenha pelo menos um hobby
                    </Texto>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setRemovendo(hb)}
                  disabled={unico}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${hobbyInfo(hb).nome}`}
                  accessibilityState={{ disabled: unico }}
                  style={({ pressed }) => [
                    styles.lixeira,
                    { backgroundColor: pressed ? cores.bg.base : 'transparent', opacity: unico ? 0.4 : 1 },
                  ]}
                >
                  <Icone nome="lixeira" tamanho={20} cor={unico ? cores.text.disabled : cores.feedback.error} />
                </Pressable>
              </View>
            </Aparecer>
          ))}
        </View>
        <Botao
          rotulo="Explorar mais hobbies"
          estilo="secundario"
          icone={(cor) => <Icone nome="adicionar" tamanho={20} cor={cor} />}
          onPress={() => router.replace('/hobby/novo')}
        />
      </ScrollView>

      <Folha visivel={!!removendo} onFechar={() => setRemovendo(null)} titulo={`Remover ${nome}?`} descricao={descricao}>
        <View style={styles.botoes}>
          <Botao rotulo="Remover" estado="erro" onPress={remover} />
          <Botao rotulo="Cancelar" estilo="secundario" onPress={() => setRemovendo(null)} />
        </View>
      </Folha>
      {aviso}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  margemTopo: { paddingHorizontal: inset.md },
  conteudo: { padding: inset.lg, gap: space[32] },
  textos: { gap: space[8] },
  lista: { gap: space[12] },
  linha: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    paddingHorizontal: inset.md,
    paddingVertical: space[12],
    borderRadius: radius.card,
  },
  icone: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  lixeira: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  botoes: { gap: space[12] },
});
