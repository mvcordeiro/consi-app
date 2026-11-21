/**
 * Moderação (só admin). A RLS é quem garante: um anônimo que chamar isto recebe lista vazia
 * ou `ErroNuvem('sem-permissao')`.
 *
 * Login do admin: e-mail + senha, só para uma conta criada no painel do Supabase e listada em
 * `admins` (ver docs/supabase.md). Sem código por e-mail: o modelo padrão do Supabase só manda
 * link e não pode ser editado sem SMTP próprio. A sessão do admin substitui a anônima
 * neste aparelho; `sairDaNuvem()` volta ao anônimo na próxima vez.
 */
import { consultar, ErroNuvem, garantirSessao, nuvem, paraErroNuvem } from './cliente';
import {
  COLUNAS_SUGESTAO,
  LIMITES,
  paraSugestao,
  paraVersao,
  type CategoriaSugestao,
  type ItemVersao,
  type LinhaSugestao,
  type LinhaVersao,
  type Moderacao,
  type StatusSugestao,
  type SugestaoModeracao,
  type Versao,
} from './tipos';

export { sairDaNuvem as sairAdmin } from './cliente';

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** A sessão atual é de um admin? Nunca cria conta: sem sessão, `false`. */
export async function souAdmin(): Promise<boolean> {
  try {
    const { data } = await nuvem().auth.getSession();
    if (!data.session || data.session.user.is_anonymous) return false;
    return (await consultar((c) => c.rpc('is_admin'), { login: false })) === true;
  } catch {
    return false;
  }
}

/**
 * Entra com e-mail e senha (conta criada no painel do Supabase; nunca cria conta pelo app).
 * Devolve `true` se a conta é admin; se não for, sai e devolve `false`.
 * Lança `ErroNuvem('sem-permissao')` com e-mail ou senha errados e `'offline'` sem rede.
 */
export async function entrarAdmin(email: string, senha: string): Promise<boolean> {
  const { error } = await nuvem()
    .auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    .catch((e: unknown) => ({ error: e }));
  if (error) {
    const erro = paraErroNuvem(error);
    if (erro.tipo === 'sem-permissao') throw new ErroNuvem('sem-permissao', 'E-mail ou senha incorretos.', error);
    throw erro;
  }
  if (await souAdmin()) return true;
  await nuvem().auth.signOut({ scope: 'local' }).catch(() => {});
  return false;
}

// ---------------------------------------------------------------------------
// Fila
// ---------------------------------------------------------------------------

type LinhaModeracao = LinhaSugestao & { denuncias: { count: number }[] };

function paraModeracao(l: LinhaModeracao, eu: string): SugestaoModeracao {
  return { ...paraSugestao(l, eu), denuncias: l.denuncias?.[0]?.count ?? 0 };
}

/** Sugestões por estado de moderação. Pendentes: mais antigas primeiro; demais: mais novas. */
export async function fila(moderacao: Moderacao, pagina = 0, tamanho = 30): Promise<SugestaoModeracao[]> {
  const eu = (await garantirSessao()).user.id;
  const de = pagina * tamanho;
  const linhas = await consultar((c) =>
    c
      .from('sugestoes')
      .select(`${COLUNAS_SUGESTAO}, denuncias(count)`)
      .eq('moderacao', moderacao)
      .order('criada_em', { ascending: moderacao === 'pendente' })
      .range(de, de + tamanho - 1)
      .returns<LinhaModeracao[]>(),
  );
  return linhas.map((l) => paraModeracao(l, eu));
}

/** Contadores para as abas da fila. `escondidas` inclui as que caíram por denúncia. */
export async function contarFila(): Promise<{ pendentes: number; escondidas: number }> {
  const contar = async (moderacao: Moderacao) => {
    await garantirSessao();
    const { count, error } = await nuvem()
      .from('sugestoes')
      .select('id', { count: 'exact', head: true })
      .eq('moderacao', moderacao);
    if (error) throw paraErroNuvem(error);
    return count ?? 0;
  };
  const [pendentes, escondidas] = await Promise.all([contar('pendente'), contar('escondida')]);
  return { pendentes, escondidas };
}

