import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alternancia, Botao, CabecalhoVoltar, Icone, Texto } from '@/components';
import { Aparecer } from '@/components/animacao';
import { definirOcultos, ID_LIVRE, MODOS, useGrupos } from '@/data/gruposHome';
import { inset, radius, space, useTema } from '@/theme';

/**
 * Grupos na Home (engrenagem de "Aplicativos e hobbies"; sem design no Figma).
 * Liga e desliga quais grupos aparecem na Home, com o "Controle / Alternância" do DS.
 * "Livre" é fixo: sempre aparece.
 */
export default function GruposHome() {
  const { cores } = useTema();
  const grupos = useGrupos();
  const [ocultos, setOcultos] = useState(() => grupos.filter((g) => g.oculto).map((g) => g.id));

  const salvar = () => {
    definirOcultos(ocultos);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: cores.bg.base }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.margemTopo}>
        <CabecalhoVoltar rotulo="Ajustes" />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Aparecer style={styles.textos}>
          <Texto estilo="Títulos/Grande">Grupos na Home</Texto>
          <Texto estilo="Texto/Médio" cor={cores.text.secondary}>
            Escolha quais grupos aparecem em Aplicativos e hobbies. As regras continuam valendo para os grupos
            escondidos. O grupo Livre fica sempre fixado.
          </Texto>
        </Aparecer>
        <View style={styles.lista}>
          {grupos.map((g, i) => {
            const fixo = g.id === ID_LIVRE;
            const ligado = !ocultos.includes(g.id);
            return (
              <Aparecer key={g.id} atraso={100 + i * 60}>
                <View style={[styles.linha, { backgroundColor: cores.bg.raised }]}>
                  <View style={styles.icone}>
                    <Icone nome={g.icone} tamanho={24} />
                  </View>
                  <View style={styles.flex}>
                    <Texto estilo="Texto/Médio">{g.nome}</Texto>
                    <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
                      {fixo ? `Fixado · ${MODOS[g.modo].nome}` : MODOS[g.modo].nome}
                    </Texto>
                  </View>
                  {fixo ? (
                    <Icone nome="cadeado" tamanho={20} cor={cores.text.tertiary} />
                  ) : (
                    <Alternancia
                      ligado={ligado}
                      rotulo={g.nome}
                      onMudar={(v) => setOcultos((o) => (v ? o.filter((x) => x !== g.id) : [...o, g.id]))}
                    />
                  )}
                </View>
              </Aparecer>
            );
          })}
        </View>
        <Botao
          rotulo="Criar grupo"
          estilo="secundario"
          icone={(cor) => <Icone nome="adicionar" tamanho={20} cor={cor} />}
          onPress={() => {
            definirOcultos(ocultos);
            router.replace('/grupo/criar');
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
