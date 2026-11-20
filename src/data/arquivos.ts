/**
 * Áudios e fotos do Diário e dos hobbies: ficam na pasta de documentos do app
 * (`anexos/`), não no cache, que o sistema pode limpar a qualquer momento.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const nativo = Platform.OS !== 'web';

export function pastaAnexos() {
  const d = new Directory(Paths.document, 'anexos');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

const jaGuardado = (uri: string) => uri.startsWith(pastaAnexos().uri);

/**
 * Copia o arquivo para a pasta do app e devolve o novo endereço.
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
    return destino.uri;
  } catch {
    return uri;
  }
}

/** Apaga a pasta de anexos inteira ("Apagar tudo"). */
export function apagarAnexos() {
  if (!nativo) return;
  try {
    const d = new Directory(Paths.document, 'anexos');
    if (d.exists) d.delete();
  } catch {
    // nada a apagar
  }
}
