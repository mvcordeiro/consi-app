import { Image, Pressable, StyleSheet, View } from 'react-native';

import { grupos, type Grupo } from '@/data/home';
import { borderWidth, primitivas, radius, space, useTema, type Cores } from '@/theme';

import { Etiqueta, fundoDoTom } from '../Etiqueta';
import { Texto } from '../Texto';

/** V3 - Grade de grupos — grupos de apps por hobby, dois por linha, e o card "Criar grupo". */
export function Grupos({ onAbrir, onCriar }: { onAbrir: (g: Grupo) => void; onCriar: () => void }) {
  const { cores } = useTema();
  const itens: (Grupo | 'criar')[] = [...grupos, 'criar'];
  const linhas: (Grupo | 'criar')[][] = [];
  for (let i = 0; i < itens.length; i += 2) linhas.push(itens.slice(i, i + 2));

  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <Texto estilo="Títulos/Médio">Aplicativos e hobbies</Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Crie grupos por hobby e personalize os limites de cada um.
        </Texto>
      </View>
      <View style={styles.meta}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.flex}>
          SEUS GRUPOS
        </Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={[styles.flex, styles.direita]}>
          Escolha uma categoria
        </Texto>
      </View>
      <View style={styles.grade}>
        {linhas.map((linha, i) => (
          <View key={i} style={styles.linha}>
            {/* Cada card numa coluna sem padding: assim as duas colunas têm sempre a mesma largura. */}
            {linha.map((item) => (
              <View key={item === 'criar' ? 'criar' : item.id} style={styles.coluna}>
                {item === 'criar' ? (
                  <CardCriarGrupo onPress={onCriar} />
                ) : (
                  <CardGrupo grupo={item} onPress={() => onAbrir(item)} />
                )}
              </View>
            ))}
            {linha.length === 1 ? <View style={styles.flex} /> : null}
          </View>
        ))}
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.centro}>
        Selecione uma categoria para visualizar ou ajustar seus limites.
      </Texto>
    </View>
  );
}

function corDoHobby(c: Cores, tom: Grupo['tom']) {
  if (tom === 'sucesso') return c.feedback.success;
  if (tom === 'info') return c.feedback.info;
  return c.feedback.warning;
}

/** Group tile — ícone do hobby, quantidade de apps, nome, ícones dos apps e limite. */
function CardGrupo({ grupo, onPress }: { grupo: Grupo; onPress: () => void }) {
  const { cores } = useTema();
  const Icone = grupo.icone;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${grupo.nome}, ${grupo.apps.length} apps, ${grupo.limite.rotulo}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cores.bg.raised, borderColor: cores.border.focus, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.topo}>
        <View style={[styles.marcador, { backgroundColor: fundoDoTom(cores, grupo.tom) }]}>
          <Icone width={19} height={19} corTraco={corDoHobby(cores, grupo.tom)} />
        </View>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
          {grupo.apps.length} apps
        </Texto>
      </View>
      <View style={styles.meio}>
        <Texto estilo="Títulos/Pequeno">{grupo.nome}</Texto>
        <View style={[styles.apps, { gap: grupo.espacoApps ?? space[4] }]}>
          {grupo.apps.map((app, i) => (
            <View
              key={i}
              style={[
                styles.app,
                // #D6D6D6 no Figma → o primitivo neutro mais próximo
                { backgroundColor: app.fundo === 'escuro' ? cores.bg.sunken : primitivas.neutral[200] },
              ]}
            >
              <Image source={app.imagem} style={{ width: app.tamanho, height: app.tamanho }} resizeMode="cover" />
            </View>
          ))}
        </View>
      </View>
      <Etiqueta rotulo={grupo.limite.rotulo} tom={grupo.tom} icone={grupo.limite.icone} />
    </Pressable>
  );
}

/** Create group tile. */
function CardCriarGrupo({ onPress }: { onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Criar grupo"
      style={({ pressed }) => [
        styles.criar,
        { backgroundColor: cores.bg.sunken, borderColor: cores.border.focus, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Texto estilo="Títulos/Grande">+</Texto>
      <Texto estilo="Texto/Pequeno" style={styles.centro}>
        Criar grupo
      </Texto>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.centro}>
        Agrupe novos aplicativos
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  cabecalho: { gap: space[4] },
  meta: { flexDirection: 'row' },
  flex: { flex: 1 },
  direita: { textAlign: 'right' },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  grade: { gap: space[12] },
  linha: { flexDirection: 'row', gap: space[12], alignItems: 'stretch' },
  coluna: { flex: 1, minWidth: 0 },
  card: {
    flex: 1,
    minWidth: 0,
    gap: space[16],
    // No Figma a borda é interna: desconta 1 px do padding para manter a área do conteúdo.
    padding: space[16] - borderWidth.thin,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
  },
  topo: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marcador: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meio: { gap: space[8] },
  apps: { flexDirection: 'row' },
  app: {
    width: 32,
    height: 32,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    gap: space[8],
    padding: space[12] - borderWidth.thin,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
  },
});
