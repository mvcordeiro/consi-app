import { Pressable, StyleSheet, View } from 'react-native';

import { ID_LIVRE, limiteDoGrupo, linhasDaGrade, useGrupos, type Grupo as GrupoHome } from '@/data/gruposHome';
import { borderWidth, radius, space, useTema, type Cores } from '@/theme';

import { Etiqueta, fundoDoTom, type TomEtiqueta } from '../Etiqueta';
import { Icone } from '../Icone';
import { IconeApp as IconeApp32 } from '../IconeApp';
import { Texto } from '../Texto';

type Props = {
  onAbrir: (g: GrupoHome) => void;
  onCriar: () => void;
  /** Engrenagem: escolher quais hobbies aparecem como grupos. */
  onAjustes: () => void;
};

/**
 * V3 - Grade de grupos — um grupo de apps por hobby da pessoa, mais o "Sem hobbies" fixado.
 * A grade se adapta à quantidade (ver `linhasDaGrade`): 1 ou 2 grupos ficam numa coluna só,
 * em cards inteiros (1fr); quantidades pares vão em pares de meios (0.5fr); nas ímpares,
 * o "Sem hobbies" ocupa a primeira linha inteira. "Criar grupo" fica sempre por último.
 */
export function Grupos({ onAbrir, onCriar, onAjustes }: Props) {
  const { cores } = useTema();
  const grupos = useGrupos().filter((g) => !g.oculto);
  const linhas = linhasDaGrade(grupos);


  return (
    <View style={styles.secao}>
      <View style={styles.cabecalho}>
        <View style={styles.tituloLinha}>
          <Texto estilo="Títulos/Médio" style={styles.flex}>
            Aplicativos e hobbies
          </Texto>
          <Pressable
            onPress={onAjustes}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Escolher quais grupos aparecem"
            style={({ pressed }) => [styles.engrenagem, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icone nome="engrenagem" />
          </Pressable>
        </View>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary}>
          Agrupe seus apps e escolha a regra de cada grupo.
        </Texto>
      </View>
      <View style={styles.meta}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.flex}>
          SEUS GRUPOS
        </Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={[styles.flex, styles.direita]}>
          {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
        </Texto>
      </View>
      <View style={styles.grade}>
        {linhas.map((linha) =>
          linha.tipo === 'inteiro' ? (
            <CardGrupoInteiro key={linha.grupo.id} grupo={linha.grupo} onPress={() => onAbrir(linha.grupo)} />
          ) : (
            // Cada card numa coluna sem padding: assim as duas colunas têm sempre a mesma largura.
            <View key={linha.grupos[0].id} style={styles.linha}>
              {linha.grupos.map((g) => (
                <View key={g.id} style={styles.coluna}>
                  <CardGrupoMetade grupo={g} onPress={() => onAbrir(g)} />
                </View>
              ))}
            </View>
          ),
        )}
        <CardCriarGrupo onPress={onCriar} />
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} style={styles.centro}>
        Selecione um grupo para visualizar ou ajustar seus limites.
      </Texto>
    </View>
  );
}

function corDoTom(c: Cores, tom: TomEtiqueta) {
  if (tom === 'sucesso') return c.feedback.success;
  if (tom === 'info') return c.feedback.info;
  if (tom === 'aviso') return c.feedback.warning;
  return c.text.primary;
}

function rotuloApps(n: number) {
  if (n === 0) return 'Nenhum app';
  return n === 1 ? '1 app' : `${n} apps`;
}

function descricao(g: GrupoHome) {
  return `${g.nome}${g.id === ID_LIVRE ? ', fixado' : ''}, ${rotuloApps(g.apps.length)}, ${limiteDoGrupo(g).rotulo}`;
}

/** Círculo de 30 px com o ícone do grupo, na cor da regra. */
function Marcador({ grupo }: { grupo: GrupoHome }) {
  const { cores } = useTema();
  const { tom } = limiteDoGrupo(grupo);
  return (
    <View style={[styles.marcador, { backgroundColor: fundoDoTom(cores, tom) }]}>
      <Icone nome={grupo.icone} tamanho={18} cor={corDoTom(cores, tom)} />
    </View>
  );
}

