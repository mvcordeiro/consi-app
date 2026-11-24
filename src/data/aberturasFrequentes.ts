/**
 * Abertura excessiva de um app (issue #14). Cada pausa de um app conta como uma tentativa de
 * abrir; com 3 ou mais na última hora, a pausa troca a mensagem por um convite para escrever
 * sobre isso ou explorar atividades. Depois de avisar, o mesmo app só avisa de novo após
 * ESPERA_MS, para não virar ruído. Tudo fica no banco local.
 */
import { gravarEstado, lerEstado } from './banco';

const CHAVE = 'consi:pausa:aberturas';
export const LIMITE_ABERTURAS = 3;
const JANELA_MS = 60 * 60 * 1000;
const ESPERA_MS = 6 * 60 * 60 * 1000;

type Guardado = { aberturas: Record<string, number[]>; avisos: Record<string, number> };

async function ler(): Promise<Guardado> {
  try {
    const bruto = await lerEstado(CHAVE);
    if (bruto) {
      const g = JSON.parse(bruto) as Partial<Guardado>;
      return { aberturas: g.aberturas ?? {}, avisos: g.avisos ?? {} };
    }
  } catch {
    // sem banco ou dado corrompido
  }
  return { aberturas: {}, avisos: {} };
}

/**
 * Registra a pausa de `app` agora e diz se é hora do aviso de abertura excessiva.
 * Chamar uma vez por pausa.
 */
export async function registrarAbertura(app: string, agora = Date.now()): Promise<boolean> {
  const g = await ler();
  const recentes = [...(g.aberturas[app] ?? []).filter((t) => agora - t < JANELA_MS), agora];
  g.aberturas[app] = recentes;
  // limpa apps sem pausa na última hora
  for (const [k, l] of Object.entries(g.aberturas)) if (!l.some((t) => agora - t < JANELA_MS)) delete g.aberturas[k];
  const avisar = recentes.length >= LIMITE_ABERTURAS && agora - (g.avisos[app] ?? 0) >= ESPERA_MS;
  if (avisar) g.avisos[app] = agora;
  await gravarEstado(CHAVE, JSON.stringify(g)).catch(() => {});
  return avisar;
}
