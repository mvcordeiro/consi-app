import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATEGORIAS_ICONES, type Grupo } from '@/data/gruposHome';
import { radius, space, useTema } from '@/theme';

import { CampoTexto } from '../CampoTexto';
import { Filtro } from '../Filtro';
import { Folha } from '../Folha';
import { Icone, type NomeIcone } from '../Icone';
import { Texto } from '../Texto';

/** Nome legível do ícone para a busca e o leitor de tela ("rosto-positivo" → "rosto positivo"). */
const nomeDoIcone = (i: NomeIcone) => i.replace(/^hobby-/, '').replace(/-/g, ' ');
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const TODOS = 'Todos';

/**
 * Ícone do grupo: busca no topo, abas por assunto (Todos, Lazer, Música e vídeo…) e a grade.
 * O escolhido fica em action/primary. A busca procura no nome do ícone e no assunto.
 */
export function FolhaIcone({
  visivel,
  atual,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  atual: Grupo['icone'];
  onFechar: () => void;
  onEscolher: (i: Grupo['icone']) => void;
}) {
  const { cores } = useTema();
  const [aba, setAba] = useState(TODOS);
  const [busca, setBusca] = useState('');

  const icones = useMemo(() => {
    const termo = semAcento(busca.trim());
    const lista = CATEGORIAS_ICONES.filter((c) => aba === TODOS || c.nome === aba).flatMap((c) =>
      c.icones.map((i) => ({ i, categoria: c.nome })),
    );
    const unicos = lista.filter((x, n) => lista.findIndex((y) => y.i === x.i) === n);
    return termo
      ? unicos.filter(({ i, categoria }) => semAcento(`${nomeDoIcone(i)} ${categoria}`).includes(termo))
      : unicos;
  }, [aba, busca]);

  return (
    <Folha visivel={visivel} onFechar={onFechar} titulo="Ícone do grupo">
      <CampoTexto value={busca} onChangeText={setBusca} placeholder="Buscar ícone" acessibilidade="Buscar ícone" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abas}>
        {[TODOS, ...CATEGORIAS_ICONES.map((c) => c.nome)].map((nome) => (
          <Filtro key={nome} rotulo={nome} ativo={aba === nome} onPress={() => setAba(nome)} />
        ))}
      </ScrollView>
      <ScrollView style={styles.rolagem} keyboardShouldPersistTaps="handled">
        {icones.length ? (
          <View style={styles.grade}>
            {icones.map(({ i }) => {
              const ativo = i === atual;
              return (
                <Pressable
                  key={i}
                  onPress={() => onEscolher(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={nomeDoIcone(i)}
                  style={({ pressed }) => [
                    styles.opcao,
                    {
                      backgroundColor: ativo ? cores.action.primary.default : cores.bg.base,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icone nome={i} tamanho={24} cor={ativo ? cores.text['on-primary'] : undefined} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Texto estilo="Texto/Pequeno" cor={cores.text.tertiary} style={styles.vazio}>
            Nenhum ícone com esse nome.
          </Texto>
        )}
      </ScrollView>
    </Folha>
  );
}

const styles = StyleSheet.create({
  abas: { gap: space[8], paddingVertical: space[4] },
  rolagem: { maxHeight: 340 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12], justifyContent: 'center', paddingVertical: space[4] },
  opcao: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  vazio: { textAlign: 'center', paddingVertical: space[24] },
});
