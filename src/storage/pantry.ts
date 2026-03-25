import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { UserPantryItem } from '../types';
import { normalizeIngredientName } from '../recipes/normalize';

const DB_NAME = 'fridge-ghost';
const DB_VERSION = 1;
const STORE = 'pantry';

interface FGSchema extends DBSchema {
  pantry: {
    key: string;
    value: UserPantryItem;
    indexes: { 'by-expires': string };
  };
}

let dbPromise: Promise<IDBPDatabase<FGSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<FGSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FGSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('by-expires', 'expiresAt');
      },
    });
  }
  return dbPromise;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function listPantry(): Promise<UserPantryItem[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function addPantryItems(names: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  const now = new Date().toISOString();
  for (const raw of names) {
    const nameRaw = raw.trim();
    if (!nameRaw) continue;
    const item: UserPantryItem = {
      id: newId(),
      nameRaw,
      nameNormalized: normalizeIngredientName(nameRaw),
      expiresAt: null,
      createdAt: now,
    };
    await tx.store.add(item);
  }
  await tx.done;
}

export async function updatePantryItem(
  id: string,
  patch: Partial<Pick<UserPantryItem, 'nameRaw' | 'expiresAt' | 'quantity'>>
): Promise<void> {
  const db = await getDb();
  const cur = await db.get(STORE, id);
  if (!cur) return;
  const nameRaw = patch.nameRaw ?? cur.nameRaw;
  const next: UserPantryItem = {
    ...cur,
    ...patch,
    nameRaw,
    nameNormalized: patch.nameRaw != null ? normalizeIngredientName(nameRaw) : cur.nameNormalized,
  };
  await db.put(STORE, next);
}

export async function removePantryItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearPantry(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
