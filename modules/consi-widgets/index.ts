import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Widgets da tela inicial do Consi (só Android por enquanto; ver docs/widgets-e-lembretes.md).
 * O JS manda o resumo do dia (as emoções registradas hoje) e os widgets nativos
 * (WidgetPequeno, WidgetMedio, WidgetGrande) se redesenham. No iPhone, no navegador e em
 * builds sem o módulo, `ConsiWidgets` é null.
 */
type ModuloConsiWidgets = {
  /**
   * JSON: { dia: "AAAA-MM-DD", emocoes: string[] (ids, a central primeiro), total: number,
   * recentes: { id, hora: "10:12" }[] (os últimos registros, do mais recente) }.
   */
  atualizar(json: string): void;
};

export const ConsiWidgets: ModuloConsiWidgets | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<ModuloConsiWidgets>('ConsiWidgets') : null;

export default ConsiWidgets;
