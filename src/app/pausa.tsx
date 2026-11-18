import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Tela, Texto } from '@/components';

/**
 * Tela de pausa (rascunho só para testar a navegação).
 * No futuro: "Isso é importante?", da seção 06 / INTERVENÇÕES do Figma.
 */
export default function Pausa() {
  return (
    <Tela rolavel={false} bordas={['top', 'bottom', 'left', 'right']}>
      <View style={styles.centro}>
        <Texto estilo="Títulos/Médio">Isso é importante?</Texto>
      </View>
      <Botao rotulo="Voltar" onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
