import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createDefaultConfig, STORAGE_KEY } from '../config/defaults.js';
import { CURRENT_SCHEMA_VERSION, deleteProjectDictionary, loadAllProjectDictionaries, loadDb, loadProjectDictionaries, replaceAllProjectDictionaries, runSchemaMigrations, saveDb, saveProjectDictionary } from './indexeddb.js';

interface TestDictionaryRecord {
  id: string;
  projectId: string;
  fieldKey: string;
  values: string[];
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createLegacyDatabase(indexedDB: IDBFactory, name: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('appData');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('appData', 'readwrite');
      transaction.objectStore('appData').put(value, STORAGE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

describe('IndexedDB persistence', () => {
  it('stores configuration and months as separate records and reloads the legacy JSON shape', async () => {
    const indexedDB = new IDBFactory();
    const databaseName = 'records-test';
    const source = {
      version: 1,
      config: createDefaultConfig(),
      months: { '2026-11': { days: { '2026-11-02': { notes: 'Saved' } } } }
    };

    await saveDb(source, { indexedDB, databaseName });
    const restored = await loadDb({ indexedDB, databaseName });
    const database = await requestResult(indexedDB.open(databaseName));
    const transaction = database.transaction(['config', 'months', 'metadata', 'dictionaries'], 'readonly');
    const configRecords = await requestResult(transaction.objectStore('config').getAll());
    const monthRecords = await requestResult(transaction.objectStore('months').getAll());
    const schemaVersion = await requestResult(transaction.objectStore('metadata').get('schemaVersion'));

    expect(configRecords).toHaveLength(1);
    expect(monthRecords).toEqual([{ id: '2026-11', data: source.months['2026-11'] }]);
    expect(restored.months).toEqual(source.months);
    expect(schemaVersion.value).toBe(CURRENT_SCHEMA_VERSION);
    database.close();
  });

  it('stores dictionary values by project and field key', async () => {
    const indexedDB = new IDBFactory();
    const databaseName = 'dictionaries-test';
    await saveDb({ version: 1, config: createDefaultConfig(), months: {} }, { indexedDB, databaseName });

    await saveProjectDictionary('project-1', 'action.description', ['Initial visit', 'Follow-up'], { indexedDB, databaseName });
    await saveProjectDictionary('project-2', 'action.description', ['Different project'], { indexedDB, databaseName });
    const projectValues = await loadProjectDictionaries('project-1', { indexedDB, databaseName });

    expect(projectValues).toEqual([{
      id: JSON.stringify(['project-1', 'action.description']),
      projectId: 'project-1',
      fieldKey: 'action.description',
      values: ['Initial visit', 'Follow-up']
    }]);
    expect(await loadAllProjectDictionaries({ indexedDB, databaseName })).toHaveLength(2);
    await replaceAllProjectDictionaries([
      { projectId: 'project-1', fieldKey: 'day.area', values: ['Imported value'] }
    ], { indexedDB, databaseName });
    expect(await loadProjectDictionaries('project-1', { indexedDB, databaseName })).toEqual([{
      id: JSON.stringify(['project-1', 'day.area']),
      projectId: 'project-1',
      fieldKey: 'day.area',
      values: ['Imported value']
    }]);
    await deleteProjectDictionary('project-1', 'day.area', { indexedDB, databaseName });
    expect(await loadProjectDictionaries('project-1', { indexedDB, databaseName })).toEqual([]);
  });

  it('migrates the v1 single-record store into the new stores', async () => {
    const indexedDB = new IDBFactory();
    const databaseName = 'migration-test';
    const config = createDefaultConfig();
    const legacy = {
      version: 1,
      config,
      months: {
        '2025-12': {
          [config.defaultProfileId]: {
            [config.defaultProjectId]: { days: { '2025-12-01': { notes: 'Migrated', area: 'School' } } }
          }
        }
      }
    };
    await createLegacyDatabase(indexedDB, databaseName, legacy);

    const restored = await loadDb({ indexedDB, databaseName });
    const database = await requestResult(indexedDB.open(databaseName));
    const transaction = database.transaction(['config', 'months', 'appData', 'metadata', 'dictionaries'], 'readonly');
    const oldRecord = await requestResult(transaction.objectStore('appData').get(STORAGE_KEY));
    const monthRecords = await requestResult(transaction.objectStore('months').getAll());
    const schemaVersion = await requestResult(transaction.objectStore('metadata').get('schemaVersion'));
    const migratedDictionaries = await requestResult<TestDictionaryRecord[]>(transaction.objectStore('dictionaries').index('byProjectId').getAll(legacy.config.defaultProjectId));
    const backup = await requestResult(indexedDB.open(`${databaseName}_backup_1.0.0`));
    const backupRecord = await requestResult(backup.transaction('appData').objectStore('appData').get(STORAGE_KEY));

    expect(restored.months).toEqual(legacy.months);
    expect(oldRecord).toBeUndefined();
    expect(monthRecords).toEqual([{ id: '2025-12', data: legacy.months['2025-12'] }]);
    expect(schemaVersion.value).toBe(CURRENT_SCHEMA_VERSION);
    expect(backupRecord).toEqual(legacy);
    expect(migratedDictionaries).toContainEqual({
      id: JSON.stringify([legacy.config.defaultProjectId, 'day.notes']),
      projectId: legacy.config.defaultProjectId,
      fieldKey: 'day.notes',
      values: ['Migrated']
    });
    expect(migratedDictionaries).toContainEqual({
      id: JSON.stringify([legacy.config.defaultProjectId, 'day.area']),
      projectId: legacy.config.defaultProjectId,
      fieldKey: 'day.area',
      values: ['School']
    });
    backup.close();
    database.close();
  });

  it('runs matching semantic-version migrations in ascending order and records the target version', async () => {
    const indexedDB = new IDBFactory();
    const databaseName = 'ordered-migrations-test';
    await saveDb({ version: 1, config: createDefaultConfig(), months: {} }, { indexedDB, databaseName });
    const database = await requestResult(indexedDB.open(databaseName));
    const order: string[] = [];

    await runSchemaMigrations(database, {
      fromVersion: '1.0.0',
      toVersion: '1.2.0',
      migrations: [
        { version: '2.0.0', up: async () => { order.push('2.0.0'); } },
        { version: '1.2.0', up: async () => { order.push('1.2.0'); } },
        { version: '1.1.0', up: async () => { order.push('1.1.0'); } }
      ]
    });

    const schemaVersion = await requestResult(database.transaction('metadata').objectStore('metadata').get('schemaVersion'));
    expect(order).toEqual(['1.1.0', '1.2.0']);
    expect(schemaVersion.value).toBe('1.2.0');
    database.close();
  });
});