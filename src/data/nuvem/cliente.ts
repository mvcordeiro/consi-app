/**
 * Cliente Supabase do Consi: só para sugestões, votos e changelog. Nada do diário,
 * hobbies ou pausa sai do aparelho (ver supabase/migrations/0001_sugestoes.sql e docs/supabase.md).
 *
 * - URL e chave pública ficam em app.json → expo.extra.supabase ({ url, anonKey }). A chave é
 *   pública por desenho: quem protege os dados é a RLS. Enquanto tiver "PREENCHER", a nuvem fica
 *   desligada (`nuvemConfigurada()` = false) e nenhuma rede é usada.
 * - Nada acontece no boot: o cliente só é criado na primeira chamada e o login anônimo só roda em
 *   `garantirSessao()`, chamado quando a pessoa abre Sugestões/Novidades.
 * - A sessão fica no expo-secure-store, em pedaços (o Keychain/Keystore aceita até ~2 KB por valor).
 * - Toda requisição tem tempo limite; falta de rede vira `ErroNuvem` com tipo 'offline'.
 */
import {
  createClient,
  isAuthError,
  isAuthRetryableFetchError,
  type Session,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const TEMPO_LIMITE = 10000;
const CHAVE_SESSAO = 'consi.nuvem.sessao';
const nativo = Platform.OS !== 'web';

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type TipoErroNuvem =
  /** Sem rede ou o servidor não respondeu a tempo: "Sem conexão, tente de novo". */
  | 'offline'
  /** app.json ainda sem URL/chave. */
  | 'nao-configurada'
  /** Passou de 3 sugestões no dia (trigger do servidor). */
  | 'limite-diario'
  /** Bloqueado pela RLS ou sessão inválida. */
  | 'sem-permissao'
  /** Qualquer outra resposta de erro do servidor. */
  | 'servidor';

export class ErroNuvem extends Error {
  readonly tipo: TipoErroNuvem;
  readonly causa?: unknown;

  constructor(tipo: TipoErroNuvem, mensagem: string, causa?: unknown) {
    super(mensagem);
    this.name = 'ErroNuvem';
    this.tipo = tipo;
    this.causa = causa;
  }
}

export function ehErroNuvem(erro: unknown, tipo?: TipoErroNuvem): erro is ErroNuvem {
  return erro instanceof ErroNuvem && (tipo === undefined || erro.tipo === tipo);
}

const MARCA_TEMPO = 'consi:tempo-esgotado';
const SINAIS_DE_REDE = [MARCA_TEMPO, 'Network request failed', 'Failed to fetch', 'fetch failed', 'AbortError', 'Load failed'];

function pareceRede(texto: string | undefined) {
  return !!texto && SINAIS_DE_REDE.some((s) => texto.includes(s));
}

/** Converte qualquer erro do supabase-js (auth, PostgREST ou fetch) em `ErroNuvem`. */
export function paraErroNuvem(erro: unknown): ErroNuvem {
  if (erro instanceof ErroNuvem) return erro;

  if (isAuthRetryableFetchError(erro)) return new ErroNuvem('offline', 'Sem conexão, tente de novo.', erro);
  if (isAuthError(erro)) {
    if (pareceRede(erro.message)) return new ErroNuvem('offline', 'Sem conexão, tente de novo.', erro);
    return new ErroNuvem('sem-permissao', erro.message, erro);
  }

  const e = (erro ?? {}) as { message?: string; code?: string; details?: string; name?: string };
  const texto = `${e.name ?? ''} ${e.message ?? ''} ${e.details ?? ''}`;
  if (pareceRede(texto)) return new ErroNuvem('offline', 'Sem conexão, tente de novo.', erro);
  if (e.message?.includes('consi_limite_diario')) {
    return new ErroNuvem('limite-diario', 'Você já mandou 3 ideias hoje. Tente de novo amanhã.', erro);
  }
  // 42501 = insufficient_privilege (RLS); PGRST301/302/303 = JWT inválido ou ausente.
  if (e.code === '42501' || e.code?.startsWith('PGRST30')) {
    return new ErroNuvem('sem-permissao', e.message ?? 'Sem permissão.', erro);
  }
  return new ErroNuvem('servidor', e.message ?? 'Algo deu errado.', erro);
}

/**
 * Roda uma consulta do supabase-js e devolve só `data`, lançando `ErroNuvem` se vier `error`.
 *   const lista = await consultar((c) => c.from('sugestoes_ranking').select('*').limit(20));
 * Com `{ login: false }` não cria sessão (para o que a RLS libera ao público, como `versoes`).
 */
export async function consultar<T>(
  fazer: (cliente: SupabaseClient) => PromiseLike<{ data: T; error: null } | { data: null; error: object }>,
  { login = true }: { login?: boolean } = {},
): Promise<T> {
  if (login) await garantirSessao();
  let resposta: { data: T; error: null } | { data: null; error: object };
  try {
    resposta = await fazer(nuvem());
  } catch (e) {
    throw paraErroNuvem(e);
  }
  if (resposta.error !== null) throw paraErroNuvem(resposta.error);
  return resposta.data;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

type Config = { url: string; anonKey: string };

function lerConfig(): Config | null {
  const extra = Constants.expoConfig?.extra as { supabase?: Partial<Config> } | undefined;
  const { url, anonKey } = extra?.supabase ?? {};
  if (!url || !anonKey) return null;
  if (!url.startsWith('https://') || url.includes('PREENCHER') || anonKey.includes('PREENCHER')) return null;
  return { url, anonKey };
}

/** `false` enquanto app.json → expo.extra.supabase estiver com os valores de exemplo. */
export function nuvemConfigurada() {
  return lerConfig() !== null;
}

// ---------------------------------------------------------------------------
// Armazenamento da sessão
// ---------------------------------------------------------------------------

/**
 * A sessão (JWT + refresh token + usuário) passa de 2 KB, o limite seguro do SecureStore.
 * Guardamos em pedaços de 512 caracteres (≤ 2048 bytes em UTF-8) mais um contador.
 */
const TAMANHO_PEDACO = 512;
const opcoesSeguras: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const chavePedaco = (chave: string, i: number) => `${chave}.${i}`;
const chaveContagem = (chave: string) => `${chave}.n`;

// Escritas em fila para que um setItem e um removeItem simultâneos não misturem pedaços.
let fila: Promise<unknown> = Promise.resolve();
function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const proxima = fila.then(tarefa, tarefa);
  fila = proxima.catch(() => {});
  return proxima;
}

async function contagem(chave: string) {
  const n = Number(await SecureStore.getItemAsync(chaveContagem(chave), opcoesSeguras));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function apagarPedacos(chave: string, aPartirDe: number, ate: number) {
  for (let i = aPartirDe; i < ate; i++) {
    await SecureStore.deleteItemAsync(chavePedaco(chave, i), opcoesSeguras).catch(() => {});
  }
}

const armazenamentoSeguro: SupportedStorage = {
  async getItem(chave) {
    await fila;
    const n = await contagem(chave);
    if (!n) return null;
    let valor = '';
    for (let i = 0; i < n; i++) {
      const pedaco = await SecureStore.getItemAsync(chavePedaco(chave, i), opcoesSeguras);
      if (pedaco === null) return null;
      valor += pedaco;
    }
    return valor;
  },
  setItem(chave, valor) {
    return emFila(async () => {
      const antes = await contagem(chave);
      const n = Math.max(1, Math.ceil(valor.length / TAMANHO_PEDACO));
      for (let i = 0; i < n; i++) {
        const pedaco = valor.slice(i * TAMANHO_PEDACO, (i + 1) * TAMANHO_PEDACO);
        await SecureStore.setItemAsync(chavePedaco(chave, i), pedaco, opcoesSeguras);
      }
      await SecureStore.setItemAsync(chaveContagem(chave), String(n), opcoesSeguras);
      await apagarPedacos(chave, n, antes);
    });
  },
  removeItem(chave) {
    return emFila(async () => {
      const n = await contagem(chave);
      await SecureStore.deleteItemAsync(chaveContagem(chave), opcoesSeguras).catch(() => {});
      await apagarPedacos(chave, 0, n);
    });
  },
};

/** No web (só desenvolvimento) não há SecureStore: usa o localStorage do navegador. */
const armazenamentoWeb: SupportedStorage = {
  getItem: (chave) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(chave)),
  setItem: (chave, valor) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(chave, valor);
  },
  removeItem: (chave) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(chave);
  },
};

