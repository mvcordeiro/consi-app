/**
 * Os apps que o Consi conhece.
 * - No APK Android (com o módulo nativo consi-pausa): os apps do menu de apps do aparelho, com
 *   o nome e o ícone reais. O id é o nome do pacote (ex.: com.instagram.android).
 * - No navegador e no iPhone: os apps de exemplo do onboarding (ícones de marca do Font Awesome).
 */
import { useSyncExternalStore } from 'react';

import { ConsiPausa } from '../../modules/consi-pausa';

export type AppInfo = {
  id: string;
  nome: string;
  /** Ícone de marca do Font Awesome (só nos apps de exemplo). */
  marca?: string;
  /** Ícone real do aparelho (PNG em data URI). */
  icone?: string;
  /** ApplicationInfo.category do Android (-1 sem categoria). */
  categoria?: number;
};

/** Há lista real de apps (APK Android com o módulo nativo). */
export const comAppsDoAparelho = ConsiPausa != null;

/** Os apps de exemplo e o pacote de cada um no Android (para migrar grupos antigos). */
export const APPS_EXEMPLO: (AppInfo & { pacotes: string[] })[] = [
  { id: 'instagram', nome: 'Instagram', marca: 'instagram', pacotes: ['com.instagram.android', 'com.instagram.barcelona'] },
  { id: 'tiktok', nome: 'TikTok', marca: 'tiktok', pacotes: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'] },
  { id: 'spotify', nome: 'Spotify', marca: 'spotify', pacotes: ['com.spotify.music'] },
  { id: 'youtube', nome: 'YouTube', marca: 'youtube', pacotes: ['com.google.android.youtube'] },
  { id: 'reddit', nome: 'Reddit', marca: 'reddit', pacotes: ['com.reddit.frontpage'] },
  { id: 'whatsapp', nome: 'WhatsApp', marca: 'whatsapp', pacotes: ['com.whatsapp', 'com.whatsapp.w4b'] },
  { id: 'x', nome: 'X', marca: 'x-twitter', pacotes: ['com.twitter.android'] },
  { id: 'facebook', nome: 'Facebook', marca: 'facebook', pacotes: ['com.facebook.katana', 'com.facebook.lite'] },
  { id: 'pinterest', nome: 'Pinterest', marca: 'pinterest', pacotes: ['com.pinterest'] },
];

/** O pacote Android de um id de exemplo (ou o próprio id, se já for um pacote). */
export const pacoteDoExemplo = (id: string, instalados: Set<string>) =>
  APPS_EXEMPLO.find((a) => a.id === id)?.pacotes.find((p) => instalados.has(p)) ?? id;

/**
 * Pacotes que costumam "prender" (redes sociais, vídeo, jogos rápidos), em ordem de
 * prioridade para o onboarding. Depois deles entram os apps das categorias do Android.
 */
const PACOTES_CONHECIDOS = [
  ...APPS_EXEMPLO.flatMap((a) => a.pacotes),
  'com.netflix.mediaclient',
  'com.google.android.apps.youtube.music',
  'com.snapchat.android',
  'org.telegram.messenger',
  'com.discord',
  'com.twitch.tv',
  'tv.twitch.android.app',
  'com.linkedin.android',
  'com.kwai.video',
  'com.amazon.avod.thirdpartyclient',
  'com.disney.disneyplus',
  'com.hbo.hbonow',
  'com.globo.globotv',
];
/** Categorias do Android que entram no onboarding depois dos conhecidos: social, vídeo, jogo, áudio, notícias, imagem. */
const CATEGORIAS_ONBOARDING = [4, 2, 0, 1, 5, 3];

// ─── Lista do aparelho (carregada uma vez por abertura do app) ──────────────
const LADO_ICONE = 96;
let apps: AppInfo[] = comAppsDoAparelho ? [] : APPS_EXEMPLO;
let carregando: Promise<AppInfo[]> | null = null;
const ouvintes = new Set<() => void>();

/** Carrega (uma vez) a lista de apps do aparelho. */
export function carregarApps(): Promise<AppInfo[]> {
  if (!ConsiPausa) return Promise.resolve(apps);
  carregando ??= ConsiPausa.listarApps(LADO_ICONE)
    .then((lista) => {
      apps = lista.map((a) => ({ id: a.id, nome: a.nome, icone: a.icone || undefined, categoria: a.categoria }));
      ouvintes.forEach((f) => f());
      return apps;
    })
    .catch(() => {
      carregando = null;
      return apps;
    });
  return carregando;
}

function assinar(f: () => void) {
  void carregarApps();
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
const retrato = () => apps;

/** Todos os apps (do aparelho ou de exemplo), em ordem alfabética no Android. */
export function useApps() {
  return useSyncExternalStore(assinar, retrato, retrato);
}

export const appsAgora = () => apps;

/** O app pelo id. Ids de exemplo antigos também são achados pelo pacote. */
export function appPorId(id: string): AppInfo | undefined {
  const direto = apps.find((a) => a.id === id);
  if (direto) return direto;
  const exemplo = APPS_EXEMPLO.find((a) => a.id === id || a.pacotes.includes(id));
  if (!exemplo) return undefined;
  return apps.find((a) => exemplo.pacotes.includes(a.id)) ?? exemplo;
}

/**
 * Até `quantos` apps para o "Quais apps mais te incomodam?": primeiro os conhecidos que estão
 * instalados, depois os das categorias que costumam prender. Sem lista real, os de exemplo.
 */
export function appsParaOnboarding(lista: AppInfo[], quantos: number): AppInfo[] {
  if (!comAppsDoAparelho) return lista.slice(0, quantos);
  const escolhidos: AppInfo[] = [];
  const usar = (a: AppInfo | undefined) => {
    if (a && escolhidos.length < quantos && !escolhidos.includes(a)) escolhidos.push(a);
  };
  PACOTES_CONHECIDOS.forEach((p) => usar(lista.find((a) => a.id === p)));
  CATEGORIAS_ONBOARDING.forEach((c) => lista.filter((a) => a.categoria === c).forEach(usar));
  return escolhidos;
}
