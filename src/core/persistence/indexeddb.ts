import { compareVersions, validateStrict } from 'compare-versions';
import { STORAGE_KEY, createDefaultConfig, DEFAULT_VERSION } from '../config/defaults.js';
import { normalizeConfig } from '../config/normalize.js';
import type { AppDatabase } from '../models.js';

interface PersistenceOptions {
  indexedDB?: IDBFactory;
  storage?: Storage;
  databaseName?: string;
}

interface SchemaVersionRecord {
  key: string;
  value: string;
}

interface ConfigRecord {
  id: string;
  version: number;
  config: unknown;
}

interface MonthRecord {
  id: string;
  data: unknown;
}

interface SchemaMigration {
  version: string;
  up: (database: IDBDatabase) => void | Promise<void>;
}

interface StoreSnapshot {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: Array<{ name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }>;
  records?: Array<{ key: IDBValidKey; value: unknown }>;
}

const DATABASE_NAME = 'ewidencjaProjektowa';
const DATABASE_VERSION = 3;
const CONFIG_STORE_NAME = 'config';
const MONTH_STORE_NAME = 'months';
const METADATA_STORE_NAME = 'metadata';
const LEGACY_STORE_NAME = 'appData';
const CONFIG_RECORD_ID = 'root';
const SCHEMA_VERSION_KEY = 'schemaVersion';
export const CURRENT_SCHEMA_VERSION = '1.0.0';
const SCHEMA_MIGRATIONS: SchemaMigration[] = [];
const databasePromises = new WeakMap<IDBFactory, Map<string, Promise<IDBDatabase>>>();
let writeQueue: Promise<void> = Promise.resolve();

function createDefaultDb(): AppDatabase {
  return { version: DEFAULT_VERSION, config: createDefaultConfig(), months: {} };
}

function normalizeDb(raw: any): AppDatabase {
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

function migrateLegacyRecord(transaction: IDBTransaction, configStore: IDBObjectStore, monthStore: IDBObjectStore): void {
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

function openDatabase(indexedDB: IDBFactory | undefined, databaseName: string): Promise<IDBDatabase | null> {
  if (!indexedDB) return Promise.resolve(null);
  let databases = databasePromises.get(indexedDB);
  if (!databases) {
    databases = new Map();
    databasePromises.set(indexedDB, databases);
  }
  if (!databases.has(databaseName)) {
    const promise = openAndMigrateDatabase(indexedDB, databaseName).catch((error) => {
      databases.delete(databaseName);
      throw error;
    });
    databases.set(databaseName, promise);
  }
  return databases.get(databaseName) ?? Promise.resolve(null);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Operacja na bazie danych nie powiodła się'));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Transakcja bazy danych nie powiodła się'));
    transaction.onabort = () => reject(transaction.error || new Error('Transakcja bazy danych została przerwana'));
  });
}

function readSchemaVersion(database: IDBDatabase): Promise<string | null> {
  if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) return Promise.resolve(null);
  const transaction = database.transaction(METADATA_STORE_NAME, 'readonly');
  const complete = transactionResult(transaction);
  const result = requestResult<SchemaVersionRecord | undefined>(transaction.objectStore(METADATA_STORE_NAME).get(SCHEMA_VERSION_KEY));
  return Promise.all([result, complete]).then(([record]) => record?.value || null);
}

async function writeSchemaVersion(database: IDBDatabase, version: string): Promise<void> {
  const transaction = database.transaction(METADATA_STORE_NAME, 'readwrite');
  const complete = transactionResult(transaction);
  transaction.objectStore(METADATA_STORE_NAME).put({ key: SCHEMA_VERSION_KEY, value: version });
  await complete;
}

function pendingMigrations(fromVersion: string, toVersion: string, migrations: SchemaMigration[]): SchemaMigration[] {
  if (!validateStrict(fromVersion) || !validateStrict(toVersion)) {
    throw new Error('Nieprawidłowa wersja schematu IndexedDB');
  }
  if (compareVersions(fromVersion, toVersion) > 0) {
    throw new Error(`Nie można obniżyć wersji schematu z ${fromVersion} do ${toVersion}`);
  }

  return migrations
    .map((migration) => {
      if (!validateStrict(migration.version) || typeof migration.up !== 'function') {
        throw new Error('Nieprawidłowa definicja migracji schematu');
      }
      return migration;
    })
    .filter((migration) => compareVersions(migration.version, fromVersion) > 0 && compareVersions(migration.version, toVersion) <= 0)
    .sort((left, right) => compareVersions(left.version, right.version));
}

export async function runSchemaMigrations(database: IDBDatabase, {
  fromVersion = CURRENT_SCHEMA_VERSION,
  toVersion = CURRENT_SCHEMA_VERSION,
  migrations = SCHEMA_MIGRATIONS
}: { fromVersion?: string; toVersion?: string; migrations?: SchemaMigration[] } = {}): Promise<void> {
  const pending = pendingMigrations(fromVersion, toVersion, migrations);
  for (const migration of pending) {
    await migration.up(database);
    await writeSchemaVersion(database, migration.version);
  }
  await writeSchemaVersion(database, toVersion);
}

