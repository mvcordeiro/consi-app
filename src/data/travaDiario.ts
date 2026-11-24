/**
 * Trava do Diário (issue #12): PIN de 4 a 6 dígitos e, opcional, biometria. Fica no aparelho:
 * o PIN só existe como hash com sal no SecureStore (Keystore/Keychain), nunca em texto.
 *
 * - Tranca ao abrir o app e quando ele volta do segundo plano depois de TRANCAR_DEPOIS_MS.
 * - Escrever um momento novo não pede o PIN (não mostra nada antigo); ler, editar e buscar pedem.
 * - Esqueceu o PIN: o bloqueio do próprio celular (digital, rosto, PIN ou padrão) destrava e a
 *   pessoa cria um PIN novo. Nada é apagado.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

type LocalAuth = typeof import('expo-local-authentication');
// APKs antigos não têm o módulo nativo: sem ele, só o PIN funciona.
let auth: LocalAuth | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  auth = require('expo-local-authentication') as LocalAuth;
} catch {
  auth = null;
}

const CHAVE = 'consi.diario.trava';
export const TRANCAR_DEPOIS_MS = 60 * 1000;
export const PIN_MIN = 4;
export const PIN_MAX = 6;

type Config = { hash: string; sal: string; biometria: boolean; tamanho: number };

let config: Config | null | undefined;
let destravado = false;
let saiuEm = 0;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

const web = Platform.OS === 'web';

async function ler(): Promise<Config | null> {
  if (config !== undefined) return config;
  try {
    const bruto = web ? null : await SecureStore.getItemAsync(CHAVE);
    config = bruto ? (JSON.parse(bruto) as Config) : null;
  } catch {
    config = null;
  }
  return config;
}

async function gravar(c: Config | null) {
  config = c;
  if (!web) {
    if (c) await SecureStore.setItemAsync(CHAVE, JSON.stringify(c));
    else await SecureStore.deleteItemAsync(CHAVE);
  }
  avisar();
}

const hashDe = (pin: string, sal: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${pin}`);

/** O PIN tem de 4 a 6 dígitos. */
export const pinValido = (pin: string) => new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin);

/** Liga a trava (ou troca o PIN), mantendo a escolha da biometria. */
export async function definirPin(pin: string, biometria?: boolean) {
  if (!pinValido(pin)) throw new Error('PIN inválido');
  const bytes = await Crypto.getRandomBytesAsync(16);
  const sal = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const atual = await ler();
  await gravar({ hash: await hashDe(pin, sal), sal, biometria: biometria ?? atual?.biometria ?? false, tamanho: pin.length });
  destravado = true;
  avisar();
}

export async function desligarTrava() {
  await gravar(null);
}

export async function definirBiometria(ligada: boolean) {
  const c = await ler();
  if (c) await gravar({ ...c, biometria: ligada });
}

/** Confere o PIN; certo, destrava até o próximo bloqueio. */
export async function conferirPin(pin: string): Promise<boolean> {
  const c = await ler();
  if (!c) return true;
  const ok = (await hashDe(pin, c.sal)) === c.hash;
  if (ok) {
    destravado = true;
    avisar();
  }
  return ok;
}

/** O aparelho tem digital/rosto cadastrados. */
export async function temBiometria(): Promise<boolean> {
  if (!auth) return false;
  try {
    return (await auth.hasHardwareAsync()) && (await auth.isEnrolledAsync());
  } catch {
    return false;
  }
}

/**
 * Pede a biometria (só ela) ou, com `doCelular`, o bloqueio do celular (o "Esqueci o PIN").
 * Certo, destrava.
 */
export async function destravarComAparelho(doCelular = false): Promise<boolean> {
  if (!auth) return false;
  try {
    const r = await auth.authenticateAsync({
      promptMessage: doCelular ? 'Confirme que é você' : 'Abrir o Diário',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: !doCelular,
    });
    if (r.success) {
      destravado = true;
      avisar();
    }
    return r.success;
  } catch {
    return false;
  }
}

/** Tranca de novo (ex.: o app foi para o segundo plano por tempo demais). */
export function trancar() {
  if (!destravado) return;
  destravado = false;
  avisar();
}

AppState.addEventListener('change', (s) => {
  if (s === 'background' || s === 'inactive') {
    if (!saiuEm) saiuEm = Date.now();
  } else if (s === 'active') {
    if (saiuEm && Date.now() - saiuEm >= TRANCAR_DEPOIS_MS) trancar();
    saiuEm = 0;
  }
});

export type EstadoTrava = { carregado: boolean; ligada: boolean; biometria: boolean; trancado: boolean; tamanho: number };

/** Estado atual da trava, atualizado quando muda. */
export function useTravaDiario(): EstadoTrava {
  const ler_ = (): EstadoTrava => ({
    carregado: config !== undefined,
    ligada: !!config,
    biometria: !!config?.biometria,
    trancado: !!config && !destravado,
    tamanho: config?.tamanho ?? PIN_MIN,
  });
  const [e, setE] = useState(ler_);
  useEffect(() => {
    const f = () => setE(ler_());
    ouvintes.add(f);
    ler().then(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  return e;
}