/** Denúncias de uma sugestão (motivos), mais recentes primeiro. */
export async function denunciasDe(id: string): Promise<{ motivo: string | null; criadaEm: string }[]> {
  const linhas = await consultar((c) =>
    c
      .from('denuncias')
      .select('motivo, criada_em')
      .eq('sugestao', id)
      .order('criada_em', { ascending: false })
      .returns<{ motivo: string | null; criada_em: string }[]>(),
  );
  return linhas.map((l) => ({ motivo: l.motivo, criadaEm: l.criada_em }));
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

type Mudanca = Partial<{
  titulo: string;
  descricao: string | null;
  categoria: CategoriaSugestao | null;
  moderacao: Moderacao;
  status: StatusSugestao;
  resposta: string | null;
  versao_lancada: string | null;
}>;

async function atualizar(id: string, mudanca: Mudanca): Promise<void> {
  const linhas = await consultar((c) =>
    c.from('sugestoes').update(mudanca).eq('id', id).select('id').returns<{ id: string }[]>(),
  );
  // RLS bloqueou (não é admin) ou a sugestão não existe.
  if (!linhas.length) throw new ErroNuvem('sem-permissao', 'Não foi possível alterar esta sugestão.');
}

export const aprovar = (id: string) => atualizar(id, { moderacao: 'publicada' });

/** O motivo fica em `resposta`, visível só para o autor. */
export const rejeitar = (id: string, motivo?: string) =>
  atualizar(id, { moderacao: 'rejeitada', resposta: motivo?.trim().slice(0, LIMITES.respostaMax) || null });

export const esconder = (id: string) => atualizar(id, { moderacao: 'escondida' });

export function editar(
  id: string,
  campos: { titulo?: string; descricao?: string | null; categoria?: CategoriaSugestao | null },
) {
  const mudanca: Mudanca = {};
  if (campos.titulo !== undefined) mudanca.titulo = campos.titulo.trim();
  if (campos.descricao !== undefined) mudanca.descricao = campos.descricao?.trim() || null;
  if (campos.categoria !== undefined) mudanca.categoria = campos.categoria;
  return atualizar(id, mudanca);
}

/** Ao marcar `lancada`, passe a versão do changelog em que saiu. */
export function definirStatus(id: string, status: StatusSugestao, versaoLancada?: string | null) {
  const mudanca: Mudanca = { status };
  if (status === 'lancada') mudanca.versao_lancada = versaoLancada ?? null;
  return atualizar(id, mudanca);
}

/** Resposta oficial (texto vazio apaga). */
export const responder = (id: string, texto: string) =>
  atualizar(id, { resposta: texto.trim().slice(0, LIMITES.respostaMax) || null });

/** Junta `origem` em `destino`: move os votos, esconde a origem e marca `duplicada_de`. */
export async function mesclar(origem: string, destino: string): Promise<void> {
  await consultar((c) => c.rpc('mesclar_sugestoes', { origem, destino }));
}

/** Apaga de vez (spam). Prefira `rejeitar`/`esconder`, que mantêm o histórico. */
export async function apagar(id: string): Promise<void> {
  await consultar((c) => c.from('sugestoes').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Versões (changelog)
// ---------------------------------------------------------------------------

const COLUNAS_VERSAO = 'id, versao, titulo, data, itens, publicada';

export type DadosVersao = {
  versao: string;
  titulo?: string | null;
  /** AAAA-MM-DD; padrão = hoje no servidor. */
  data?: string;
  itens: ItemVersao[];
  publicada?: boolean;
};

/** Todas as versões, incluindo rascunhos. */
export async function listarVersoes(): Promise<Versao[]> {
  const linhas = await consultar((c) =>
    c
      .from('versoes')
      .select(COLUNAS_VERSAO)
      .order('data', { ascending: false })
      .order('versao', { ascending: false })
      .returns<LinhaVersao[]>(),
  );
  return linhas.map((l) => paraVersao(l));
}

export async function criarVersao(dados: DadosVersao): Promise<Versao> {
  const linha = await consultar((c) =>
    c
      .from('versoes')
      .insert({
        versao: dados.versao.trim(),
        titulo: dados.titulo?.trim() || null,
        itens: dados.itens,
        publicada: dados.publicada ?? false,
        ...(dados.data ? { data: dados.data } : {}),
      })
      .select(COLUNAS_VERSAO)
      .single<LinhaVersao>(),
  );
  return paraVersao(linha);
}

export async function editarVersao(id: string, dados: Partial<DadosVersao>): Promise<Versao> {
  const mudanca: Record<string, unknown> = {};
  if (dados.versao !== undefined) mudanca.versao = dados.versao.trim();
  if (dados.titulo !== undefined) mudanca.titulo = dados.titulo?.trim() || null;
  if (dados.data !== undefined) mudanca.data = dados.data;
  if (dados.itens !== undefined) mudanca.itens = dados.itens;
  if (dados.publicada !== undefined) mudanca.publicada = dados.publicada;
  const linha = await consultar((c) =>
    c.from('versoes').update(mudanca).eq('id', id).select(COLUNAS_VERSAO).maybeSingle<LinhaVersao>(),
  );
  if (!linha) throw new ErroNuvem('sem-permissao', 'Não foi possível alterar esta versão.');
  return paraVersao(linha);
}

export const publicarVersao = (id: string, publicada = true) => editarVersao(id, { publicada });

export async function apagarVersao(id: string): Promise<void> {
  await consultar((c) => c.from('versoes').delete().eq('id', id));
}
