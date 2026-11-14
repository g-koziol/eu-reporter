import { Injectable } from '@angular/core';
import type { ProjectDictionary } from '../models.js';
import { deleteProjectDictionary, loadProjectDictionaries, saveProjectDictionary } from '../persistence/indexeddb.js';

@Injectable({ providedIn: 'root' })
export class ProjectDictionaryService {
  list(projectId: string): Promise<ProjectDictionary[]> {
    return projectId ? loadProjectDictionaries(projectId) : Promise.resolve([]);
  }

  async search(projectId: string, fieldKey: string, query: string): Promise<string[]> {
    const dictionaries = await this.list(projectId);
    const values = dictionaries.find((dictionary) => dictionary.fieldKey === fieldKey)?.values || [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return values.filter((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  }

  async addValue(projectId: string, fieldKey: string, value: string): Promise<void> {
    const normalizedValue = value.trim();
    if (!projectId || !fieldKey || !normalizedValue) return;
    const dictionaries = await this.list(projectId);
    const values = dictionaries.find((dictionary) => dictionary.fieldKey === fieldKey)?.values || [];
    if (values.some((item) => item.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase())) return;
    await this.saveDictionary(projectId, fieldKey, [...values, normalizedValue]);
  }

  saveDictionary(projectId: string, fieldKey: string, values: string[]): Promise<void> {
    return saveProjectDictionary(projectId, fieldKey, values);
  }

  async replaceValue(projectId: string, fieldKey: string, oldValue: string, newValue: string): Promise<void> {
    const normalizedValue = newValue.trim();
    if (!projectId || !fieldKey || !normalizedValue) return;
    const dictionaries = await this.list(projectId);
    const values = dictionaries.find((dictionary) => dictionary.fieldKey === fieldKey)?.values || [];
    const updated = values.map((value) => value === oldValue ? normalizedValue : value);
    await this.saveDictionary(projectId, fieldKey, [...new Set(updated)]);
  }

  async removeValue(projectId: string, fieldKey: string, value: string): Promise<void> {
    const dictionaries = await this.list(projectId);
    const values = dictionaries.find((dictionary) => dictionary.fieldKey === fieldKey)?.values || [];
    const updated = values.filter((item) => item !== value);
    if (updated.length) await this.saveDictionary(projectId, fieldKey, updated);
    else await deleteProjectDictionary(projectId, fieldKey);
  }

  removeDictionary(projectId: string, fieldKey: string): Promise<void> {
    return deleteProjectDictionary(projectId, fieldKey);
  }
}