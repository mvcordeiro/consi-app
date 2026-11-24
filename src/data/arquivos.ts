/**
 * Fotos, áudios e vídeos do Diário, dos hobbies e do perfil: ficam na pasta de documentos do
 * app (`anexos/`), não no cache, que o sistema pode limpar a qualquer momento.
 *
 * Criptografia: cada arquivo é cifrado no lugar com AES-256-GCM (expo-crypto), mantendo o mesmo
 * nome, então os endereços já gravados no banco continuam valendo. O arquivo cifrado começa com
 * MAGIA; sem ela, é um arquivo antigo (de antes da criptografia), que `migrarAnexos` cifra na
 * primeira abertura do app. A chave fica no SecureStore (Keystore), separada da do banco.
 *
 * Para mostrar ou tocar, `abrirArquivo` decifra uma cópia temporária na pasta de cache
 * (`abertos/`), que é apagada a cada abertura do app.
 */
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const nativo = Platform.OS !== 'web';
const CHAVE_SEGURA = 'consi.anexos.chave';
/** "CONSIENC1" no começo do arquivo cifrado. */
const MAGIA = new Uint8Array([67, 79, 78, 83, 73, 69, 78, 67, 49]);

export function pastaAnexos() {
  const d = new Directory(Paths.document, 'anexos');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function pastaAbertos() {
  const d = new Directory(Paths.cache, 'abertos');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

const jaGuardado = (uri: string) => uri.startsWith(pastaAnexos().uri);

let chave: Promise<AESEncryptionKey> | null = null;
function chaveDosAnexos() {
  chave ??= (async () => {
    const hex = await SecureStore.getItemAsync(CHAVE_SEGURA);
    if (hex) return AESEncryptionKey.import(hex, 'hex');
    const nova = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(CHAVE_SEGURA, await nova.encoded('hex'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return nova;
  })().catch((e) => {
    chave = null;
    throw e;
  });
  return chave;
}

const cifrado = (b: Uint8Array) => b.length > MAGIA.length && MAGIA.every((x, i) => b[i] === x);

/** Cifra o arquivo no lugar (se ainda não estiver cifrado). */
async function cifrar(f: File) {
  const bytes = await f.bytes();
  if (cifrado(bytes)) return;
  const selado = await aesEncryptAsync(bytes, await chaveDosAnexos());
  const combinado = (await selado.combined()) as Uint8Array;
  const saida = new Uint8Array(MAGIA.length + combinado.length);
  saida.set(MAGIA, 0);
  saida.set(combinado, MAGIA.length);
  f.write(saida);
}

/**
 * Copia o arquivo para a pasta do app, cifrado, e devolve o novo endereço.
 * Se não der (web, arquivo sumiu, já está lá), devolve o endereço original.
 */
export async function guardarArquivo(uri: string): Promise<string> {
  if (!nativo || !uri.startsWith('file:')) return uri;
  try {
    if (jaGuardado(uri)) return uri;
    const origem = new File(uri);
    if (!origem.exists) return uri;
    const ext = origem.name.includes('.') ? origem.name.slice(origem.name.lastIndexOf('.')) : '';
    const destino = new File(pastaAnexos(), `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    await origem.copy(destino);
    await cifrar(destino).catch(() => {});
    return destino.uri;
  } catch {
    return uri;
  }
}

let migracao: Promise<void> | null = null;

/**
 * Na abertura do app: apaga as cópias decifradas da vez anterior e cifra os anexos antigos
 * (gravados antes da criptografia). Seguro de repetir: arquivos já cifrados são pulados.
 */
export function migrarAnexos(): Promise<void> {
  migracao ??= (async () => {
    if (!nativo) return;
    try {
      const abertos = new Directory(Paths.cache, 'abertos');
      if (abertos.exists) abertos.delete();
    } catch {
      // nada a limpar
    }
    try {
      for (const item of pastaAnexos().list()) {
        if (item instanceof File) await cifrar(item).catch(() => {});
      }
    } catch {
      // sem pasta de anexos
    }
  })();
  return migracao;
}

const abertos = new Map<string, Promise<string>>();

/**
 * Endereço que dá para mostrar ou tocar: para um anexo cifrado, uma cópia decifrada no cache;
 * para qualquer outro endereço (web, imagens do catálogo, arquivos de fora), o próprio endereço.
 */
export function abrirArquivo(uri: string): Promise<string> {
  if (!nativo || !uri.startsWith('file:') || !jaGuardado(uri)) return Promise.resolve(uri);
  let p = abertos.get(uri);
  if (!p) {
    p = (async () => {
      await migrarAnexos();
      const f = new File(uri);
      if (!f.exists) return uri;
      const bytes = await f.bytes();
      if (!cifrado(bytes)) return uri;
      const selado = AESSealedData.fromCombined(bytes.subarray(MAGIA.length));
      const claro = (await aesDecryptAsync(selado, await chaveDosAnexos())) as Uint8Array;
      const destino = new File(pastaAbertos(), f.name);
      destino.write(claro);
      return destino.uri;
    })().catch(() => {
      abertos.delete(uri);
      return uri;
    });
    abertos.set(uri, p);
  }
  return p;
}

/** `abrirArquivo` como hook: null enquanto decifra. */
export function useArquivoAberto(uri: string | null | undefined): string | null {
  const [aberto, setAberto] = useState<{ de: string; uri: string } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let vivo = true;
    abrirArquivo(uri).then((u) => vivo && setAberto({ de: uri, uri: u }));
    return () => {
      vivo = false;
    };
  }, [uri]);
  return uri && aberto?.de === uri ? aberto.uri : null;
}

/** Apaga a pasta de anexos inteira ("Apagar tudo"). */
export function apagarAnexos() {
  if (!nativo) return;
  abertos.clear();
  for (const [pai, nome] of [
    [Paths.document, 'anexos'],
    [Paths.cache, 'abertos'],
  ] as const) {
    try {
      const d = new Directory(pai, nome);
      if (d.exists) d.delete();
    } catch {
      // nada a apagar
    }
  }
}
