import { useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  descreverDias,
  gravarLembreteDiario,
  horario,
  LETRAS_DIAS,
  lerLembreteDiario,
  NOMES_DIAS,
  temLembreteDiario,
  useLembreteDiario,
  type LembreteDiario,
} from '@/data/lembreteDiario';
import { radius, space, useTema } from '@/theme';

import { Alternancia } from '../Alternancia';
import { Botao } from '../Botao';
import { Folha } from '../Folha';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

/** Passo do horário: de 15 em 15 minutos. */
const PASSO_MIN = 15;

function somarMinutos(l: LembreteDiario, delta: number) {
  const total = (l.hora * 60 + l.minuto + delta + 24 * 60) % (24 * 60);
  return { hora: Math.floor(total / 60), minuto: total % 60 };
}

/**
 * Horário (− 20:00 +, de 15 em 15 min) e os dias da semana (D S T Q Q S S) do lembrete.
 * Usado nos ajustes do Diário e no convite.
 */
function EscolhaHorario({ lembrete, onMudar }: { lembrete: LembreteDiario; onMudar: (m: Partial<LembreteDiario>) => void }) {
  const { cores } = useTema();
  const alternarDia = (d: number) =>
    onMudar({ dias: lembrete.dias.includes(d) ? lembrete.dias.filter((x) => x !== d) : [...lembrete.dias, d] });
  return (
    <View style={styles.escolha}>
      <View style={styles.horario}>
        <Passo icone="subtrair" rotulo="15 minutos mais cedo" onPress={() => onMudar(somarMinutos(lembrete, -PASSO_MIN))} />
        <Texto estilo="Títulos/Médio" style={styles.hora} accessibilityLiveRegion="polite">
          {horario(lembrete)}
        </Texto>
        <Passo icone="adicionar" rotulo="15 minutos mais tarde" onPress={() => onMudar(somarMinutos(lembrete, PASSO_MIN))} />
      </View>
      <View style={styles.dias}>
        {LETRAS_DIAS.map((letra, d) => {
          const ativo = lembrete.dias.includes(d);
          return (
            <Pressable
              key={d}
              onPress={() => alternarDia(d)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ativo }}
              accessibilityLabel={NOMES_DIAS[d]}
              style={({ pressed }) => [
                styles.dia,
                {
                  backgroundColor: ativo ? cores.bg.selected : cores.bg.base,
                  borderColor: ativo ? 'transparent' : cores.border.focus,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Texto estilo="Texto/Botões e rótulos">{letra}</Texto>
            </Pressable>
          );
        })}
      </View>
      <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
        {lembrete.dias.length ? `Às ${horario(lembrete)}, ${descreverDias(lembrete.dias)}.` : 'Escolha ao menos um dia.'}
      </Texto>
    </View>
  );
}

function Passo({ icone, rotulo, onPress }: { icone: 'adicionar' | 'subtrair'; rotulo: string; onPress: () => void }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [styles.passo, { backgroundColor: cores.bg.base, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icone nome={icone} tamanho={16} />
    </Pressable>
  );
}

/** Nos ajustes do Diário (o botão de controles): liga/desliga, horário e dias. Só no APK Android 12+. */
export function AjustesLembreteDiario() {
  const { cores } = useTema();
  const l = useLembreteDiario();
  if (!temLembreteDiario) return null;
  const mudar = (m: Partial<LembreteDiario>) => void gravarLembreteDiario({ ...m, perguntado: true });
  return (
    <View style={styles.secao}>
      <View style={styles.linha}>
        <View style={styles.flex}>
          <Texto estilo="Texto/Médio">Pergunta do dia</Texto>
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            Uma notificação com uma pergunta para escrever
          </Texto>
        </View>
        <Alternancia rotulo="Pergunta do dia" ligado={l.ligado} onMudar={(ligado) => mudar({ ligado })} />
      </View>
      {l.ligado ? <EscolhaHorario lembrete={l} onMudar={mudar} /> : null}
    </View>
  );
}

/**
 * Convite, uma vez só, para receber a pergunta do dia (pedido do produto: quem atualizar o app
 * escolhe se quer). Aparece nas abas, nunca por cima da pausa ou do onboarding, um pouco depois
 * de abrir, para não brigar com outros avisos.
 */
export function AvisoLembreteDiario() {
  const segmentos = useSegments();
  const nasAbas = (segmentos[0] as string | undefined) === '(abas)';
  const [visivel, setVisivel] = useState(false);
  const [rascunho, setRascunho] = useState<LembreteDiario | null>(null);

  useEffect(() => {
    if (!temLembreteDiario || !nasAbas || rascunho) return;
    let vivo = true;
    const t = setTimeout(() => {
      lerLembreteDiario().then((l) => {
        if (!vivo || l.perguntado) return;
        setRascunho(l);
        setVisivel(true);
      });
    }, 2500);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [nasAbas, rascunho]);

  if (!rascunho) return null;

  const responder = (ligar: boolean) => {
    setVisivel(false);
    void gravarLembreteDiario({ ...rascunho, ligado: ligar && rascunho.dias.length > 0, perguntado: true });
  };

  return (
    <Folha
      visivel={visivel}
      onFechar={() => responder(false)}
      titulo="Quer uma pergunta por dia?"
      descricao="Uma notificação com uma pergunta para escrever no Diário, no horário e nos dias que você escolher. Dá para mudar depois nos ajustes do Diário."
    >
      <EscolhaHorario lembrete={rascunho} onMudar={(m) => setRascunho({ ...rascunho, ...m })} />
      <View style={styles.botoes}>
        <Botao rotulo="Quero receber" onPress={() => responder(true)} />
        <Botao rotulo="Agora não" estilo="secundario" apagado onPress={() => responder(false)} />
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[16] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  flex: { flex: 1 },
  escolha: { gap: space[12] },
  horario: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  hora: { minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] },
  passo: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dias: { flexDirection: 'row', gap: space[8] },
  dia: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botoes: { gap: space[12] },
});