async function snapshotDatabase(database: IDBDatabase): Promise<StoreSnapshot[]> {
  const storeNames = [...database.objectStoreNames];
  if (!storeNames.length) return [];
  const transaction = database.transaction(storeNames, 'readonly');
  const complete = transactionResult(transaction);
  const stores = storeNames.map((name) => {
    const store = transaction.objectStore(name);
    return {
      name,
      keyPath: store.keyPath,
      autoIncrement: store.autoIncrement,
      indexes: [...store.indexNames].map((indexName) => {
        const index = store.index(indexName);
        return { name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
      })
    };
  });

  const records = await Promise.all(stores.map(async (definition) => {
    const store = transaction.objectStore(definition.name);
    const [keys, values] = await Promise.all([
      requestResult(store.getAllKeys()),
      requestResult(store.getAll())
    ]);
    return { ...definition, records: values.map((value, index) => ({ key: keys[index], value })) };
  }));
  await complete;
  return records;
}

function createDatabaseBackup(indexedDB: IDBFactory, databaseName: string, version: string, snapshot: StoreSnapshot[]): Promise<string> {
  const backupName = `${databaseName}_backup_${version}`;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(backupName, 1);
    let created = false;
    request.onupgradeneeded = (event) => {
      if (event.oldVersion !== 0) return;
      created = true;
      for (const definition of snapshot) {
        const options: IDBObjectStoreParameters = { autoIncrement: definition.autoIncrement };
        if (definition.keyPath !== null) options.keyPath = definition.keyPath;
        const store = request.result.createObjectStore(definition.name, options);
        for (const index of definition.indexes) {
          store.createIndex(index.name, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry });
        }
      }
    };
    request.onsuccess = () => {
      const backup = request.result;
      if (!created) {
        backup.close();
        resolve(backupName);
        return;
      }
      if (!snapshot.length) {
        backup.close();
        resolve(backupName);
        return;
      }

      const transaction = backup.transaction(snapshot.map(({ name }) => name), 'readwrite');
      const complete = transactionResult(transaction);
      for (const definition of snapshot) {
        const store = transaction.objectStore(definition.name);
        for (const record of definition.records || []) {
          if (definition.keyPath === null) store.put(record.value, record.key);
          else store.put(record.value);
        }
      }
      complete.then(() => {
        backup.close();
        resolve(backupName);
      }).catch((error) => {
        backup.close();
        reject(error);
      });
    };
    request.onerror = () => reject(request.error || new Error('Nie udało się utworzyć kopii bazy danych'));
    request.onblocked = () => reject(new Error('Utworzenie kopii bazy danych zostało zablokowane'));
  });
}

function openExistingDatabase(indexedDB: IDBFactory, databaseName: string): Promise<{ database: IDBDatabase; created: boolean }> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    let created = false;
    request.onupgradeneeded = (event) => { created = event.oldVersion === 0; };
    request.onsuccess = () => resolve({ database: request.result, created });
    request.onerror = () => reject(request.error || new Error('Nie udało się otworzyć bazy danych'));
    request.onblocked = () => reject(new Error('Otwarcie bazy danych zostało zablokowane'));
  });
}

function upgradeDatabase(indexedDB: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = request.transaction!;
      const configStore = database.objectStoreNames.contains(CONFIG_STORE_NAME)
        ? transaction.objectStore(CONFIG_STORE_NAME)
        : database.createObjectStore(CONFIG_STORE_NAME, { keyPath: 'id' });
      const monthStore = database.objectStoreNames.contains(MONTH_STORE_NAME)
        ? transaction.objectStore(MONTH_STORE_NAME)
        : database.createObjectStore(MONTH_STORE_NAME, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
        database.createObjectStore(METADATA_STORE_NAME, { keyPath: 'key' });
      }
      if (event.oldVersion < 2) migrateLegacyRecord(transaction, configStore, monthStore);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Nie udało się otworzyć bazy danych'));
    request.onblocked = () => reject(new Error('Otwarcie bazy danych zostało zablokowane'));
  });
}

async function openAndMigrateDatabase(indexedDB: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  const existing = await openExistingDatabase(indexedDB, databaseName);
  let database = existing.database;
  if (existing.created) {
    database.close();
    database = await upgradeDatabase(indexedDB, databaseName);
  } else {
    try {
      const storedVersion = await readSchemaVersion(database);
      const fromVersion = storedVersion || CURRENT_SCHEMA_VERSION;
      const pending = pendingMigrations(fromVersion, CURRENT_SCHEMA_VERSION, SCHEMA_MIGRATIONS);
      if (database.version < DATABASE_VERSION || pending.length) {
        const snapshot = await snapshotDatabase(database);
        await createDatabaseBackup(indexedDB, databaseName, fromVersion, snapshot);
      }
      if (database.version < DATABASE_VERSION) {
        database.close();
        database = await upgradeDatabase(indexedDB, databaseName);
      }
      await runSchemaMigrations(database, { fromVersion, migrations: SCHEMA_MIGRATIONS });
    } catch (error) {
      database.close();
      throw error;
    }
  }

  const storedVersion = await readSchemaVersion(database);
  await runSchemaMigrations(database, { fromVersion: storedVersion || CURRENT_SCHEMA_VERSION });
  return database;
}

function readLegacyDb(storage: Storage | undefined): unknown | null {
  try {
    const stored = storage && storage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function loadDb({ indexedDB = globalThis.indexedDB, storage = globalThis.localStorage, databaseName = DATABASE_NAME }: PersistenceOptions = {}): Promise<AppDatabase> {
  try {
    const database = await openDatabase(indexedDB, databaseName);
    if (database) {
      const transaction = database.transaction([CONFIG_STORE_NAME, MONTH_STORE_NAME], 'readonly');
      const complete = transactionResult(transaction);
      const configRequest = requestResult<ConfigRecord | undefined>(transaction.objectStore(CONFIG_STORE_NAME).get(CONFIG_RECORD_ID));
      const monthsRequest = requestResult<MonthRecord[]>(transaction.objectStore(MONTH_STORE_NAME).getAll());
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

async function persistDb(snapshot: AppDatabase, database: IDBDatabase): Promise<void> {
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

export function saveDb(db: AppDatabase, { indexedDB = globalThis.indexedDB, storage = globalThis.localStorage, databaseName = DATABASE_NAME }: PersistenceOptions = {}): Promise<void> {
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