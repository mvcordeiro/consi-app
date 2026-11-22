import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Widgets da tela inicial do Consi (só Android por enquanto; ver docs/widgets-e-lembretes.md).
 * O JS manda o resumo do dia (as emoções registradas hoje) e os widgets nativos
 * (WidgetPequeno, WidgetMedio, WidgetGrande) se redesenham. No iPhone, no navegador e em
 * builds sem o módulo, `ConsiWidgets` é null.
 */
/** Os assuntos que os widgets mostram e o JSON de cada um (ver src/data/widgets.ts). */
export type AssuntoWidget = 'dia' | 'atividades' | 'sugestao' | 'frases';

type ModuloConsiWidgets = {
  atualizar(assunto: AssuntoWidget, json: string): void;
  /**
   * Pede o ícone do app no launcher da emoção `id` (`null` volta ao ícone normal).
   * A troca acontece uns 5 minutos depois, com o app fora de uso (ver Icone.kt).
   */
  definirIcone(id: string | null): void;
};

export const ConsiWidgets: ModuloConsiWidgets | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<ModuloConsiWidgets>('ConsiWidgets') : null;

export default ConsiWidgets;
