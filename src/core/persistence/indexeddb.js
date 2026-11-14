import { STORAGE_KEY, createDefaultConfig, DEFAULT_VERSION } from '../config/defaults.js';
import { normalizeConfig } from '../config/normalize.js';

const DATABASE_NAME = 'ewidencjaProjektowa';
const DATABASE_VERSION = 2;
const CONFIG_STORE_NAME = 'config';
const MONTH_STORE_NAME = 'months';
const LEGACY_STORE_NAME = 'appData';
const CONFIG_RECORD_ID = 'root';
const databasePromises = new WeakMap();
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

function migrateLegacyRecord(transaction, configStore, monthStore) {
  if (!transaction.db.objectStoreNames.contains(LEGACY_STORE_NAME)) return;
  const legacyStore = transaction.objectStore(LEGACY_STORE_NAME);
  const request = legacyStore.get(STORAGE_KEY);
  request.onsuccess = () => {
    if (!request.result) return;
    const migrated = normalizeDb(request.result);
    configStore.put({ id: CONFIG_RECORD_ID, version: migrated.version, config: migrated.config });
    for (const [month, data] of Object.entries(migrated.months)) monthStore.put({ id: month, data });
    legacyStore.delete(STORAGE_KEY);
  };
}

function openDatabase(indexedDB, databaseName) {
  if (!indexedDB) return Promise.resolve(null);
  let databases = databasePromises.get(indexedDB);
  if (!databases) {
    databases = new Map();
    databasePromises.set(indexedDB, databases);
  }
  if (!databases.has(databaseName)) {
    const promise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, DATABASE_VERSION);
      request.onupgradeneeded = (event) => {
        const database = request.result;
        const transaction = request.transaction;
        const configStore = database.objectStoreNames.contains(CONFIG_STORE_NAME)
          ? transaction.objectStore(CONFIG_STORE_NAME)
          : database.createObjectStore(CONFIG_STORE_NAME, { keyPath: 'id' });
        const monthStore = database.objectStoreNames.contains(MONTH_STORE_NAME)
          ? transaction.objectStore(MONTH_STORE_NAME)
          : database.createObjectStore(MONTH_STORE_NAME, { keyPath: 'id' });
        if (event.oldVersion < DATABASE_VERSION) migrateLegacyRecord(transaction, configStore, monthStore);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Nie udało się otworzyć bazy danych'));
      request.onblocked = () => reject(new Error('Otwarcie bazy danych zostało zablokowane'));
    }).catch((error) => {
      databases.delete(databaseName);
      throw error;
    });
    databases.set(databaseName, promise);
  }
  return databases.get(databaseName);
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Operacja na bazie danych nie powiodła się'));
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
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

export async function loadDb({ indexedDB = globalThis.indexedDB, storage = globalThis.localStorage, databaseName = DATABASE_NAME } = {}) {
  try {
    const database = await openDatabase(indexedDB, databaseName);
    if (database) {
      const transaction = database.transaction([CONFIG_STORE_NAME, MONTH_STORE_NAME], 'readonly');
      const complete = transactionResult(transaction);
      const configRequest = requestResult(transaction.objectStore(CONFIG_STORE_NAME).get(CONFIG_RECORD_ID));
      const monthsRequest = requestResult(transaction.objectStore(MONTH_STORE_NAME).getAll());
      const [storedConfig, storedMonths] = await Promise.all([configRequest, monthsRequest, complete]);
      if (storedConfig) {
        return normalizeDb({
          version: storedConfig.version,
          config: storedConfig.config,
          months: Object.fromEntries(storedMonths.map(({ id, data }) => [id, data]))
        });
      }

      const legacy = readLegacyDb(storage);
      if (!legacy) return createDefaultDb();
      const migrated = normalizeDb(legacy);
      await persistDb(migrated, database);
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

async function persistDb(snapshot, database) {
  const transaction = database.transaction([CONFIG_STORE_NAME, MONTH_STORE_NAME], 'readwrite');
  const complete = transactionResult(transaction);
  transaction.objectStore(CONFIG_STORE_NAME).put({
    id: CONFIG_RECORD_ID,
    version: snapshot.version || DEFAULT_VERSION,
    config: snapshot.config
  });
  const monthStore = transaction.objectStore(MONTH_STORE_NAME);
  monthStore.clear();
  for (const [month, data] of Object.entries(snapshot.months || {})) monthStore.put({ id: month, data });
  await complete;
}

export function saveDb(db, { indexedDB = globalThis.indexedDB, storage = globalThis.localStorage, databaseName = DATABASE_NAME } = {}) {
  const snapshot = JSON.parse(JSON.stringify(db));
  const write = writeQueue.then(async () => {
    const database = await openDatabase(indexedDB, databaseName);
    if (database) {
      await persistDb(snapshot, database);
      return;
    }

    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return;
    }
    throw new Error('Brak dostępnej pamięci przeglądarki');
  });
  writeQueue = write.catch(() => {});
  return write;
}