/**
 * Feedback privado (issue #16): vai só para a equipe, diferente das Sugestões, que são públicas.
 * Usa a mesma sessão anônima das Sugestões e a tabela `feedback` (supabase/migrations/0004).
 * A versão do app e o aparelho vão junto, para a equipe reproduzir um bug; nada do diário,
 * hobbies ou pausa é enviado.
 */
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { consultar, ErroNuvem, garantirSessao, nuvem, paraErroNuvem } from './cliente';

export const TIPOS_FEEDBACK = ['bug', 'ideia', 'elogio', 'outro'] as const;
export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number];

export const NOME_TIPO_FEEDBACK: Record<TipoFeedback, string> = {
  bug: 'Algo deu errado',
  ideia: 'Ideia',
  elogio: 'Elogio',
  outro: 'Outro',
};

export const LIMITES_FEEDBACK = { textoMin: 3, textoMax: 2000 };

/** Versão do app, sistema e aparelho, como aparecem na tela antes de enviar. */
export function infoDoAparelho() {
  const c = (Platform.constants ?? {}) as { Brand?: string; Model?: string; Release?: string; systemName?: string };
  const aparelho = [c.Brand, c.Model].filter(Boolean).join(' ') || Constants.deviceName || null;
  const sistema =
    Platform.OS === 'android' ? `Android ${c.Release ?? Platform.Version}` : Platform.OS === 'ios' ? `iOS ${Platform.Version}` : 'Web';
  return {
    versao: Constants.expoConfig?.version ?? null,
    plataforma: Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'web',
    sistema: sistema.slice(0, 40),
    aparelho: aparelho ? aparelho.slice(0, 80) : null,
  };
}

async function enviarPrint(uri: string, autor: string): Promise<string> {
  const ext = /\.png$/i.test(uri) ? 'png' : 'jpg';
  const caminho = `${autor}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    const bytes = await new File(uri).bytes();
    const { error } = await nuvem()
      .storage.from('feedback')
      .upload(caminho, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg' });
    if (error) throw error;
  } catch (e) {
    throw paraErroNuvem(e);
  }
  return caminho;
}

export type NovoFeedback = { tipo: TipoFeedback; texto: string; print?: string | null };

/** Envia o feedback (e o print, se houver). Lança `ErroNuvem('limite-diario')` após 5 no dia. */
export async function enviarFeedback({ tipo, texto, print }: NovoFeedback): Promise<void> {
  const t = texto.trim();
  if (t.length < LIMITES_FEEDBACK.textoMin || t.length > LIMITES_FEEDBACK.textoMax) {
    throw new ErroNuvem('servidor', `Escreva de ${LIMITES_FEEDBACK.textoMin} a ${LIMITES_FEEDBACK.textoMax} letras.`);
  }
  const sessao = await garantirSessao();
  const caminho = print ? await enviarPrint(print, sessao.user.id) : null;
  await consultar((c) => c.from('feedback').insert({ tipo, texto: t, print: caminho, ...infoDoAparelho() }));
}