/** Quantidade de apps, com "Fixado" no grupo fixado. */
function Contagem({ grupo }: { grupo: GrupoHome }) {
  const { cores } = useTema();
  return (
    <Texto estilo="Legenda/Pequena" cor={cores.text.secondary} numberOfLines={1}>
      {grupo.id === ID_LIVRE ? `${rotuloApps(grupo.apps.length)} · Fixado` : rotuloApps(grupo.apps.length)}
    </Texto>
  );
}

function Apps({ grupo }: { grupo: GrupoHome }) {
  const { cores } = useTema();
  if (!grupo.apps.length) {
    // Sem apps ainda: um espaço tracejado no lugar dos ícones.
    return (
      <View style={styles.apps}>
        <View style={[styles.app, styles.appVazio, { borderColor: cores.border.subtle }]}>
          <Icone nome="adicionar" tamanho={14} cor={cores.text.tertiary} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.apps, { gap: space[4] }]}>
      {grupo.apps.slice(0, 4).map((id) => (
        <IconeApp key={id} id={id} />
      ))}
    </View>
  );
}

/** Ícone do app num quadrado de 32 px (o real do aparelho ou a marca de exemplo). */
export function IconeApp({ id, lado = 32 }: { id: string; lado?: number }) {
  return <IconeApp32 id={id} lado={lado} style={{ borderRadius: 5 }} />;
}

function useEstiloCard() {
  const { cores } = useTema();
  return ({ pressed }: { pressed: boolean }) => [
    styles.card,
    { backgroundColor: cores.bg.raised, borderColor: cores.border.focus, opacity: pressed ? 0.85 : 1 },
  ];
}

/** Card 0.5fr (o "Group tile" do Figma): ícone e contagem, nome, apps e limite empilhados. */
function CardGrupoMetade({ grupo, onPress }: { grupo: GrupoHome; onPress: () => void }) {
  const estilo = useEstiloCard();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={descricao(grupo)} style={estilo}>
      <View style={styles.topo}>
        <Marcador grupo={grupo} />
        <View style={styles.encolher}>
          <Contagem grupo={grupo} />
        </View>
      </View>
      <View style={styles.meio}>
        <Texto estilo="Títulos/Pequeno" numberOfLines={1}>
          {grupo.nome}
        </Texto>
        <Apps grupo={grupo} />
      </View>
      <Etiqueta {...limiteDoGrupo(grupo)} linhaUnica />
    </Pressable>
  );
}

/**
 * Card 1fr (largura toda): a mesma informação em duas linhas — ícone, nome e contagem em cima;
 * apps à esquerda e limite à direita embaixo.
 */
function CardGrupoInteiro({ grupo, onPress }: { grupo: GrupoHome; onPress: () => void }) {
  const estilo = useEstiloCard();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={descricao(grupo)} style={estilo}>
      <View style={styles.inteiroTopo}>
        <Marcador grupo={grupo} />
        <View style={styles.flex}>
          <Texto estilo="Títulos/Pequeno" numberOfLines={1}>
            {grupo.nome}
          </Texto>
          <Contagem grupo={grupo} />
        </View>
      </View>
      <View style={styles.inteiroBase}>
        <Apps grupo={grupo} />
        <Etiqueta {...limiteDoGrupo(grupo)} linhaUnica style={styles.encolher} />
      </View>
    </Pressable>
  );
}

/** Criar grupo — linha inteira, tracejada, sempre no fim da grade. */
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
      <Icone nome="adicionar" tamanho={20} />
      <View style={styles.flex}>
        <Texto estilo="Texto/Pequeno">Criar grupo</Texto>
        <Texto estilo="Legenda/Pequena" cor={cores.text.secondary}>
          Agrupe novos aplicativos
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  cabecalho: { gap: space[4] },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  engrenagem: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
  encolher: { flexShrink: 1, minWidth: 0 },
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
  topo: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  inteiroTopo: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  inteiroBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
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
  appVazio: { borderWidth: borderWidth.thin, borderStyle: 'dashed' },
  criar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingHorizontal: space[16] - borderWidth.thin,
    paddingVertical: space[12] - borderWidth.thin,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    borderStyle: 'dashed',
  },
});
