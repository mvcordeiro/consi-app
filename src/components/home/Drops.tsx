import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Atividade } from '@/data/catalogo';
import { emocaoPorId } from '@/data/emocoes';
import { useHobbies } from '@/data/hobbiesEstado';
import { borderWidth, duration, easing, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { CabecalhoSecao } from '../CabecalhoSecao';
import { irPara, PilhaSugestoes, type Decisao } from '../hobbies';
import { Texto } from '../Texto';
import { BalaoEmocao } from './BalaoEmocao';
import { IconeHobbies, SetaArrastar } from './assets';

const nativo = Platform.OS !== 'web';
const curva = Easing.bezier(...easing.standard);

type Props = {
  /** Margem lateral da página: a pilha "sangra" até a borda para as abas de feedback. */
  margem: number;
  /** Avisa enquanto o drop está sendo arrastado (para travar a rolagem da Home). */
  onArrastando: (a: boolean) => void;
  /** Depois de aceitar: o aviso "Adicionada em Suas atividades". */
  onAceito: (s: Atividade) => void;
};

/**
 * Drops para você — o card "Puxe para revelar". Arrastar a aba até o fim revela o drop: uma
 * sugestão de hobby, com o mesmo card e o mesmo gesto de "Para você" da aba Hobbies
 * (esquerda ignora, direita aceita e vira atividade). Quando não há mais sugestões nos hobbies
 * da pessoa, aparece a conclusão (no estilo da de "Isso faz sentido para você?").
 */
export function Drops({ margem, onArrastando, onAceito }: Props) {
  const { cores } = useTema();
  const h = useHobbies();
  const [etapa, setEtapa] = useState<'escondido' | 'drop'>('escondido');
  const [drop, setDrop] = useState<Atividade | null>(null);
  // O que a pessoa fez com os drops desde que abriu a Home (para a conclusão).
  const [feitos, setFeitos] = useState({ aceitos: 0, ignorados: 0 });
  // Cada drop sai de um hobby diferente, em rodízio.
  const vez = useRef(0);

  const proximo = () => {
    const n = h.hobbies.length;
    for (let i = 0; i < n; i++) {
      const hobby = h.hobbies[(vez.current + i) % n];
      const s = h.pilha(hobby)[0];
      if (s) return { s, i };
    }
    return null;
  };
  const acabou = h.hobbies.every((hb) => !h.pilha(hb).length);

  const revelar = () => {
    const p = proximo();
    if (!p) return;
    vez.current = (vez.current + p.i + 1) % h.hobbies.length;
    setDrop(p.s);
    setEtapa('drop');
  };

  const decidir = (s: Atividade, d: Decisao) => {
    if (d === 'aceitar') {
      h.aceitar(s);
      onAceito(s);
    } else {
      h.ignorar(s);
    }
    setFeitos((f) => (d === 'aceitar' ? { ...f, aceitos: f.aceitos + 1 } : { ...f, ignorados: f.ignorados + 1 }));
    setDrop(null);
    setEtapa('escondido');
  };

  const reverIgnorados = () => {
    for (const hb of h.hobbies) if (h.temIgnoradas(hb)) h.reverIgnoradas(hb);
    setFeitos({ aceitos: 0, ignorados: 0 });
  };

  return (
    <View style={styles.secao}>
      <CabecalhoSecao titulo="Drops para você" subtitulo="Convites para fazer espaço para o que importa." espacado />
      {etapa === 'drop' && drop ? (
        <Aparecer key={drop.id} deslocamento={0} escalaInicial={0.97} duracao={400}>
          <PilhaSugestoes
            sugestoes={[drop]}
            margem={margem}
            totalComentarios={h.totalComentarios}
            onDecidir={decidir}
            onConversa={(s) => irPara.conversa(s.id)}
            onMais={(s) => irPara.detalhe(s.id)}
            onArrastando={onArrastando}
            vazio={null}
          />
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={[styles.centro, styles.dica]}>
            Arraste para esquerda para ignorar, direita para aceitar.
          </Texto>
        </Aparecer>
      ) : acabou ? (
        <Aparecer key="conclusao" deslocamento={16} escalaInicial={0.96} duracao={800}>
          <Conclusao
            aceitos={feitos.aceitos}
            podeRever={h.hobbies.some((hb) => h.temIgnoradas(hb))}
            onRever={reverIgnorados}
          />
        </Aparecer>
      ) : (
        <Aparecer key="escondido" deslocamento={0} escalaInicial={0.97} duracao={400}>
          <CardEscondido onRevelar={revelar} />
        </Aparecer>
      )}
    </View>
  );
}

/** Card D · Puxe para revelar. */
function CardEscondido({ onRevelar }: { onRevelar: () => void }) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
      <View style={[styles.iconeDrop, { backgroundColor: cores.action.primary.default }]}>
        <IconeHobbies width={24.01} height={23.66} corTraco={cores.text.primary} />
      </View>
      <Texto estilo="Títulos/Médio" style={styles.centro}>
        Seu próximo drop está escondido.
      </Texto>
      <Texto estilo="Texto/Pequeno" style={styles.centro}>
        Puxe a aba e descubra uma atividade feita para o seu momento.
      </Texto>
      <ArrastarParaRevelar onRevelar={onRevelar} />
    </View>
  );
}

const ALCA = 38;
const RECUO_ESQUERDA = 8;
const RECUO_DIREITA = 14;

