/**
 * Novidades (changelog) vindas da tabela `versoes`, com cópia local para abrir offline.
 *
 * `versoes` publicadas são públicas na RLS, então a lista não cria conta anônima. Só as
 * "Ideias da comunidade" lançadas em cada versão pedem sessão; sem ela (ou sem rede) vêm vazias.
 */
import { gravarEstado, lerEstado } from '../banco';
import { consultar, ehErroNuvem, garantirSessao, nuvemConfigurada } from './cliente';
import { paraVersao, type LinhaVersao, type Versao } from './tipos';

const CHAVE_CACHE = 'consi:novidades:cache';
const CHAVE_VISTA = 'consi:novidades:vista';
const COLUNAS_VERSAO = 'id, versao, titulo, data, itens, publicada';

export type Novidades = {
  versoes: Versao[];
  /** 'rede' = acabou de vir do servidor; 'cache' = última cópia salva (offline). */
  origem: 'rede' | 'cache';
  /** Quando veio do cache por falta de rede: o erro, para mostrar "Sem conexão". */
  erro?: unknown;
};

async function lerCache(): Promise<Versao[] | null> {
  const bruto = await lerEstado(CHAVE_CACHE).catch(() => null);
  if (!bruto) return null;
  try {
    const dado = JSON.parse(bruto) as unknown;
    return Array.isArray(dado) ? (dado as Versao[]) : null;
  } catch {
    return null;
  }
}

async function sugestoesLancadas(ids: string[], comLogin: boolean) {
  const porVersao = new Map<string, Versao['sugestoes']>();
  if (!ids.length) return porVersao;
  try {
    if (comLogin) await garantirSessao();
    const linhas = await consultar(
      (c) =>
        c
          .from('sugestoes')
          .select('id, titulo, versao_lancada')
          .in('versao_lancada', ids)
          .eq('moderacao', 'publicada')
          .returns<{ id: string; titulo: string; versao_lancada: string }[]>(),
      { login: false },
    );
    for (const l of linhas) {
      porVersao.set(l.versao_lancada, [...(porVersao.get(l.versao_lancada) ?? []), { id: l.id, titulo: l.titulo }]);
    }
  } catch {
    // Sem sessão/rede: a versão aparece sem a lista de ideias.
  }
  return porVersao;
}

/**
 * Versões publicadas, da mais nova para a mais antiga. Tenta a rede e salva no cache;
 * sem rede devolve o cache. Só lança erro se não houver rede nem cache.
 * `comLogin` (padrão true) entra como anônimo para listar as ideias lançadas em cada versão.
 */
export async function listarNovidades({ comLogin = true }: { comLogin?: boolean } = {}): Promise<Novidades> {
  try {
    const linhas = await consultar(
      (c) =>
        c
          .from('versoes')
          .select(COLUNAS_VERSAO)
          .eq('publicada', true)
          .order('data', { ascending: false })
          .order('versao', { ascending: false })
          .returns<LinhaVersao[]>(),
      { login: false },
    );
    const ideias = await sugestoesLancadas(
      linhas.map((l) => l.id),
      comLogin,
    );
    const versoes = linhas.map((l) => paraVersao(l, ideias.get(l.id) ?? []));
    await gravarEstado(CHAVE_CACHE, JSON.stringify(versoes)).catch(() => {});
    return { versoes, origem: 'rede' };
  } catch (erro) {
    const cache = await lerCache();
    if (cache) return { versoes: cache, origem: 'cache', erro };
    if (ehErroNuvem(erro, 'nao-configurada')) return { versoes: [], origem: 'cache' };
    throw erro;
  }
}

/** Guarda a versão mais nova como vista (some o ponto de "não lido"). */
export async function marcarNovidadesVistas(versoes?: Versao[]): Promise<void> {
  const lista = versoes ?? (await lerCache()) ?? [];
  if (lista[0]) await gravarEstado(CHAVE_VISTA, lista[0].id);
}

/**
 * Há versão publicada que a pessoa ainda não abriu? Consulta só a mais nova (sem login) e cai
 * para o cache sem rede. Nunca lança erro: na dúvida, `false`.
 */
export async function temNovidadeNaoVista(): Promise<boolean> {
  try {
    const vista = await lerEstado(CHAVE_VISTA);
    let maisNova: string | undefined;
    if (nuvemConfigurada()) {
      try {
        const linhas = await consultar(
          (c) =>
            c
              .from('versoes')
              .select('id')
              .eq('publicada', true)
              .order('data', { ascending: false })
              .order('versao', { ascending: false })
              .limit(1)
              .returns<{ id: string }[]>(),
          { login: false },
        );
        maisNova = linhas[0]?.id;
      } catch {
        maisNova = (await lerCache())?.[0]?.id;
      }
    }
    return !!maisNova && maisNova !== vista;
  } catch {
    return false;
  }
}
