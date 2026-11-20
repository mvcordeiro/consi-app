import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Confere se existe um APK mais novo do que o instalado (mudança nativa, que não chega por EAS Update).
 *
 * O endereço fica em app.json → expo.extra.versaoNativa.url e deve devolver um JSON assim:
 *   { "versionCode": 2, "versao": "1.1.0", "link": "https://expo.dev/artifacts/eas/....apk" }
 * `versionCode` é comparado com o android.versionCode do APK instalado; `link` é o que abre ao tocar
 * em "Baixar". Como o endereço vem da config, dá para trocá-lo por EAS Update sem APK novo.
 */
export type VersaoNativa = { versionCode: number; versao?: string; link: string };

const TEMPO_LIMITE = 8000;

function urlConfigurada(): string | null {
  const extra = Constants.expoConfig?.extra as { versaoNativa?: { url?: string } } | undefined;
  const url = extra?.versaoNativa?.url;
  if (!url || !url.startsWith('https://') || url.includes('PREENCHER')) return null;
  return url;
}

function valida(dado: unknown): VersaoNativa | null {
  if (!dado || typeof dado !== 'object') return null;
  const { versionCode, versao, link } = dado as Record<string, unknown>;
  if (typeof versionCode !== 'number' || !Number.isInteger(versionCode)) return null;
  if (typeof link !== 'string' || !link.startsWith('https://')) return null;
  return { versionCode, link, versao: typeof versao === 'string' ? versao : undefined };
}

/** Devolve a versão nova se houver uma; `null` se já está em dia, sem endereço configurado ou sem rede. */
export async function buscarVersaoNova(): Promise<VersaoNativa | null> {
  // Só faz sentido no APK instalado (Android, fora do modo de desenvolvimento).
  if (Platform.OS !== 'android' || __DEV__) return null;
  const url = urlConfigurada();
  const instalada = Number(Application.nativeBuildVersion);
  if (!url || !Number.isFinite(instalada)) return null;

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE);
  try {
    const resposta = await fetch(url, { signal: controle.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!resposta.ok) return null;
    const remota = valida(await resposta.json());
    return remota && remota.versionCode > instalada ? remota : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