/** Percurso da alça no trilho, medido no layout. */
function usePercurso() {
  const [percurso, setPercurso] = useState(0);
  const medir = (e: LayoutChangeEvent) =>
    setPercurso(Math.max(0, e.nativeEvent.layout.width - RECUO_ESQUERDA * 2 - ALCA));
  return [percurso, medir] as const;
}

/** Drag affordance / reveal — a alça só abre o drop se for arrastada até perto do fim. */
function ArrastarParaRevelar({ onRevelar }: { onRevelar: () => void }) {
  const { cores } = useTema();
  const [x] = useState(() => new Animated.Value(0));
  const [percurso, medir] = usePercurso();

  const pan = useMemo(() => {
    const voltar = () =>
      Animated.spring(x, { toValue: 0, useNativeDriver: nativo, bounciness: 6 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(g.dx, 0), percurso)),
      onPanResponderRelease: (_, g) => {
        if (percurso > 0 && g.dx >= percurso * 0.85) {
          Animated.timing(x, {
            toValue: percurso,
            duration: duration.fast,
            easing: curva,
            useNativeDriver: nativo,
          }).start(() => onRevelar());
        } else {
          voltar();
        }
      },
      onPanResponderTerminate: voltar,
    });
  }, [x, percurso, onRevelar]);

  const opacidadeRotulo = percurso
    ? x.interpolate({ inputRange: [0, percurso * 0.6], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  return (
    <View
      onLayout={medir}
      style={[styles.trilho, { backgroundColor: cores.action.primary.default }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Arraste para revelar"
      accessibilityActions={[{ name: 'activate', label: 'Revelar drop' }]}
      onAccessibilityAction={onRevelar}
    >
      <Animated.View style={[styles.rotuloArrastar, { opacity: opacidadeRotulo }]}>
        <Texto estilo="Texto/Botões e rótulos">Arraste para revelar</Texto>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        hitSlop={12}
        style={[
          styles.alca,
          { backgroundColor: cores.action.primary.pressed, transform: [{ translateX: x }] },
        ]}
      >
        <SetaArrastar width={20} height={20} corTraco={cores.text.primary} />
      </Animated.View>
    </View>
  );
}


/**
 * Conclusão — sem mais drops nos hobbies da pessoa. Mesmo card da conclusão dos padrões
 * (borda, balão flutuando, legenda, título, texto e botão principal); a copy e o botão
 * seguem o que a pessoa fez: aceitou algum → ver as atividades; só ignorou → rever os ignorados.
 */
function Conclusao({ aceitos, podeRever, onRever }: { aceitos: number; podeRever: boolean; onRever: () => void }) {
  const { cores } = useTema();
  const emocao = emocaoPorId(aceitos > 0 ? 'satisfeito' : 'esperanca');
  const legenda =
    aceitos > 0 ? `${aceitos} ${aceitos === 1 ? 'DROP ACEITO' : 'DROPS ACEITOS'}` : 'TODOS OS DROPS REVELADOS';
  const titulo = aceitos > 0 ? 'Bons convites a caminho!' : 'Você viu todos os drops';
  const texto =
    aceitos > 0
      ? 'Os drops que você aceitou estão em Suas atividades, na aba Hobbies. Novos drops chegam amanhã.'
      : 'Novos drops chegam amanhã. Enquanto isso, dá para rever os que você deixou passar.';
  const botao =
    aceitos > 0 || !podeRever
      ? { rotulo: 'Ver minhas atividades', onPress: () => router.navigate('/hobbies') }
      : { rotulo: 'Rever os que ignorei', onPress: onRever };
  return (
    <View style={[styles.conclusao, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
      {emocao ? <BalaoEmocao Svg={emocao.Svg} Textura={emocao.Textura} circulo={emocao.circulo} tamanho={72} /> : null}
      <View style={styles.textosConclusao}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary} style={styles.centro}>
          {legenda}
        </Texto>
        <Texto estilo="Títulos/Médio" style={styles.centro}>
          {titulo}
        </Texto>
        <Texto estilo="Texto/Pequeno" cor={cores.text.secondary} style={styles.centro}>
          {texto}
        </Texto>
      </View>
      <View style={styles.largo}>
        <Botao rotulo={botao.rotulo} corRotulo={cores.text.primary} onPress={botao.onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[24] },
  centro: { textAlign: 'center', alignSelf: 'stretch' },
  dica: { marginTop: space[24] },
  card: {
    alignItems: 'center',
    gap: space[16],
    // borda interna no Figma: desconta 1 px do padding
    paddingHorizontal: space[24] - borderWidth.thin,
    paddingVertical: 22 - borderWidth.thin,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
  iconeDrop: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trilho: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    paddingLeft: RECUO_ESQUERDA,
    paddingRight: RECUO_DIREITA,
    overflow: 'hidden',
  },
  rotuloArrastar: {
    position: 'absolute',
    left: RECUO_ESQUERDA + ALCA + 11,
    right: RECUO_DIREITA,
  },
  alca: {
    width: ALCA,
    height: ALCA,
    borderRadius: ALCA / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conclusao: {
    alignItems: 'center',
    gap: space[20],
    paddingHorizontal: space[24] - borderWidth.thin,
    paddingTop: space[32] - borderWidth.thin,
    paddingBottom: space[24] - borderWidth.thin,
    borderRadius: radius.xl,
    borderWidth: borderWidth.thin,
  },
  textosConclusao: { alignSelf: 'stretch', gap: space[8] },
  largo: { alignSelf: 'stretch' },
});
