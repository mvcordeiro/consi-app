/**
 * Banco de dados local do Consi (SQLite criptografado com SQLCipher).
 *
 * Nada sai do aparelho. A chave do banco é gerada uma vez e fica no expo-secure-store
 * (Android Keystore / iOS Keychain). Tabelas:
 *   - momentos + anexos: Diário e check-ins (ver momentos.ts)
 *   - resistencias: "Dessa vez não abro" (ver pausa.ts)
 *   - estado: documentos JSON pequenos por chave (grupos, hobbies, onboarding,
 *     preferências, rascunho), com os mesmos nomes de chave do antigo AsyncStorage.
 *
 * Na primeira abertura, os dados do AsyncStorage são copiados para cá e as chaves antigas apagadas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { apagarAnexos, guardarArquivo } from './arquivos';

const NOME = 'consi.db';
const CHAVE_SEGURA = 'consi.banco.chave';
const nativo = Platform.OS !== 'web';

/** Chaves do AsyncStorage que viram tabelas próprias (as outras vão para `estado`). */
export const CHAVE_MOMENTOS = 'consi:emocao-do-dia';
export const CHAVE_RESISTENCIAS = 'consi:pausa:nao-abri';
const MIGROU = 'consi:banco:migrou-asyncstorage';

let aberto: Promise<SQLite.SQLiteDatabase> | null = null;

/** O banco aberto, migrado e com os dados antigos importados. */
export function banco() {
  aberto ??= abrir().catch((e) => {
    aberto = null;
    throw e;
  });
  return aberto;
}

async function chaveDoBanco() {
  let chave = await SecureStore.getItemAsync(CHAVE_SEGURA);
  if (!chave) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    chave = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(CHAVE_SEGURA, chave, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }
  return chave;
}

async function conectar() {
  const db = await SQLite.openDatabaseAsync(NOME);
  if (nativo) {
    // Chave bruta de 256 bits em hexadecimal (sem derivação por senha).
    await db.execAsync(`PRAGMA key = "x'${await chaveDoBanco()}'"`);
    const cifra = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cifra && !__DEV__) console.warn('[banco] SQLCipher ausente: o banco não está criptografado.');
  }
  await db.execAsync('PRAGMA journal_mode = WAL');
  // Lê algo de verdade: com a chave errada, o SQLCipher só reclama aqui.
  await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
  return db;
}

async function abrir() {
  let db: SQLite.SQLiteDatabase;
  try {
    db = await conectar();
  } catch (e) {
    // Banco ilegível (chave perdida: ex. backup restaurado sem o Keystore). Sem a chave os
    // dados não podem ser recuperados; começa um banco novo para o app não ficar travado.
    console.warn('[banco] não abriu, recriando', e);
    await SQLite.deleteDatabaseAsync(NOME).catch(() => {});
    db = await conectar();
  }
  await migrar(db);
  await importarAsyncStorage(db);
  return db;
}

// ─── Esquema ────────────────────────────────────────────────────────────────
const MIGRACOES: string[] = [
  // 1
  `CREATE TABLE momentos (
     em INTEGER PRIMARY KEY NOT NULL,
     emocao TEXT NOT NULL,
     texto TEXT,
     destaques TEXT,
     marcadores TEXT,
     origem TEXT,
     editado_em INTEGER
   );
   CREATE TABLE anexos (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     momento_em INTEGER NOT NULL,
     ordem INTEGER NOT NULL,
     tipo TEXT NOT NULL,
     uri TEXT NOT NULL,
     duracao REAL
   );
   CREATE INDEX anexos_momento ON anexos (momento_em);
   CREATE TABLE resistencias (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     em INTEGER NOT NULL,
     grupo TEXT NOT NULL,
     app TEXT
   );
   CREATE TABLE estado (
     chave TEXT PRIMARY KEY NOT NULL,
     valor TEXT NOT NULL
   );`,
  // 2: a pergunta da Página de hoje que o momento respondeu
  `ALTER TABLE momentos ADD COLUMN pergunta TEXT;`,
  // 3: "Dessa vez não abro" depois de já ter usado o app (tempo liberado acabou ou Cuidar tempo)
  `ALTER TABLE resistencias ADD COLUMN depois_de_usar INTEGER NOT NULL DEFAULT 0;`,
  // 4: o que veio depois da escolha na pausa: um check-in (o momento) ou um hobby explorado
  `ALTER TABLE resistencias ADD COLUMN checkin_em INTEGER;
   ALTER TABLE resistencias ADD COLUMN hobby TEXT;`,
  // 5: como cada pausa terminou (para as Reflexões da Home); guardado por 30 dias
  `CREATE TABLE pausas (
     em INTEGER PRIMARY KEY NOT NULL,
     grupo TEXT NOT NULL,
     app TEXT,
     desfecho TEXT NOT NULL,
     checkin_em INTEGER,
     minutos INTEGER
   );`,
];