// ---------------------------------------------------------------------------
// Rede com tempo limite
// ---------------------------------------------------------------------------

const fetchComTempo: typeof fetch = async (entrada, opcoes) => {
  const controle = new AbortController();
  const externo = opcoes?.signal;
  const repassar = () => controle.abort(externo?.reason);
  if (externo?.aborted) repassar();
  else externo?.addEventListener('abort', repassar);

  let esgotou = false;
  const timer = setTimeout(() => {
    esgotou = true;
    controle.abort();
  }, TEMPO_LIMITE);
  try {
    return await fetch(entrada, { ...opcoes, signal: controle.signal });
  } catch (e) {
    if (esgotou) throw new Error(MARCA_TEMPO);
    throw e;
  } finally {
    clearTimeout(timer);
    externo?.removeEventListener('abort', repassar);
  }
};

// ---------------------------------------------------------------------------
// Cliente e sessão
// ---------------------------------------------------------------------------

let cliente: SupabaseClient | null = null;

/** O cliente Supabase, criado na primeira chamada. Lança `ErroNuvem('nao-configurada')` sem config. */
export function nuvem(): SupabaseClient {
  if (cliente) return cliente;
  const config = lerConfig();
  if (!config) throw new ErroNuvem('nao-configurada', 'As sugestões ainda não estão ligadas nesta versão.');

  cliente = createClient(config.url, config.anonKey, {
    auth: {
      storage: nativo ? armazenamentoSeguro : armazenamentoWeb,
      storageKey: CHAVE_SESSAO,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { fetch: fetchComTempo },
  });

  if (nativo) {
    // Renovação do token só com o app em primeiro plano (padrão da doc do Supabase para RN).
    const c = cliente;
    c.auth.startAutoRefresh();
    AppState.addEventListener('change', (estado) => {
      if (estado === 'active') c.auth.startAutoRefresh();
      else c.auth.stopAutoRefresh();
    });
  }
  return cliente;
}

let entrando: Promise<Session> | null = null;

/**
 * Devolve a sessão atual ou entra como anônimo. Chamar só quando a pessoa abre uma tela da nuvem.
 * `captchaToken` é necessário apenas se o CAPTCHA de login estiver ligado no projeto.
 */
export function garantirSessao(captchaToken?: string): Promise<Session> {
  entrando ??= (async () => {
    const c = nuvem();
    const atual = await c.auth.getSession().catch((e: unknown) => ({ data: { session: null }, error: e }));
    if (atual.data.session) return atual.data.session;
    if (atual.error) {
      const erro = paraErroNuvem(atual.error);
      if (erro.tipo === 'offline') throw erro;
      // Refresh token inválido (conta anônima limpa no servidor, por exemplo): começa de novo.
      await c.auth.signOut({ scope: 'local' }).catch(() => {});
    }

    const { data, error } = await c.auth
      .signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined)
      .catch((e: unknown) => ({ data: { session: null }, error: e }));
    if (error) throw paraErroNuvem(error);
    if (!data.session) throw new ErroNuvem('servidor', 'Não foi possível entrar.');
    return data.session;
  })().finally(() => {
    entrando = null;
  });
  return entrando;
}

/** Usuário atual sem criar sessão nova (null se nunca entrou ou a nuvem está desligada). */
export async function sessaoAtual(): Promise<Session | null> {
  if (!nuvemConfigurada()) return null;
  const { data } = await nuvem().auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session;
}

/** Esquece a sessão neste aparelho (usado por "Apagar tudo" e pelo logout do admin). */
export async function sairDaNuvem() {
  if (cliente) await cliente.auth.signOut({ scope: 'local' }).catch(() => {});
  if (nativo) await armazenamentoSeguro.removeItem(CHAVE_SESSAO);
  else await armazenamentoWeb.removeItem(CHAVE_SESSAO);
}
