/**
 * Piloto de teste: eventos de uso anônimos e o convite para o formulário final.
 *
 * - `install_id`: código aleatório gerado na primeira abertura. Não identifica a pessoa e não
 *   tem ligação com nada do diário. Os 8 primeiros caracteres são o "código do piloto" que a
 *   pessoa cola no formulário (o botão em Ajustes → Sobre já abre o formulário com ele).
 * - Eventos: só o nome e poucas propriedades fixas (origem, dia). Nunca texto digitado, nomes de
 *   apps ou de hobbies da pessoa. Ver supabase/migrations/0003_eventos.sql.
 * - Offline-first: os eventos entram numa fila gravada no aparelho e seguem em lotes quando há
 *   rede (ao registrar, e quando o app vai para segundo plano). Nunca bloqueia nem lança erro.
 * - A pessoa pode desligar em Ajustes → Privacidade e dados. Sem Supabase configurado, nada é enviado.
 */
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';

import { ConsiPausa } from '../../modules/consi-pausa';
import { gravarEstado, lerEstado } from './banco';
import { configDaNuvem } from './nuvem/cliente';

const CHAVE = 'consi:piloto';
const CHAVE_FILA = 'consi:piloto:fila';
const MAX_FILA = 200;
const LOTE = 50;
const TEMPO_LIMITE = 10000;
const ESPERA_ENVIO = 4000;
const DIA = 86_400_000;

/** Dias de uso até o convite para o formulário. */
export const DIAS_DO_PILOTO = 7;

type Dados = {
  id: string;
  /** Primeira abertura do app (ms). */
  inicio: number;
  /** Coleta de uso ligada (padrão). */
  coleta: boolean;
  /** Já respondeu ao formulário: o convite não volta. */
  respondeu: boolean;
  /** "Lembrar depois": o convite só volta a partir deste instante (ms). */
  adiadoAte: number;
};

type Evento = { evento: string; props?: Record<string, string | number | boolean>; em: string };

let dados: Dados | null = null;
let fila: Evento[] = [];
let carregando: Promise<Dados> | null = null;

async function gravarDados() {
  if (dados) await gravarEstado(CHAVE, JSON.stringify(dados)).catch(() => {});
}
const gravarFila = () => gravarEstado(CHAVE_FILA, JSON.stringify(fila)).catch(() => {});

async function carregar(): Promise<Dados> {
  let lido: Partial<Dados> = {};
  try {
    lido = JSON.parse((await lerEstado(CHAVE)) ?? '{}') as Partial<Dados>;
    const f = JSON.parse((await lerEstado(CHAVE_FILA)) ?? '[]') as Evento[];
    fila = Array.isArray(f) ? f.slice(-MAX_FILA) : [];
  } catch {
    fila = [];
  }
  const novo = !lido.id || !lido.inicio;
  dados = {
    id: typeof lido.id === 'string' && lido.id.length >= 8 ? lido.id : Crypto.randomUUID(),
    inicio: typeof lido.inicio === 'number' ? lido.inicio : Date.now(),
    coleta: lido.coleta !== false,
    respondeu: lido.respondeu === true,
    adiadoAte: typeof lido.adiadoAte === 'number' ? lido.adiadoAte : 0,
  };
  if (novo) await gravarDados();
  return dados;
}

/** Lê (uma vez) o código, o início e as escolhas do piloto. Nunca falha. */
export function pilotoCarregado(): Promise<Dados> {
  carregando ??= carregar().catch((e) => {
    carregando = null;
    throw e;
  });
  return carregando;
}

export const codigoDoPiloto = (d: Dados) => d.id.slice(0, 8).toUpperCase();

/** Em que dia do piloto a pessoa está (1 = primeiro dia). */
export const diaDoPiloto = (d: Dados, agora = Date.now()) => Math.floor((agora - d.inicio) / DIA) + 1;

// ─── Envio ──────────────────────────────────────────────────────────────────
let enviando = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function enviar() {
  if (enviando) return;
  enviando = true;
  try {
    const cfg = configDaNuvem();
    const d = await pilotoCarregado();
    if (!cfg || !d.coleta) return;
    const versao = Constants.expoConfig?.version ?? '';
    while (fila.length) {
      const lote = fila.slice(0, LOTE);
      const corpo = lote.map((e) => ({
        install_id: d.id,
        evento: e.evento,
        props: e.props ?? {},
        versao,
        plataforma: Platform.OS,
        ocorreu_em: e.em,
      }));
      const controle = new AbortController();
      const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE);
      let status: number;
      try {
        // Só `apikey`: a chave pública nova (sb_publishable_…) não é um JWT e não vai em Authorization.
        const r = await fetch(`${cfg.url}/rest/v1/eventos`, {
          method: 'POST',
          headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(corpo),
          signal: controle.signal,
        });
        status = r.status;
      } finally {
        clearTimeout(limite);
      }
      // 2xx: enviado. 400/422: lote que o servidor nunca vai aceitar (descarta para não travar a fila).
      // Qualquer outro erro (sem rede, 5xx, tabela ainda não criada): tenta de novo mais tarde.
      if ((status >= 200 && status < 300) || status === 400 || status === 422) {
        fila.splice(0, lote.length);
        await gravarFila();
      } else break;
    }
  } catch {
    // sem rede: a fila continua gravada
  } finally {
    enviando = false;
  }
}

