import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appPorId } from '@/data/apps';
import { bloqueadoAte } from '@/data/pausa';
import { space, useTema } from '@/theme';

import { Aparecer, TextoAnimado, fimDoTexto } from '../animacao';
import { Botao } from '../Botao';
import { Icone } from '../Icone';
import { Texto } from '../Texto';

const DESCRICAO = 'Você escolheu não abrir há pouco.\nO Consi segura essa escolha por você.';

function relogio(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Pausa no modo bloqueado (sem frame no Figma; pedido do produto): o app foi fechado com
 * "Dessa vez não abro" há poucos minutos e ainda está bloqueado. Sem a opção de continuar:
 * mostra quanto falta e leva de volta para a tela inicial do celular. Quando o tempo acaba,
 * a tela sai sozinha. O tempo é escolhido em Ajustes → Pausa e lembretes.
 */
export function PausaBloqueada({
  app,
  onInicio,
  onConsi,
}: {
  app?: string;
  onInicio: () => void;
  onConsi: () => void;
}) {
  const { cores } = useTema();
  const [ate] = useState(() => bloqueadoAte(app));
  const [agora, setAgora] = useState(Date.now);
  const nome = (app && appPorId(app)?.nome) || 'Esse app';
  const titulo = `${nome} volta a abrir em`;
  const fimTitulo = fimDoTexto(titulo, 250);
  const restante = ate - agora;

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ate > 0 && restante <= 0) onInicio();
  }, [ate, restante, onInicio]);

  return (
    <View style={styles.tela}>
      <View style={styles.centro}>
        <Aparecer escalaInicial={0.85} deslocamento={0} duracao={700}>
          <View style={[styles.circulo, { backgroundColor: cores.bg['success-subtle'] }]}>
            <Icone nome="cadeado" tamanho={44} />
          </View>
        </Aparecer>
        <View style={styles.textos}>
          <TextoAnimado texto={titulo} estilo="Títulos/Médio" atraso={250} />
          <Aparecer atraso={fimTitulo} deslocamento={4}>
            <Texto
              estilo="Títulos/Grande"
              cor={cores.text.accent}
              style={styles.relogio}
              accessibilityLiveRegion="polite"
            >
              {relogio(restante)}
            </Texto>
          </Aparecer>
          <TextoAnimado texto={DESCRICAO} estilo="Texto/Médio" cor={cores.text.secondary} atraso={fimTitulo + 200} />
        </View>
      </View>
      <Aparecer atraso={fimDoTexto(DESCRICAO, fimTitulo + 200)} style={styles.rodape}>
        <Botao rotulo="Voltar ao início" corRotulo={cores.icon.primary} onPress={onInicio} />
        <Botao rotulo="Abrir o Consi" estilo="secundario" apagado onPress={onConsi} />
      </Aparecer>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[40], paddingHorizontal: space[24] },
  circulo: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  textos: { alignItems: 'center', gap: space[12], maxWidth: 320 },
  relogio: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  // mesmas margens dos botões da pausa (Figma: 12 + 16 px nas laterais, 40 px embaixo)
  rodape: { paddingHorizontal: space[12] + space[16], paddingBottom: space[40], gap: space[12] },
});
