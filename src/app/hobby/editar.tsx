import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alternancia, Botao, CabecalhoVoltar, Icone, Texto } from '@/components';
import { Aparecer } from '@/components/animacao';
import { IconeHobby } from '@/components/hobbies';
import { catalogoHobbies, hobbyInfo } from '@/data/catalogo';
import { useHobbies } from '@/data/hobbiesEstado';
import type { Hobby } from '@/data/onboarding';
import { inset, radius, space, useTema } from '@/theme';

const TODOS: Hobby[] = catalogoHobbies.map((x) => x.id);


/**
 * Seus hobbies (engrenagem de "Suas atividades"; sem design no Figma).
 * Liga e desliga os hobbies que aparecem nos filtros e nas abas, com o
 * "Controle / Alternância" do Design System. Pelo menos um precisa ficar ligado.
 */
export default function EditarHobbies() {
  const h = useHobbies();
  // Espera os hobbies gravados carregarem antes de montar a lista (senão ela começa com os padrão).
  return h.carregado ? <Lista inicial={h.hobbies} /> : null;
}

function Lista({ inicial }: { inicial: Hobby[] }) {
  const { cores } = useTema();
  const h = useHobbies();
  const [escolhidos, setEscolhidos] = useState<Hobby[]>(inicial);
  // Os desligados continuam na lista até salvar, para dar para religar.
  const [lista] = useState<Hobby[]>(inicial);

  const alternar = (hb: Hobby, ligar: boolean) =>
    setEscolhidos((atual) =>
      ligar ? TODOS.filter((x) => x === hb || atual.includes(x)) : atual.filter((x) => x !== hb),
    );

  const salvar = () => {
    h.definirHobbies(escolhidos);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Ajustes" />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Aparecer style={styles.textos}>
          <Texto estilo="Títulos/Grande">Seus hobbies</Texto>
          <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
            Os hobbies que aparecem em Para você e em Suas atividades. Desligue os que não fazem mais sentido ou explore novos.
          </Texto>
        </Aparecer>
        <View style={styles.lista}>
          {lista.map((hb, i) => {
            const ligado = escolhidos.includes(hb);
            const ultimo = ligado && escolhidos.length === 1;
            return (
              <Aparecer key={hb} atraso={100 + i * 60}>
                <View style={[styles.linha, { backgroundColor: cores.bg.raised }]}>
                  <View style={styles.icone}>
                    <IconeHobby hobby={hb} caixa={24} />
                  </View>
                  <View style={styles.flex}>
                    <Texto estilo="Texto/Médio">{hobbyInfo(hb).nome}</Texto>
                    {ultimo ? (
                      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                        Mantenha pelo menos um hobby
                      </Texto>
                    ) : null}
                  </View>
                  <Alternancia
                    ligado={ligado}
                    rotulo={hobbyInfo(hb).nome}
                    onMudar={(v) => (ultimo ? undefined : alternar(hb, v))}
                  />
                </View>
              </Aparecer>
            );
          })}
        </View>
        <Botao
          rotulo="Explorar mais hobbies"
          estilo="secundario"
          icone={(cor) => <Icone nome="adicionar" tamanho={20} cor={cor} />}
          onPress={() => {
            h.definirHobbies(escolhidos);
            router.replace('/hobby/novo');
          }}
        />
      </ScrollView>
      <View style={styles.rodape}>
        <Botao rotulo="Salvar" corRotulo={cores.text['on-primary']} onPress={salvar} />
      </View>
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
  rodape: { paddingHorizontal: inset.lg, paddingTop: space[12], paddingBottom: space[8] },
});
