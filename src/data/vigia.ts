/**
 * A pausa de verdade (fase 3 do plano de produção, só no APK Android).
 * O vigia nativo (modules/consi-pausa, VigiaService.kt) olha que app está na frente e aplica
 * a regra do grupo dele. Daqui o JS:
 * - manda as regras dos grupos para o Android sempre que mudam;
 * - liga o vigia quando há Acesso de uso (a não ser que a pessoa tenha desligado em Ajustes);
 * - depois da pausa, libera o app pelo tempo escolhido e abre o app.
 * No navegador e no iPhone nada disso existe e a pausa só abre por dentro do Consi.
 */
import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { ConsiPausa } from '../../modules/consi-pausa';
import { appPorId } from './apps';
import { gravarEstado, lerEstado } from './banco';
import { useGrupos, type Grupo } from './gruposHome';

export const temPausaDeVerdade = ConsiPausa != null;

/** A pessoa desligou a pausa nos apps em Ajustes (aí o Consi não liga sozinho). */
const CHAVE_DESLIGADA = 'consi:vigia:desligada';

/** O JSON que o VigiaService lê (Preferencias.kt): uma regra por pacote. */
function regrasParaOAndroid(grupos: Grupo[]) {
  const apps: Record<
    string,
    {
      modo: string;
      grupo: string;
      nome: string;
      intervaloMin: number;
      aoIgnorar: string;
      flutuante: boolean;
      estiloTimer: string;
    }
  > = {};
  for (const g of grupos) {
    if (g.modo === 'nao-interromper') continue;
    for (const id of g.apps) {
      apps[id] = {
        modo: g.modo,
        grupo: g.id,
        nome: appPorId(id)?.nome ?? id,
        intervaloMin: g.intervaloMin,
        aoIgnorar: g.aoIgnorar,
        flutuante: g.timerFlutuante !== false,
        estiloTimer: g.estiloTimer ?? 'pilula',
      };
    }
  }
  return JSON.stringify({ apps });
}

export type Permissoes = {
  /** Acesso de uso: saber que app está na frente. */
  acessoUso: boolean;
  /** Sobrepor a outros apps: abrir a pausa por cima. */
  sobrepor: boolean;
  notificacoes: boolean;
  /** O vigia está ligado. */
  ligada: boolean;
  /**
   * Android 13+ com APK de fora da loja: as "configurações restritas" ainda bloqueiam o
   * Acesso de uso. A pessoa libera em Informações do app → ⋮ → Permitir configurações restritas.
   */
  restritas: boolean;
};

const semModulo: Permissoes = { acessoUso: false, sobrepor: false, notificacoes: false, ligada: false, restritas: false };

export function lerPermissoes(): Permissoes {
  if (!ConsiPausa) return semModulo;
  try {
    return {
      acessoUso: ConsiPausa.temAcessoUso(),
      sobrepor: ConsiPausa.podeSobrepor(),
      notificacoes: ConsiPausa.podeNotificar(),
      ligada: ConsiPausa.vigiaAtiva(),
      restritas: ConsiPausa.configuracoesRestritas(),
    };
  } catch {
    return semModulo;
  }
}

/** As permissões da pausa, relidas sempre que o Consi volta para a frente (ex.: dos Ajustes do Android). */
export function usePermissoes() {
  const [permissoes, setPermissoes] = useState(lerPermissoes);
  useEffect(() => {
    if (!ConsiPausa) return;
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setPermissoes(lerPermissoes());
    });
    return () => assinatura.remove();
  }, []);
  return { permissoes, reler: () => setPermissoes(lerPermissoes()) };
}

export const pedirAcessoUso = () => ConsiPausa?.abrirAjustesAcessoUso();
export const pedirSobrepor = () => ConsiPausa?.abrirAjustesSobrepor();
/** Informações do app, onde fica o ⋮ → "Permitir configurações restritas". */
export const abrirInfoDoApp = () => ConsiPausa?.abrirInfoDoApp();

/**
 * Notificações (lembretes do "Cuidar tempo"). No Android 13+ o próprio aviso do sistema pede;
 * se a pessoa já recusou de vez (o aviso não aparece mais) ou desligou nos Ajustes, abre a tela
 * de notificações do Consi.
 */
