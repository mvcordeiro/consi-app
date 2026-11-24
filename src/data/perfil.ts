/**
 * Foto de perfil (o círculo no canto do topo das abas): fica só no aparelho, copiada para a
 * pasta de anexos do app. Tocar no círculo abre a folha para tirar uma selfie ou escolher da galeria.
 */
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { guardarArquivo } from './arquivos';
import { gravarEstado, lerEstado } from './banco';

const CHAVE = 'consi:perfil:foto';

let atual: string | null | undefined;
const ouvintes = new Set<(f: string | null) => void>();

async function ler(): Promise<string | null> {
  if (atual !== undefined) return atual;
  try {
    atual = (await lerEstado(CHAVE)) || null;
  } catch {
    atual = null;
  }
  return atual;
}

async function gravar(uri: string | null) {
  atual = uri;
  ouvintes.forEach((f) => f(uri));
  await gravarEstado(CHAVE, uri ?? '').catch(() => {});
}

export function useFotoPerfil(): string | null {
  const [foto, setFoto] = useState<string | null>(atual ?? null);
  useEffect(() => {
    let vivo = true;
    ler().then((f) => vivo && setFoto(f));
    ouvintes.add(setFoto);
    return () => {
      vivo = false;
      ouvintes.delete(setFoto);
    };
  }, []);
  return foto;
}

/** Selfie (câmera da frente) ou foto da galeria, recortada em quadrado. true se mudou. */
export async function trocarFotoPerfil(deOnde: 'selfie' | 'galeria'): Promise<boolean> {
  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  };
  let r: ImagePicker.ImagePickerResult;
  try {
    if (deOnde === 'selfie') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return false;
      r = await ImagePicker.launchCameraAsync({ ...opcoes, cameraType: ImagePicker.CameraType.front });
    } else {
      r = await ImagePicker.launchImageLibraryAsync(opcoes);
    }
  } catch {
    return false;
  }
  if (r.canceled || !r.assets[0]) return false;
  await gravar(await guardarArquivo(r.assets[0].uri));
  return true;
}

export const removerFotoPerfil = () => gravar(null);

// ─── @handle (issue #3) ─────────────────────────────────────────────────────
// Reservado no Supabase (data/nuvem/perfis.ts); aqui fica a cópia local para mostrar offline.
const CHAVE_HANDLE = 'consi:perfil:handle';
let handleAtual: string | null | undefined;
const ouvintesHandle = new Set<(h: string | null) => void>();

async function lerHandle(): Promise<string | null> {
  if (handleAtual !== undefined) return handleAtual;
  try {
    handleAtual = (await lerEstado(CHAVE_HANDLE)) || null;
  } catch {
    handleAtual = null;
  }
  return handleAtual;
}

/** Grava a cópia local (chamar depois de reservar no servidor). */
export async function gravarHandleLocal(h: string | null) {
  handleAtual = h;
  ouvintesHandle.forEach((f) => f(h));
  await gravarEstado(CHAVE_HANDLE, h ?? '').catch(() => {});
}

export function useHandle(): string | null {
  const [h, setH] = useState<string | null>(handleAtual ?? null);
  useEffect(() => {
    let vivo = true;
    lerHandle().then((x) => vivo && setH(x));
    ouvintesHandle.add(setH);
    return () => {
      vivo = false;
      ouvintesHandle.delete(setH);
    };
  }, []);
  return h;
}

/** Autor "Você" gravado nas atividades e comentários da pessoa (data/hobbiesEstado.tsx). */
export const ehEu = (a: { usuario: string; iniciais: string }) => a.usuario === 'Você' && a.iniciais === 'EU';

/**
 * Troca o autor "Você" pelo @handle e a foto da pessoa em toda superfície social. Sem handle,
 * fica o nome do onboarding (ou "Você").
 */
export function useAutorExibido(nome?: string) {
  const handle = useHandle();
  const foto = useFotoPerfil();
  return <A extends { usuario: string; iniciais: string; foto?: unknown }>(a: A): A => {
    if (!ehEu(a)) return a;
    const base = handle ? `@${handle}` : nome || 'Você';
    const iniciais = (handle ?? nome ?? 'EU').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'EU';
    return { ...a, usuario: base, iniciais, foto: foto ? { uri: foto } : a.foto };
  };
}
