/**
 * @handle único (issue #3): reservado no Supabase (tabela `perfis`, migration 0005) com a sessão
 * anônima das Sugestões. A foto continua só no aparelho.
 */
import { consultar, ErroNuvem, garantirSessao, paraErroNuvem } from './cliente';

export const HANDLE_REGEX = /^[a-z0-9._]{3,20}$/;

/** Tira o @ do começo, espaços e maiúsculas: "@Ana.Luz " → "ana.luz". */
export const limparHandle = (h: string) => h.trim().replace(/^@+/, '').toLowerCase();

export async function handleDisponivel(h: string): Promise<boolean> {
  const r = await consultar((c) => c.rpc('handle_disponivel', { h }));
  return r === true;
}

/** Reserva (ou troca) o handle desta sessão. `ErroNuvem('servidor', 'em-uso')` se já é de outra pessoa. */
export async function reservarHandle(h: string): Promise<void> {
  if (!HANDLE_REGEX.test(h)) throw new ErroNuvem('servidor', 'invalido');
  const sessao = await garantirSessao();
  try {
    await consultar((c) => c.from('perfis').upsert({ id: sessao.user.id, handle: h, atualizado_em: new Date().toISOString() }));
  } catch (e) {
    const causa = (e as ErroNuvem).causa as { code?: string } | undefined;
    if (causa?.code === '23505') throw new ErroNuvem('servidor', 'em-uso', e);
    throw paraErroNuvem(e);
  }
}

export async function liberarHandle(): Promise<void> {
  const sessao = await garantirSessao();
  await consultar((c) => c.from('perfis').delete().eq('id', sessao.user.id));
}
