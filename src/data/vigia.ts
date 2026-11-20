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
  const apps: Record<string, { modo: string; grupo: string; nome: string; intervaloMin: number; aoIgnorar: string }> = {};
  for (const g of grupos) {
    if (g.modo === 'nao-interromper') continue;
    for (const id of g.apps) {
      apps[id] = {
        modo: g.modo,
        grupo: g.id,
        nome: appPorId(id)?.nome ?? id,
        intervaloMin: g.intervaloMin,
        aoIgnorar: g.aoIgnorar,
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
};

const semModulo: Permissoes = { acessoUso: false, sobrepor: false, notificacoes: false, ligada: false };

export function lerPermissoes(): Permissoes {
  if (!ConsiPausa) return semModulo;
  try {
    return {
      acessoUso: ConsiPausa.temAcessoUso(),
      sobrepor: ConsiPausa.podeSobrepor(),
      notificacoes: ConsiPausa.podeNotificar(),
      ligada: ConsiPausa.vigiaAtiva(),
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

/** Android 13+: a permissão de notificação é pedida na hora (lembretes do "Cuidar tempo"). */
export async function pedirNotificacoes() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => {});
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
