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