function agendarEnvio() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void enviar();
  }, ESPERA_ENVIO);
}

/**
 * Registra um evento de uso. `props` só com valores fixos do app (nunca texto da pessoa).
 * Dispara e esquece: não espera nada e nunca lança.
 */
export function registrar(evento: string, props?: Record<string, string | number | boolean>) {
  void (async () => {
    try {
      const d = await pilotoCarregado();
      if (!d.coleta || !configDaNuvem()) return;
      fila.push({ evento, props, em: new Date().toISOString() });
      if (fila.length > MAX_FILA) fila.splice(0, fila.length - MAX_FILA);
      await gravarFila();
      agendarEnvio();
    } catch {
      // telemetria nunca atrapalha o app
    }
  })();
}

// ─── Notificação do dia 7 (Android, APK versionCode 9 ou mais novo) ─────────
const TITULO_CONVITE = 'Como foi sua semana com o Consi?';
const TEXTO_CONVITE = 'Faz 7 dias de teste. Leva uns 6 minutos e as respostas são anônimas.';

/** Quando a notificação toca: 7 dias depois da primeira abertura, em horário razoável (9h às 21h). */
function momentoDoConvite(d: Dados) {
  const alvo = new Date(d.inicio + DIAS_DO_PILOTO * DIA);
  if (alvo.getHours() < 9) alvo.setHours(9, 0, 0, 0);
  else if (alvo.getHours() >= 21) {
    alvo.setDate(alvo.getDate() + 1);
    alvo.setHours(9, 0, 0, 0);
  }
  return alvo.getTime();
}

/** Agenda (ou cancela, se já respondeu) a notificação. Sem o módulo novo, não faz nada. */
function sincronizarNotificacao(d: Dados) {
  try {
    if (!ConsiPausa?.agendarConvitePiloto || !ConsiPausa.cancelarConvitePiloto) return;
    if (d.respondeu || !formularioConfigurado()) {
      ConsiPausa.cancelarConvitePiloto();
      return;
    }
    const quando = momentoDoConvite(d);
    // Passou da hora: a folha ao abrir o app faz o convite; a notificação não vem atrasada.
    if (quando > Date.now()) ConsiPausa.agendarConvitePiloto(quando, TITULO_CONVITE, TEXTO_CONVITE);
  } catch {
    // o convite continua pela folha
  }
}

let iniciado = false;

/** Chamado uma vez no layout raiz: registra a abertura, agenda o convite e envia a fila ao ir para segundo plano. */
export function iniciarPiloto() {
  if (iniciado) return;
  iniciado = true;
  void pilotoCarregado()
    .then((d) => {
      registrar('app_aberto', { dia: diaDoPiloto(d) });
      sincronizarNotificacao(d);
    })
    .catch(() => {});
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') {
      void pilotoCarregado()
        .then((d) => {
          registrar('app_aberto', { dia: diaDoPiloto(d) });
          sincronizarNotificacao(d);
        })
        .catch(() => {});
    } else {
      void enviar();
    }
  });
}

// ─── Escolhas da pessoa ─────────────────────────────────────────────────────
export async function definirColeta(ligada: boolean) {
  const d = await pilotoCarregado();
  d.coleta = ligada;
  if (!ligada) {
    fila = [];
    await gravarFila();
  }
  await gravarDados();
}

export async function marcarRespondeu() {
  const d = await pilotoCarregado();
  d.respondeu = true;
  await gravarDados();
  sincronizarNotificacao(d);
}

/** "Lembrar depois": o convite some por `dias` dias. */
export async function adiarConvite(dias = 1) {
  const d = await pilotoCarregado();
  d.adiadoAte = Date.now() + dias * DIA;
  await gravarDados();
}

// ─── Formulário ─────────────────────────────────────────────────────────────
type ConfigPiloto = { formulario?: string; campoCodigo?: string };

function configDoPiloto(): ConfigPiloto {
  return ((Constants.expoConfig?.extra as { piloto?: ConfigPiloto } | undefined)?.piloto ?? {}) as ConfigPiloto;
}

/** O formulário configurado em app.json → expo.extra.piloto, ou false com valor de exemplo. */
export function formularioConfigurado() {
  const f = configDoPiloto().formulario;
  return !!f && f.startsWith('https://') && !f.includes('PREENCHER');
}

/**
 * Endereço do formulário já com o código do piloto preenchido (parâmetro `entry.<campo>` do
 * Google Forms, "Obter link pré-preenchido"). Sem `campoCodigo`, abre o formulário puro.
 */
export function enderecoDoFormulario(d: Dados): string | null {
  if (!formularioConfigurado()) return null;
  const { formulario, campoCodigo } = configDoPiloto();
  const base = formulario as string;
  if (!campoCodigo || campoCodigo.includes('PREENCHER')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}usp=pp_url&entry.${encodeURIComponent(campoCodigo)}=${encodeURIComponent(codigoDoPiloto(d))}`;
}

/** O convite já pode aparecer? Passou uma semana, não respondeu e não foi adiado. */
export function conviteDevido(d: Dados, agora = Date.now()) {
  return formularioConfigurado() && !d.respondeu && diaDoPiloto(d, agora) > DIAS_DO_PILOTO && agora >= d.adiadoAte;
}