async function migrar(db: SQLite.SQLiteDatabase) {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = r?.user_version ?? 0;
  while (versao < MIGRACOES.length) {
    const sql = MIGRACOES[versao];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${versao + 1}`);
    });
    versao += 1;
  }
}

// ─── Estado por chave ───────────────────────────────────────────────────────
export async function lerEstado(chave: string): Promise<string | null> {
  const db = await banco();
  const r = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM estado WHERE chave = ?', chave);
  return r?.valor ?? null;
}

export async function gravarEstado(chave: string, valor: string) {
  const db = await banco();
  await db.runAsync('INSERT OR REPLACE INTO estado (chave, valor) VALUES (?, ?)', chave, valor);
}

export async function apagarEstado(...chaves: string[]) {
  const db = await banco();
  for (const c of chaves) await db.runAsync('DELETE FROM estado WHERE chave = ?', c);
}

// ─── Momentos (linhas) ──────────────────────────────────────────────────────
export type AnexoGravado = { tipo: 'audio'; uri: string; duracao: number } | { tipo: 'foto'; uri: string };
export type MomentoGravado = {
  id: string;
  em: number;
  texto?: string;
  destaques?: { inicio: number; fim: number }[];
  marcadores?: string[];
  anexos?: AnexoGravado[];
  origem?: 'home' | 'pausa' | 'diario' | 'hobby' | 'widget';
  editadoEm?: number;
  /** A pergunta ("prompt") da Página de hoje que a pessoa respondeu. */
  pergunta?: string;
};

type LinhaMomento = {
  em: number;
  emocao: string;
  texto: string | null;
  destaques: string | null;
  marcadores: string | null;
  origem: string | null;
  editado_em: number | null;
  pergunta: string | null;
};
type LinhaAnexo = { momento_em: number; tipo: string; uri: string; duracao: number | null };

const json = <T>(s: string | null): T | undefined => (s ? (JSON.parse(s) as T) : undefined);

export async function lerMomentos(): Promise<MomentoGravado[]> {
  const db = await banco();
  const linhas = await db.getAllAsync<LinhaMomento>('SELECT * FROM momentos ORDER BY em DESC');
  const anexos = await db.getAllAsync<LinhaAnexo>('SELECT momento_em, tipo, uri, duracao FROM anexos ORDER BY momento_em, ordem');
  const porMomento = new Map<number, AnexoGravado[]>();
  for (const a of anexos) {
    const l = porMomento.get(a.momento_em) ?? [];
    l.push(a.tipo === 'audio' ? { tipo: 'audio', uri: a.uri, duracao: a.duracao ?? 0 } : { tipo: 'foto', uri: a.uri });
    porMomento.set(a.momento_em, l);
  }
  return linhas.map((l) => {
    const m: MomentoGravado = { id: l.emocao, em: l.em };
    if (l.texto != null) m.texto = l.texto;
    const d = json<MomentoGravado['destaques']>(l.destaques);
    if (d) m.destaques = d;
    const mk = json<string[]>(l.marcadores);
    if (mk) m.marcadores = mk;
    const an = porMomento.get(l.em);
    if (an) m.anexos = an;
    if (l.origem) m.origem = l.origem as MomentoGravado['origem'];
    if (l.editado_em != null) m.editadoEm = l.editado_em;
    if (l.pergunta) m.pergunta = l.pergunta;
    return m;
  });
}

async function inserirMomento(db: SQLite.SQLiteDatabase, m: MomentoGravado) {
  await db.runAsync(
    'INSERT OR REPLACE INTO momentos (em, emocao, texto, destaques, marcadores, origem, editado_em, pergunta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    m.em,
    m.id,
    m.texto ?? null,
    m.destaques ? JSON.stringify(m.destaques) : null,
    m.marcadores ? JSON.stringify(m.marcadores) : null,
    m.origem ?? null,
    m.editadoEm ?? null,
    m.pergunta ?? null,
  );
  await db.runAsync('DELETE FROM anexos WHERE momento_em = ?', m.em);
  for (const [i, a] of (m.anexos ?? []).entries()) {
    await db.runAsync(
      'INSERT INTO anexos (momento_em, ordem, tipo, uri, duracao) VALUES (?, ?, ?, ?, ?)',
      m.em,
      i,
      a.tipo,
      a.uri,
      a.tipo === 'audio' ? a.duracao : null,
    );
  }
}

async function removerMomento(db: SQLite.SQLiteDatabase, em: number) {
  await db.runAsync('DELETE FROM anexos WHERE momento_em = ?', em);
  await db.runAsync('DELETE FROM momentos WHERE em = ?', em);
}

/** Grava as diferenças entre duas listas (por instante e por identidade do objeto). */
export async function sincronizarMomentos(antes: MomentoGravado[], depois: MomentoGravado[]) {
  const db = await banco();
  const velhos = new Map(antes.map((m) => [m.em, m]));
  const novos = new Set(depois.map((m) => m.em));
  await db.withTransactionAsync(async () => {
    for (const m of antes) if (!novos.has(m.em)) await removerMomento(db, m.em);
    for (const m of depois) if (velhos.get(m.em) !== m) await inserirMomento(db, m);
  });
}

// ─── Resistências ───────────────────────────────────────────────────────────
export type ResistenciaGravada = {
  em: number;
  grupo: string;
  app?: string;
  depoisDeUsar?: boolean;
  /** O check-in (momento) feito logo depois, na própria pausa. */
  checkinEm?: number;
  /** O hobby explorado no lugar do app. */
  hobby?: string;
};

export async function inserirResistencia(r: ResistenciaGravada) {
  const db = await banco();
  await db.runAsync(
    'INSERT INTO resistencias (em, grupo, app, depois_de_usar, checkin_em, hobby) VALUES (?, ?, ?, ?, ?, ?)',
    r.em,
    r.grupo,
    r.app ?? null,
    r.depoisDeUsar ? 1 : 0,
    r.checkinEm ?? null,
    r.hobby ?? null,
  );
}

/** Liga a escolha feita em `em` ao que veio depois (o check-in ou o hobby). */
export async function completarResistencia(em: number, d: { checkinEm?: number; hobby?: string }) {
  const db = await banco();
  if (d.checkinEm !== undefined) await db.runAsync('UPDATE resistencias SET checkin_em = ? WHERE em = ?', d.checkinEm, em);
  if (d.hobby !== undefined) await db.runAsync('UPDATE resistencias SET hobby = ? WHERE em = ?', d.hobby, em);
}

/** As escolhas de não abrir desde `desde` (ms), da mais recente para a mais antiga. */
export async function listarResistencias(desde: number): Promise<ResistenciaGravada[]> {
  const db = await banco();
  const linhas = await db.getAllAsync<{
    em: number;
    grupo: string;
    app: string | null;
    depois_de_usar: number;
    checkin_em: number | null;
    hobby: string | null;
  }>(
    'SELECT em, grupo, app, depois_de_usar, checkin_em, hobby FROM resistencias WHERE em >= ? ORDER BY em DESC',
    desde,
  );
  return linhas.map((l) => ({
    em: l.em,
    grupo: l.grupo,
    app: l.app ?? undefined,
    depoisDeUsar: l.depois_de_usar === 1,
    checkinEm: l.checkin_em ?? undefined,
    hobby: l.hobby ?? undefined,
  }));
}

// ─── Pausas (desfechos) ─────────────────────────────────────────────────────
/** Como a pausa terminou: abriu o app, não abriu, trocou por um hobby ou foi escrever no Diário. */
export type DesfechoPausa = 'abriu' | 'naoAbriu' | 'hobby' | 'diario';

export type PausaGravada = {
  em: number;
  grupo: string;
  app?: string;
  desfecho: DesfechoPausa;
  /** O check-in feito na própria pausa, antes da escolha. */
  checkinEm?: number;
  /** Minutos liberados, quando abriu o app. */
  minutos?: number;
};

/** Grava o desfecho e apaga os de mais de `guardarDias` dias. */
export async function inserirPausa(p: PausaGravada, guardarDias: number) {
  const db = await banco();
  await db.runAsync(
    'INSERT OR REPLACE INTO pausas (em, grupo, app, desfecho, checkin_em, minutos) VALUES (?, ?, ?, ?, ?, ?)',
    p.em,
    p.grupo,
    p.app ?? null,
    p.desfecho,
    p.checkinEm ?? null,
    p.minutos ?? null,
  );
  await db.runAsync('DELETE FROM pausas WHERE em < ?', p.em - guardarDias * 24 * 60 * 60 * 1000);
}

/** Os desfechos desde `desde` (ms), do mais recente para o mais antigo. */
export async function listarPausas(desde: number): Promise<PausaGravada[]> {
  const db = await banco();
  const linhas = await db.getAllAsync<{
    em: number;
    grupo: string;
    app: string | null;
    desfecho: DesfechoPausa;
    checkin_em: number | null;
    minutos: number | null;
  }>('SELECT em, grupo, app, desfecho, checkin_em, minutos FROM pausas WHERE em >= ? ORDER BY em DESC', desde);
  return linhas.map((l) => ({
    em: l.em,
    grupo: l.grupo,
    app: l.app ?? undefined,
    desfecho: l.desfecho,
    checkinEm: l.checkin_em ?? undefined,
    minutos: l.minutos ?? undefined,
  }));
}

// ─── Importação única do AsyncStorage ───────────────────────────────────────
async function anexosNaPasta(m: MomentoGravado): Promise<MomentoGravado> {
  if (!m.anexos?.length) return m;
  const anexos = await Promise.all(m.anexos.map(async (a) => ({ ...a, uri: await guardarArquivo(a.uri) })));
  return { ...m, anexos };
}

async function importarAsyncStorage(db: SQLite.SQLiteDatabase) {
  if (await db.getFirstAsync('SELECT 1 FROM estado WHERE chave = ?', MIGROU)) return;
  let pares: readonly (readonly [string, string | null])[] = [];
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('consi:'));
    pares = await AsyncStorage.multiGet(chaves);
  } catch {
    // sem AsyncStorage (web/teste): nada a importar
  }

  // Lê e prepara fora da transação (copiar arquivos é lento).
  let momentos: MomentoGravado[] = [];
  let resistencias: { em: number; grupo: string; app?: string }[] = [];
  const outros: [string, string][] = [];
  for (const [k, v] of pares) {
    if (v == null) continue;
    if (k === CHAVE_MOMENTOS) {
      try {
        const d = JSON.parse(v) as MomentoGravado | MomentoGravado[];
        momentos = Array.isArray(d) ? d : [d];
      } catch {
        outros.push([k, v]); // guarda o texto cru, para não perder nada
      }
    } else if (k === CHAVE_RESISTENCIAS) {
      try {
        resistencias = JSON.parse(v);
      } catch {
        outros.push([k, v]);
      }
    } else {
      outros.push([k, v]);
    }
  }
  momentos = await Promise.all(momentos.filter((m) => m && typeof m.em === 'number').map(anexosNaPasta));

  await db.withTransactionAsync(async () => {
    for (const m of momentos) await inserirMomento(db, m);
    for (const r of resistencias) {
      await db.runAsync('INSERT INTO resistencias (em, grupo, app) VALUES (?, ?, ?)', r.em, r.grupo, r.app ?? null);
    }
    for (const [k, v] of outros) await db.runAsync('INSERT OR REPLACE INTO estado (chave, valor) VALUES (?, ?)', k, v);
    await db.runAsync('INSERT OR REPLACE INTO estado (chave, valor) VALUES (?, ?)', MIGROU, String(Date.now()));
  });

  // Só depois de gravado no banco: apaga as chaves antigas.
  if (pares.length) await AsyncStorage.multiRemove(pares.map(([k]) => k)).catch(() => {});
}

// ─── Exportar e apagar (Ajustes) ────────────────────────────────────────────
/** Tudo o que o app guarda, num objeto só (para "Exportar meus dados"). */
export async function exportarTudo() {
  const db = await banco();
  const estado: Record<string, unknown> = {};
  for (const { chave, valor } of await db.getAllAsync<{ chave: string; valor: string }>('SELECT chave, valor FROM estado')) {
    if (chave === MIGROU) continue;
    try {
      estado[chave] = JSON.parse(valor);
    } catch {
      estado[chave] = valor;
    }
  }
  return {
    app: 'Consi',
    formato: 1,
    exportadoEm: new Date().toISOString(),
    momentos: await lerMomentos(),
    resistencias: await db.getAllAsync('SELECT em, grupo, app, depois_de_usar, checkin_em, hobby FROM resistencias ORDER BY em DESC'),
    estado,
  };
}

/** Apaga o banco, a chave e os anexos. O app precisa recarregar depois. */
export async function apagarTudo() {
  if (aberto) {
    const db = await aberto.catch(() => null);
    aberto = null;
    await db?.closeAsync().catch(() => {});
  }
  await SQLite.deleteDatabaseAsync(NOME).catch(() => {});
  if (nativo) await SecureStore.deleteItemAsync(CHAVE_SEGURA).catch(() => {});
  apagarAnexos();
  await AsyncStorage.clear().catch(() => {});
}
