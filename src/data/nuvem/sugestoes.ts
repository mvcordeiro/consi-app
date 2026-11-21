/**
 * Sugestões públicas: lista, detalhe, envio, votos e denúncia.
 * Todas as funções entram como anônimo sob demanda e lançam `ErroNuvem` (ver cliente.ts).
 * O placar é calculado no servidor; o voto otimista fica na tela (desfazer se `votar` falhar).
 */
import { consultar, ErroNuvem, garantirSessao } from './cliente';
import {
  COLUNAS_SUGESTAO,
  LIMITES,
  paraSugestao,
  type CategoriaSugestao,
  type LinhaSugestao,
  type Placar,
  type StatusSugestao,
  type Sugestao,
  type ValorVoto,
} from './tipos';

export type AbaSugestoes = 'alta' | 'recentes' | 'planejadas' | 'lancadas' | 'minhas';
export type PaginaSugestoes = { itens: Sugestao[]; temMais: boolean };

export const TAMANHO_PAGINA = 20;
const STATUS_PLANEJADAS: StatusSugestao[] = ['planejada', 'em_andamento'];

async function meuId() {
  return (await garantirSessao()).user.id;
}

/** Votos desta pessoa nas sugestões dadas. */
async function meusVotos(ids: string[]): Promise<Map<string, ValorVoto>> {
  if (!ids.length) return new Map();
  const linhas = await consultar((c) =>
    c.from('votos').select('sugestao, valor').in('sugestao', ids).returns<{ sugestao: string; valor: 1 | -1 }[]>(),
  );
  return new Map(linhas.map((l) => [l.sugestao, l.valor]));
}

async function comVotos(linhas: LinhaSugestao[], eu: string): Promise<Sugestao[]> {
  const votos = await meusVotos(linhas.map((l) => l.id));
  return linhas.map((l) => paraSugestao(l, eu, votos.get(l.id) ?? 0));
}

/** `pagina` começa em 0. */
export async function listarSugestoes(aba: AbaSugestoes, pagina = 0): Promise<PaginaSugestoes> {
  const eu = await meuId();
  const de = pagina * TAMANHO_PAGINA;
  // Pede um a mais para saber se há próxima página.
  const ate = de + TAMANHO_PAGINA;

  const linhas = await consultar((c) => {
    if (aba === 'alta') {
      return c
        .from('sugestoes_ranking')
        .select(COLUNAS_SUGESTAO)
        .is('duplicada_de', null)
        .order('calor', { ascending: false })
        .order('criada_em', { ascending: false })
        .range(de, ate)
        .returns<LinhaSugestao[]>();
    }
    if (aba === 'minhas') {
      return c
        .from('sugestoes')
        .select(COLUNAS_SUGESTAO)
        .eq('autor', eu)
        .order('criada_em', { ascending: false })
        .range(de, ate)
        .returns<LinhaSugestao[]>();
    }
    let q = c.from('sugestoes').select(COLUNAS_SUGESTAO).eq('moderacao', 'publicada').is('duplicada_de', null);
    if (aba === 'planejadas') {
      q = q.in('status', STATUS_PLANEJADAS).order('pontos', { ascending: false });
    } else if (aba === 'lancadas') {
      q = q.eq('status', 'lancada').order('atualizada_em', { ascending: false });
    }
    return q.order('criada_em', { ascending: false }).range(de, ate).returns<LinhaSugestao[]>();
  });

  const temMais = linhas.length > TAMANHO_PAGINA;
  return { itens: await comVotos(linhas.slice(0, TAMANHO_PAGINA), eu), temMais };
}

export type DetalheSugestao = Sugestao & { versao: { id: string; versao: string; titulo: string | null } | null };

/** `null` se não existe ou não é visível para esta pessoa (pendente de outro, rejeitada...). */
export async function detalheSugestao(id: string): Promise<DetalheSugestao | null> {
  const eu = await meuId();
  const linha = await consultar((c) =>
    c
      .from('sugestoes')
      .select(`${COLUNAS_SUGESTAO}, versao:versoes(id, versao, titulo)`)
      .eq('id', id)
      .maybeSingle<LinhaSugestao & { versao: DetalheSugestao['versao'] }>(),
  );
  if (!linha) return null;
  const [sugestao] = await comVotos([linha], eu);
  return { ...sugestao, versao: linha.versao ?? null };
}

