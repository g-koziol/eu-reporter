import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ConfigurableOwner, ProjectDictionary } from '../../core/models.js';
import { ProjectDictionaryService } from '../../core/state/project-dictionary.service';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-dictionaries-page',
  templateUrl: './dictionaries-page.component.html'
})
export class DictionariesPageComponent implements OnChanges {
  @Input() projects: ConfigurableOwner[] = [];
  @Input() projectId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() projectSelected = new EventEmitter<string>();

  selectedProjectId: string | null = null;
  dictionaries: ProjectDictionary[] = [];
  filter = '';
  newFieldKey = '';
  newValues: Record<string, string> = {};
  draftValues: Record<string, string[]> = {};

  constructor(
    private readonly dictionaryService: ProjectDictionaryService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] || changes['projects']) {
      this.selectedProjectId = this.projectId || this.projects[0]?.id || null;
      void this.loadDictionaries();
    }
  }

  get filteredDictionaries(): ProjectDictionary[] {
    const query = this.filter.trim().toLocaleLowerCase();
    if (!query) return this.dictionaries;
    return this.dictionaries.filter((dictionary) =>
      dictionary.fieldKey.toLocaleLowerCase().includes(query) ||
      dictionary.values.some((value) => value.toLocaleLowerCase().includes(query))
    );
  }

  visibleValues(dictionary: ProjectDictionary): Array<{ value: string; index: number }> {
    const query = this.filter.trim().toLocaleLowerCase();
    const showAll = !query || dictionary.fieldKey.toLocaleLowerCase().includes(query);
    return dictionary.values
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => showAll || value.toLocaleLowerCase().includes(query));
  }

  changeProject(projectId: string): void {
    this.selectedProjectId = projectId;
    this.projectSelected.emit(projectId);
    void this.loadDictionaries();
  }

  async loadDictionaries(): Promise<void> {
    this.dictionaries = this.selectedProjectId ? await this.dictionaryService.list(this.selectedProjectId) : [];
    this.draftValues = Object.fromEntries(this.dictionaries.map((dictionary) => [dictionary.fieldKey, [...dictionary.values]]));
    this.changeDetector.markForCheck();
  }

  async addDictionary(): Promise<void> {
    const fieldKey = this.newFieldKey.trim();
    if (!this.selectedProjectId || !fieldKey || this.dictionaries.some((dictionary) => dictionary.fieldKey === fieldKey)) return;
    await this.dictionaryService.saveDictionary(this.selectedProjectId, fieldKey, []);
    this.newFieldKey = '';
    await this.loadDictionaries();
  }

  async addValue(fieldKey: string): Promise<void> {
    const value = this.newValues[fieldKey]?.trim();
    if (!this.selectedProjectId || !value) return;
    await this.dictionaryService.addValue(this.selectedProjectId, fieldKey, value);
    this.newValues[fieldKey] = '';
    await this.loadDictionaries();
  }

  async saveValue(fieldKey: string, index: number, originalValue: string): Promise<void> {
    if (!this.selectedProjectId) return;
    const newValue = this.draftValues[fieldKey]?.[index]?.trim();
    if (!newValue || newValue === originalValue) return;
    await this.dictionaryService.replaceValue(this.selectedProjectId, fieldKey, originalValue, newValue);
    await this.loadDictionaries();
  }

  async removeValue(fieldKey: string, value: string): Promise<void> {
    if (!this.selectedProjectId) return;
    await this.dictionaryService.removeValue(this.selectedProjectId, fieldKey, value);
    await this.loadDictionaries();
  }

  async removeDictionary(fieldKey: string): Promise<void> {
    if (!this.selectedProjectId) return;
    await this.dictionaryService.removeDictionary(this.selectedProjectId, fieldKey);
    await this.loadDictionaries();
  }
}