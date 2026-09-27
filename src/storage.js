import { STORAGE_KEY, createDefaultConfig, DEFAULT_VERSION } from './config/defaults.js';
import { normalizeConfig } from './config/normalize.js';

export function loadDb(storage = globalThis.localStorage) {
  try {
    if (!storage) return { version: DEFAULT_VERSION, config: createDefaultConfig(), months: {} };
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!raw) return { version: DEFAULT_VERSION, config: createDefaultConfig(), months: {} };
    const migrated = { version: DEFAULT_VERSION, config: normalizeConfig(raw.config || raw), months: raw.months || {} };
    if (!migrated.config.labels) migrated.config.labels = createDefaultConfig().labels;
    migrated.config.version = DEFAULT_VERSION;
    if (!migrated.config.global) migrated.config.global = createDefaultConfig().global;
    if (!migrated.config.profiles || !migrated.config.profiles.length) migrated.config.profiles = [createDefaultConfig().profiles[0]];
    if (!migrated.config.projects || !migrated.config.projects.length) migrated.config.projects = [createDefaultConfig().projects[0]];
    return migrated;
  } catch (error) {
    return { version: DEFAULT_VERSION, config: createDefaultConfig(), months: {} };
  }
}

export function saveDb(db, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
}
