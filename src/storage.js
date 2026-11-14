import { STORAGE_KEY, createDefaultConfig, DEFAULT_VERSION } from './config/defaults.js';
import { normalizeConfig } from './config/normalize.js';

const DATABASE_NAME = 'ewidencjaProjektowa';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'appData';
let databasePromise;
let writeQueue = Promise.resolve();

function createDefaultDb() {
  return { version: DEFAULT_VERSION, config: createDefaultConfig(), months: {} };
}

function normalizeDb(raw) {
  if (!raw) return createDefaultDb();
  const migrated = {
    version: DEFAULT_VERSION,
    config: normalizeConfig(raw.config || raw),
    months: raw.months && typeof raw.months === 'object' ? raw.months : {}
  };
  if (!migrated.config.labels) migrated.config.labels = createDefaultConfig().labels;
  migrated.config.version = DEFAULT_VERSION;
  if (!migrated.config.global) migrated.config.global = createDefaultConfig().global;
  if (!migrated.config.profiles || !migrated.config.profiles.length) migrated.config.profiles = [createDefaultConfig().profiles[0]];
  if (!migrated.config.projects || !migrated.config.projects.length) migrated.config.projects = [createDefaultConfig().projects[0]];
  return migrated;
}

function openDatabase(indexedDB) {
  if (!indexedDB) return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          request.result.createObjectStore(OBJECT_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Nie udało się otworzyć bazy danych'));
      request.onblocked = () => reject(new Error('Otwarcie bazy danych zostało zablokowane'));
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

function runTransaction(database, mode, action) {
  return new Promise((resolve, reject) => {
    let result;
    const transaction = database.transaction(OBJECT_STORE_NAME, mode);
    const request = action(transaction.objectStore(OBJECT_STORE_NAME));
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error('Operacja na bazie danych nie powiodła się'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Transakcja bazy danych nie powiodła się'));
    transaction.onabort = () => reject(transaction.error || new Error('Transakcja bazy danych została przerwana'));
  });
}

function readLegacyDb(storage) {
  try {
    const stored = storage && storage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function loadDb({ indexedDB = globalThis.indexedDB, storage = globalThis.localStorage } = {}) {
  try {
    const database = await openDatabase(indexedDB);
    if (database) {
      const stored = await runTransaction(database, 'readonly', (store) => store.get(STORAGE_KEY));
      if (stored) return normalizeDb(stored);

      const legacy = readLegacyDb(storage);
      if (!legacy) return createDefaultDb();
      const migrated = normalizeDb(legacy);
      await runTransaction(database, 'readwrite', (store) => store.put(migrated, STORAGE_KEY));
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Keep the migrated copy in IndexedDB if localStorage is unavailable.
      }
      return migrated;
    }
  } catch {
    // Continue with the legacy store if IndexedDB is unavailable or inaccessible.
  }

  return normalizeDb(readLegacyDb(storage));
}

async function persistDb(snapshot, indexedDB, storage) {
  const database = await openDatabase(indexedDB);
  if (database) {
    await runTransaction(database, 'readwrite', (store) => store.put(snapshot, STORAGE_KEY));
    return;
  }

  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return;
  }
  throw new Error('Brak dostępnej pamięci przeglądarki');
}

export function saveDb(db, { indexedDB = globalThis.indexedDB, storage = globalThis.localStorage } = {}) {
  const snapshot = JSON.parse(JSON.stringify(db));
  const write = writeQueue.then(() => persistDb(snapshot, indexedDB, storage));
  writeQueue = write.catch(() => {});
  return write;
}
