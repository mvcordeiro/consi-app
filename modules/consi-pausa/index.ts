import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Módulo nativo do Consi (só Android): Acesso de uso, permissão de sobrepor, lista de apps
 * do aparelho, tempo de uso e o vigia que abre a pausa antes dos apps (VigiaService.kt).
 * No navegador, no iPhone e em builds sem o módulo, `ConsiPausa` é null e o app segue com os
 * apps de exemplo e a pausa aberta só por dentro do Consi.
 */
export type AppDoAparelho = {
  /** Nome do pacote (ex.: com.instagram.android). */
  id: string;
  nome: string;
  /** ApplicationInfo.category (0 jogo, 1 áudio, 2 vídeo, 3 imagem, 4 social, 5 notícias…; -1 sem). */
  categoria: number;
  /** App que veio de fábrica e nunca foi atualizado. */
  sistema: boolean;
  /** É uma tela inicial (launcher). */
  inicio: boolean;
  /** PNG em data URI (vazio se não deu para ler o ícone). */
  icone: string;
};

type ModuloConsiPausa = {
  temAcessoUso(): boolean;
  podeSobrepor(): boolean;
  podeNotificar(): boolean;
  abrirAjustesAcessoUso(): void;
  abrirAjustesSobrepor(): void;
  abrirAjustesNotificacoes(): void;
  /** Android 13+, APK de fora da loja: as configurações restritas ainda estão bloqueadas. */
  configuracoesRestritas(): boolean;
  /** Informações do app (⋮ → "Permitir configurações restritas"). */
  abrirInfoDoApp(): void;
  /** Milissegundos na frente por pacote nos últimos `dias` (precisa de Acesso de uso; senão, vazio). */
  usoRecente(dias: number): Promise<Record<string, number>>;
  listarApps(lado: number): Promise<AppDoAparelho[]>;
  /** Milissegundos na frente por pacote entre `inicio` e `fim` (epoch ms). */
  usoPorApp(inicio: number, fim: number): Promise<Record<string, number>>;
  abrirApp(pacote: string): boolean;
  definirRegras(json: string): void;
  vigiaAtiva(): boolean;
  ativarVigia(ativa: boolean): void;
  liberar(pacote: string, minutos: number): void;
  /** Lembretes de cuidado com o tempo de tela: uso seguido do celular (TempoDeTela.kt). */
  lembretesTelaLigados(): boolean;
  lembretesTelaMinutos(): number;
  definirLembretesTela(ligados: boolean, minutos: number): void;
  /** Convite do piloto: notificação em `emMs` (epoch ms). Só existe a partir do APK versionCode 9. */
  agendarConvitePiloto?(emMs: number, titulo: string, texto: string): void;
  cancelarConvitePiloto?(): void;
};

export const ConsiPausa: ModuloConsiPausa | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<ModuloConsiPausa>('ConsiPausa') : null;

export default ConsiPausa;
