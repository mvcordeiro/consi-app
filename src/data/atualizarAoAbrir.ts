import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/** Até quanto tempo depois de abrir dá para recarregar sem atrapalhar (a pessoa mal começou). */
const RECARREGAR_NA_HORA_MS = 10_000;

/**
 * Atualização na abertura: o expo-updates baixa a atualização nova ao abrir, mas só a usa na
 * próxima vez que o app abre do zero. Num APK recém-instalado isso deixava a pessoa na versão
 * do instalador até ir em Ajustes → Sobre → Procurar atualização. Aqui, achou uma nova: baixa e
 * recarrega na hora se o app acabou de abrir; senão, quando a pessoa sair do app.
 */
export function useAtualizarAoAbrir() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;
    const inicio = Date.now();
    let vivo = true;
    let assinatura: { remove: () => void } | null = null;
    (async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (!r.isAvailable || !vivo) return;
        const baixada = await Updates.fetchUpdateAsync();
        if (!baixada.isNew || !vivo) return;
        if (Date.now() - inicio < RECARREGAR_NA_HORA_MS && AppState.currentState === 'active') {
          await Updates.reloadAsync();
          return;
        }
        assinatura = AppState.addEventListener('change', (estado) => {
          if (estado === 'background') void Updates.reloadAsync().catch(() => {});
        });
      } catch {
        // sem rede ou sem servidor: fica para a próxima abertura
      }
    })();
    return () => {
      vivo = false;
      assinatura?.remove();
    };
  }, []);
}
