import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  codigoDoPiloto,
  DIAS_DO_PILOTO,
  enderecoDoFormulario,
  marcarRespondeu,
  pilotoCarregado,
  progressoDoPiloto,
  registrar,
} from '@/data/piloto';
import { radius, space, useTema } from '@/theme';

import { Icone } from '../Icone';
import { Texto } from '../Texto';

type Estado = { dia: number; pronto: boolean; respondeu: boolean; formulario: string | null; codigo: string };

/**
 * Rodapé do piloto, no pé da aba Ajustes: discreto, quase uma nota de rodapé. Mostra em que
 * dia dos 7 a pessoa está (sete pontinhos e "3/7") e, depois da semana, o link para o
 * formulário. Os dias contam pela hora do servidor (piloto.ts → agoraConfiavel), então mudar a
 * data do celular não adianta. Sem formulário configurado (app.json → expo.extra.piloto), some.
 */
export function RodapePiloto() {
  const { cores } = useTema();
  const [e, setE] = useState<Estado | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      pilotoCarregado()
        .then((d) => {
          const p = progressoDoPiloto(d);
          if (vivo) setE({ ...p, respondeu: d.respondeu, formulario: enderecoDoFormulario(d), codigo: codigoDoPiloto(d) });
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, []),
  );

  if (!e?.formulario) return null;

  const abrir = () => {
    registrar('convite_aberto', { via: 'ajustes' });
    Linking.openURL(e.formulario!).catch(() => {});
  };
  const jaRespondi = () => {
    void marcarRespondeu();
    setE({ ...e, respondeu: true });
  };

  return (
    <View style={styles.rodape} accessible={!e.pronto || e.respondeu} accessibilityLabel={rotuloAcessivel(e)}>
      <View style={styles.linha}>
        <Icone nome={e.respondeu ? 'selo' : 'calendario'} tamanho={14} cor={cores.text.tertiary} />
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {e.respondeu ? 'Piloto concluído · obrigado' : `Piloto · ${e.dia}/${DIAS_DO_PILOTO}`}
        </Texto>
        {e.respondeu ? null : (
          <View style={styles.pontos}>
            {Array.from({ length: DIAS_DO_PILOTO }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.ponto,
                  { backgroundColor: i < e.dia ? cores.text.accent : cores.border.subtle },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {e.pronto && !e.respondeu ? (
        <View style={styles.linha}>
          <Pressable
            onPress={abrir}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Avaliar o piloto"
            style={({ pressed }) => [styles.link, { borderColor: cores.border.focus, opacity: pressed ? 0.7 : 1 }]}
          >
            <Icone nome="lista-tarefas" tamanho={14} cor={cores.text.primary} />
            <Texto estilo="Legenda/Pequena">Avaliar o piloto</Texto>
          </Pressable>
          <Pressable onPress={jaRespondi} hitSlop={8} accessibilityRole="button">
            <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
              Já respondi
            </Texto>
          </Pressable>
        </View>
      ) : null}
      {e.pronto && !e.respondeu ? (
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          Código {e.codigo}
        </Texto>
      ) : null}
    </View>
  );
}

function rotuloAcessivel(e: Estado) {
  if (e.respondeu) return 'Piloto concluído. Obrigado por participar.';
  if (e.pronto) return 'Piloto: os 7 dias terminaram.';
  return `Piloto de teste: dia ${e.dia} de ${DIAS_DO_PILOTO}. O formulário abre depois do sétimo dia.`;
}

const styles = StyleSheet.create({
  rodape: { alignItems: 'center', gap: space[8], paddingTop: space[40], paddingBottom: space[8] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  pontos: { flexDirection: 'row', gap: space[4], marginLeft: space[4] },
  ponto: { width: 6, height: 6, borderRadius: radius.full },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
