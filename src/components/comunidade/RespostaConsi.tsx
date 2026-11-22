import { StyleSheet, View } from 'react-native';

import { borderWidth, radius, space, useTema } from '@/theme';

import { LogoHome } from '../home/assets';
import { Texto } from '../Texto';

/**
 * A resposta oficial como uma mensagem: avatar redondo com o logo do Consi, nome e balão.
 * `titulo` muda o nome em cima do balão (ex.: "Motivo", numa sugestão não publicada).
 */
export function RespostaConsi({ texto, titulo = 'Consi respondeu' }: { texto: string; titulo?: string }) {
  const { cores } = useTema();
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${titulo}: ${texto}`}>
      <View style={[styles.avatar, { backgroundColor: cores.action.primary.default }]}>
        <LogoHome width={17} height={20} corTraco={cores.text['on-pressed']} />
      </View>
      <View style={styles.coluna}>
        <Texto estilo="Legenda/Pequena" cor={cores.text.tertiary}>
          {titulo}
        </Texto>
        <View style={[styles.balao, { backgroundColor: cores.bg.raised, borderColor: cores.border.subtle }]}>
          <Texto>{texto}</Texto>
        </View>
      </View>
    </View>
  );
}

const AVATAR = 36;

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  coluna: { flex: 1, gap: space[4] },
  // Canto de cima à esquerda reto: o balão "sai" do avatar.
  balao: {
    paddingHorizontal: space[12],
    paddingVertical: space[8] + 2,
    borderRadius: radius.card,
    borderTopLeftRadius: space[4],
    borderWidth: borderWidth.thin,
  },
});
