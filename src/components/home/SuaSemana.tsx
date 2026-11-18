import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DIA_INICIAL, semana, type Momento } from '@/data/home';
import { borderWidth, radius, space, useTema } from '@/theme';

import { Aparecer } from '../animacao';
import { DiaCalendario } from '../DiaCalendario';
import { Etiqueta } from '../Etiqueta';
import { Texto } from '../Texto';

/** V2 - Momentos / Feed — seletor de dias e os momentos registrados no dia escolhido. */
export function SuaSemana() {
  const { cores } = useTema();
  const [diaId, setDiaId] = useState(DIA_INICIAL);
  const dia = semana.find((d) => d.id === diaId) ?? semana[semana.length - 1];
  const total = dia.momentos.length;

  return (
    <View style={styles.secao}>
      <View style={styles.topo}>
        <Texto estilo="Títulos/Médio">Sua semana</Texto>
        <View style={styles.dias}>
          {semana.map((d) => (
            <DiaCalendario
              key={d.id}
              semana={d.semana}
              dia={d.dia}
              selecionado={d.id === diaId}
              onPress={() => setDiaId(d.id)}
            />
          ))}
        </View>
      </View>
      <Aparecer key={diaId} deslocamento={6} duracao={400} style={styles.momentos}>
        {total > 0 ? (
          <>
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              {total} {total === 1 ? 'MOMENTO REGISTRADO' : 'MOMENTOS REGISTRADOS'}
            </Texto>
            <View style={styles.lista}>
              {dia.momentos.map((m) => (
                <CardMomento key={m.id} momento={m} />
              ))}
            </View>
          </>
        ) : (
          <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
            NENHUM MOMENTO REGISTRADO NESTE DIA
          </Texto>
        )}
      </Aparecer>
    </View>
  );
}

/** Momento — frase montada com textos e etiquetas, quebrando linha como no Figma. */
function CardMomento({ momento }: { momento: Momento }) {
  const { cores } = useTema();
  return (
    <View style={[styles.card, { backgroundColor: cores.bg.raised, borderColor: cores.border.focus }]}>
      {momento.partes.map((parte, i) =>
        typeof parte === 'string' ? (
          <Texto key={i} estilo="Texto/Botões e rótulos">
            {parte}
          </Texto>
        ) : (
          <Etiqueta key={i} rotulo={parte.rotulo} tom={parte.tom} icone={parte.icone} style={styles.etiqueta} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { gap: space[32] },
  topo: { gap: space[12] },
  dias: { flexDirection: 'row', gap: space[8] },
  momentos: { gap: space[12] },
  lista: { gap: space[8] },
  etiqueta: { alignSelf: 'center' },
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[8],
    padding: space[12] - borderWidth.thin, // borda interna no Figma
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
  },
});
