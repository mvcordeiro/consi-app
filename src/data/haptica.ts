/** Vibração do app: respeita "Vibração" em Ajustes → Personalizar. */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { preferenciasAtuais } from './preferencias';

const ligada = () => Platform.OS !== 'web' && preferenciasAtuais().vibracao;

export const ImpactoVibracao = Haptics.ImpactFeedbackStyle;

export function vibrarImpacto(forca: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (ligada()) Haptics.impactAsync(forca).catch(() => {});
}

export function vibrarSucesso() {
  if (ligada()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function vibrarSelecao() {
  if (ligada()) Haptics.selectionAsync().catch(() => {});
}
