import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Atividade } from '@/data/catalogo';
import { emocaoPorId } from '@/data/emocoes';
import { useHobbies } from '@/data/hobbiesEstado';
import { avancarMecanica, mecanicaAtual, type IdMecanica } from '@/data/rodizioDrops';
import { borderWidth, radius, spaceFixo as space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { Botao } from '../Botao';
import { CabecalhoSecao } from '../CabecalhoSecao';
import { irPara, PilhaSugestoes, type Decisao } from '../hobbies';
import { Texto } from '../Texto';
import { BalaoEmocao } from './BalaoEmocao';
import { MECANICAS, Revelacao, RevelarSemGesto, useMovimentoReduzido } from './revelar';

type Props = {
  /** Margem lateral da página: a pilha "sangra" até a borda para as abas de feedback. */
  margem: number;
  /** Avisa enquanto o drop está sendo arrastado (para travar a rolagem da Home). */
  onArrastando: (a: boolean) => void;
  /** Depois de aceitar: o aviso "Adicionada em Suas atividades". */
  onAceito: (s: Atividade) => void;
};

/**
 * Drops para você — o card escondido. Uma pequena interação revela o drop: uma sugestão de
 * hobby, com o mesmo card e o mesmo gesto de "Para você" da aba Hobbies (esquerda ignora,
 * direita aceita e vira atividade). Quando não há mais sugestões nos hobbies da pessoa,
 * aparece a conclusão (no estilo da de "Isso faz sentido para você?").
 *
 * A interação muda a cada drop: 7 mecânicas (ver ./revelar) em rodízio embaralhado
 * (ver src/data/rodizioDrops.ts). Depois da interação, a mesma animação de revelação
 * para todas, e então o card da atividade.
 */
export function Drops({ margem, onArrastando, onAceito }: Props) {
  const { cores } = useTema();
  const h = useHobbies();
  const movimentoReduzido = useMovimentoReduzido();
  const [etapa, setEtapa] = useState<'escondido' | 'revelando' | 'drop'>('escondido');
  const [drop, setDrop] = useState<Atividade | null>(null);
  // Mecânica do próximo drop; null enquanto lê o rodízio no banco.
  const [mecanica, setMecanica] = useState<IdMecanica | null>(null);
  // Muda a cada volta ao card escondido: remonta a mecânica do zero.
  const [rodada, setRodada] = useState(0);
  // O que a pessoa fez com os drops desde que abriu a Home (para a conclusão).
  const [feitos, setFeitos] = useState({ aceitos: 0, ignorados: 0 });
  // Cada drop sai de um hobby diferente, em rodízio.
  const [vez, setVez] = useState(0);

  useEffect(() => {
    let vivo = true;
    mecanicaAtual()
      .then((m) => vivo && setMecanica(m))
      .catch(() => vivo && setMecanica('arrastar'));
    return () => {
      vivo = false;
    };
  }, []);

  const proximo = () => {
    const n = h.hobbies.length;
    for (let i = 0; i < n; i++) {
      const hobby = h.hobbies[(vez + i) % n];
      const s = h.pilha(hobby)[0];
      if (s) return { s, i };
    }
    return null;
  };
  const acabou = h.hobbies.every((hb) => !h.pilha(hb).length);
  const previa = proximo()?.s.hobby ?? null;

  const revelar = () => {
    const p = proximo();
    if (!p) return;
    setVez((vez + p.i + 1) % h.hobbies.length);
    onArrastando(false);
    setDrop(p.s);
    setEtapa('revelando');
    // A mecânica usada sai da fila; a próxima já fica pronta para o próximo drop.
    avancarMecanica()
      .then(setMecanica)
      .catch(() => {});
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
    setRodada((r) => r + 1);
  };

  const reverIgnorados = () => {
    for (const hb of h.hobbies) if (h.temIgnoradas(hb)) h.reverIgnoradas(hb);
    setFeitos({ aceitos: 0, ignorados: 0 });
  };

  const Mecanica = mecanica ? MECANICAS.find((m) => m.id === mecanica)?.Componente : undefined;

  return (
    <View style={styles.secao}>
      <CabecalhoSecao titulo="Drops para você" subtitulo="Convites para fazer espaço para o que importa." espacado />
      {etapa === 'revelando' && drop ? (
        <Revelacao hobby={drop.hobby} movimentoReduzido={movimentoReduzido} onFim={() => setEtapa('drop')} />
      ) : etapa === 'drop' && drop ? (
        <Aparecer key={drop.id} deslocamento={0} escalaInicial={0.94} duracao={500}>
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
      ) : Mecanica ? (
        <Aparecer key={`escondido-${rodada}`} deslocamento={0} escalaInicial={0.97} duracao={400}>
          <View style={styles.escondido}>
            <Mecanica
              onRevelar={revelar}
              onArrastando={onArrastando}
              hobbyPrevia={previa}
              movimentoReduzido={movimentoReduzido}
            />
            <RevelarSemGesto onRevelar={revelar} />
          </View>
        </Aparecer>
      ) : null}
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
  escondido: { gap: space[8] },
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
