import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { emocaoPorId, salvarEmocao } from '@/data/emocoes';
import { useTema } from '@/theme';

/** O mesmo link pode chegar duas vezes seguidas (o Android reentrega a intent): grava uma vez. */
let ultimo: { id: string; em: number } | null = null;

/**
 * Entrada dos widgets da tela inicial (sem tela própria):
 * - consi://registrar?emocao=<id>&origem=widget: o widget grande já escolheu e confirmou a
 *   emoção; grava o check-in e mostra "Emoção registrada", por cima da Home;
 * - consi://registrar: "Registrar emoção" do widget médio (ou o pequeno sem registros); abre a
 *   Home, onde fica o check-in de arrastar o balão.
 */
export default function Registrar() {
  const { cores } = useTema();
  const { emocao } = useLocalSearchParams<{ emocao?: string; origem?: string }>();

  useEffect(() => {
    const e = emocaoPorId(emocao);
    let vivo = true;
    (async () => {
      const agora = Date.now();
      if (e && !(ultimo && ultimo.id === e.id && agora - ultimo.em < 5_000)) {
        ultimo = { id: e.id, em: agora };
        await salvarEmocao(e.id, 'widget').catch(() => []);
      }
      if (!vivo) return;
      router.replace('/');
      if (e) router.push({ pathname: '/emocao', params: { id: e.id } });
    })();
    return () => {
      vivo = false;
    };
  }, [emocao]);

  return <View style={{ flex: 1, backgroundColor: cores.bg.base }} />;
}
