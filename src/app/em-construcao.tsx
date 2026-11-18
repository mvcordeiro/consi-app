import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Tela, Texto } from '@/components';
import { useTema } from '@/theme';

/**
 * Destino provisório para ações da Home que ainda não têm tela no Figma
 * (Explorar, Ver tudo, conteúdos, grupos, Criar grupo, drop).
 */
export default function EmConstrucaoRota() {
  const { cores } = useTema();
  const { titulo } = useLocalSearchParams<{ titulo?: string }>();
  return (
    <Tela rolavel={false} bordas={['top', 'bottom', 'left', 'right']}>
      <View style={styles.centro}>
        <Texto estilo="Títulos/Grande" style={styles.texto}>
          {titulo ?? 'Em construção'}
        </Texto>
        <Texto cor={cores.text.secondary} style={styles.texto}>
          Essa tela ainda não foi desenhada.
        </Texto>
      </View>
      <Botao rotulo="Voltar" corRotulo={cores.text.primary} onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  texto: { textAlign: 'center' },
});