export type NovaSugestao = { titulo: string; descricao?: string; categoria?: CategoriaSugestao | null };

/** Envia para a fila de moderação. Lança `ErroNuvem('limite-diario')` após 3 no dia. */
export async function enviarSugestao({ titulo, descricao, categoria }: NovaSugestao): Promise<Sugestao> {
  const t = titulo.trim();
  const d = descricao?.trim() || null;
  if (t.length < LIMITES.tituloMin || t.length > LIMITES.tituloMax) {
    throw new ErroNuvem('servidor', `O título precisa ter de ${LIMITES.tituloMin} a ${LIMITES.tituloMax} letras.`);
  }
  if (d && d.length > LIMITES.descricaoMax) {
    throw new ErroNuvem('servidor', `A descrição pode ter até ${LIMITES.descricaoMax} letras.`);
  }
  const eu = await meuId();
  const linha = await consultar((c) =>
    c
      .from('sugestoes')
      .insert({ titulo: t, descricao: d, categoria: categoria ?? null })
      .select(COLUNAS_SUGESTAO)
      .single<LinhaSugestao>(),
  );
  return paraSugestao(linha, eu);
}

/** Palavras com 4+ letras do título, sem caracteres que quebrariam o filtro do PostgREST. */
function palavrasDeBusca(titulo: string) {
  const palavras = titulo.toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return [...new Set(palavras)].sort((a, b) => b.length - a.length).slice(0, 4);
}

/** "Já existe algo assim?": publicadas com alguma palavra do título, mais votadas primeiro. */
export async function buscarParecidas(titulo: string, limite = 5): Promise<Sugestao[]> {
  const palavras = palavrasDeBusca(titulo);
  if (!palavras.length) return [];
  const eu = await meuId();
  const linhas = await consultar((c) =>
    c
      .from('sugestoes')
      .select(COLUNAS_SUGESTAO)
      .eq('moderacao', 'publicada')
      .is('duplicada_de', null)
      .or(palavras.map((p) => `titulo.ilike.*${p}*`).join(','))
      .order('pontos', { ascending: false })
      .limit(limite)
      .returns<LinhaSugestao[]>(),
  );
  return comVotos(linhas, eu);
}

/** 1 ou -1 grava (ou troca) o voto; 0 remove. Devolve o placar atualizado pelo servidor. */
export async function votar(id: string, valor: ValorVoto): Promise<Placar> {
  const eu = await meuId();
  if (valor === 0) {
    await consultar((c) => c.from('votos').delete().eq('sugestao', id).eq('usuario', eu));
  } else {
    await consultar((c) =>
      c.from('votos').upsert({ sugestao: id, usuario: eu, valor }, { onConflict: 'sugestao,usuario' }),
    );
  }
  const placar = await consultar((c) =>
    c
      .from('sugestoes')
      .select('pontos, votos_pos, votos_neg')
      .eq('id', id)
      .single<{ pontos: number; votos_pos: number; votos_neg: number }>(),
  );
  return { pontos: placar.pontos, votosPos: placar.votos_pos, votosNeg: placar.votos_neg };
}

/** Denunciar duas vezes a mesma sugestão não é erro (a segunda é ignorada). */
export async function denunciar(id: string, motivo?: string): Promise<void> {
  const m = motivo?.trim().slice(0, 500) || null;
  try {
    await consultar((c) => c.from('denuncias').insert({ sugestao: id, motivo: m }));
  } catch (e) {
    const codigo = (e instanceof ErroNuvem ? (e.causa as { code?: string } | undefined) : undefined)?.code;
    if (codigo === '23505') return;
    throw e;
  }
}

/** O autor pode apagar a própria sugestão enquanto ela está pendente. */
export async function apagarMinhaSugestao(id: string): Promise<void> {
  await consultar((c) => c.from('sugestoes').delete().eq('id', id).eq('moderacao', 'pendente'));
}