export async function pedirNotificacoes() {
  if (!ConsiPausa) return;
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const r = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => 'denied');
    // Recusou agora: o Android deixa pedir de novo no próximo toque.
    if (r === 'granted' || r === 'denied') return;
  }
  try {
    if (!ConsiPausa.podeNotificar()) ConsiPausa.abrirAjustesNotificacoes();
  } catch {
    // sem a tela de ajustes, segue sem notificações
  }
}

/** Ajustes: liga ou desliga a pausa nos apps. */
export async function ligarVigia(ligar: boolean) {
  if (!ConsiPausa) return;
  ConsiPausa.ativarVigia(ligar);
  await gravarEstado(CHAVE_DESLIGADA, ligar ? '' : 'sim').catch(() => {});
}

/** Liga o vigia sozinho quando já há Acesso de uso e a pessoa não o desligou. */
async function ligarSePuder() {
  if (!ConsiPausa) return;
  try {
    // Os lembretes de tela não dependem do Acesso de uso: religa o vigia se o Android o fechou.
    if (ConsiPausa.lembretesTelaLigados()) ConsiPausa.definirLembretesTela(true, ConsiPausa.lembretesTelaMinutos());
    if (!ConsiPausa.temAcessoUso()) return;
    if ((await lerEstado(CHAVE_DESLIGADA)) === 'sim') return;
    // Chamado em toda volta ao app: reinicia o serviço se o Android o tiver fechado.
    ConsiPausa.ativarVigia(true);
  } catch {
    // sem o vigia, o Consi segue funcionando sem pausar os outros apps
  }
}

/**
 * No layout raiz: mantém as regras do Android em dia com os grupos e liga o vigia quando der.
 */
export function useVigia() {
  const grupos = useGrupos();

  useEffect(() => {
    if (!ConsiPausa) return;
    try {
      ConsiPausa.definirRegras(regrasParaOAndroid(grupos));
    } catch {
      // segue com as regras anteriores
    }
  }, [grupos]);

  useEffect(() => {
    if (!ConsiPausa) return;
    void ligarSePuder();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void ligarSePuder();
    });
    return () => assinatura.remove();
  }, []);
}

/**
 * Depois da pausa aberta pelo vigia: libera o app por `minutos` (0 = até a pessoa sair dele)
 * e abre o app. Devolve false se não deu (aí a tela segue o caminho de dentro do Consi).
 */
export function seguirParaOApp(pacote: string | undefined, minutos: number) {
  if (!ConsiPausa || !pacote) return false;
  try {
    ConsiPausa.liberar(pacote, minutos);
    return ConsiPausa.abrirApp(pacote);
  } catch {
    return false;
  }
}

// ─── Lembretes de cuidado com o tempo de tela (só no APK Android) ───────────
/**
 * Uso seguido do CELULAR (não de um app): tela acesa e desbloqueada sem uma pausa de pelo menos
 * 1 minuto. Roda no vigia nativo (TempoDeTela.kt) e não precisa do Acesso de uso.
 * No iPhone não existe: o iOS não deixa um app saber se a tela está em uso fora dele.
 */
export const temLembretesDeTela = ConsiPausa != null;

export const INTERVALOS_TELA = [10, 20, 30, 40, 50] as const;

/** Índice do passo mais próximo (migra valores antigos ou fora da escala). */
export function passoDoIntervalo(minutos: number) {
  let melhor = 0;
  INTERVALOS_TELA.forEach((m, i) => {
    if (Math.abs(m - minutos) < Math.abs(INTERVALOS_TELA[melhor] - minutos)) melhor = i;
  });
  return melhor;
}

export type LembretesTela = { ligados: boolean; minutos: number };

export function lerLembretesTela(): LembretesTela {
  if (!ConsiPausa) return { ligados: false, minutos: 30 };
  try {
    const ligados = ConsiPausa.lembretesTelaLigados();
    const salvo = ConsiPausa.lembretesTelaMinutos();
    const minutos = INTERVALOS_TELA[passoDoIntervalo(salvo)];
    // migra valores salvos fora da escala de 5 passos para o mais próximo
    if (minutos !== salvo) ConsiPausa.definirLembretesTela(ligados, minutos);
    return { ligados, minutos };
  } catch {
    return { ligados: false, minutos: 30 };
  }
}

export function definirLembretesTela(l: LembretesTela) {
  try {
    ConsiPausa?.definirLembretesTela(l.ligados, l.minutos);
  } catch {
    // sem o módulo, nada muda
  }
}
