import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BatchEntryDialogComponent, type BatchEntryRequest } from '../features/batch-entry/batch-entry-dialog.component';
import { CalendarViewComponent } from '../features/calendar/calendar-view.component';
import { ConfigurationPageComponent } from '../features/configuration/configuration-page.component';
import { DictionariesPageComponent } from '../features/dictionaries/dictionaries-page.component';
import { ReporterToolbarComponent } from '../features/app-shell/reporter-toolbar.component';
import { PageInfoDialogComponent } from '../shared/components/page-info-dialog.component';
import { DEFAULT_VERSION } from '../core/config/defaults.js';
import { decryptJsonPayload, encryptJsonPayload, isEncryptedFilePayload } from '../features/data-management/crypto.js';
import { exportMonthPdf } from '../features/export/pdf.js';
import { ReporterStateService } from '../core/state/reporter-state.service';
import { iso } from '../shared/utils/time.js';

@Component({
  imports: [CommonModule, FormsModule, BatchEntryDialogComponent, CalendarViewComponent, ConfigurationPageComponent, DictionariesPageComponent, PageInfoDialogComponent, ReporterToolbarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly state: ReporterStateService
  ) {}

  readonly ready = signal(false);
  readonly loadError = signal('');
  configOpen = false;
  dictionariesOpen = false;
  pageInfoOpen = false;
  batchOpen = false;
  readonly today = iso(new Date());
  readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  async ngOnInit(): Promise<void> {
    await this.initialize();
  }

  async retryLoad(): Promise<void> {
    this.loadError.set('');
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.state.initialize();
      this.loadError.set('');
      this.ready.set(true);
    } catch (error) {
      this.loadError.set(this.errorMessage(error));
    }
  }

  get db(): any {
    return this.state.db;
  }

  get currentMonth(): string {
    return this.state.currentMonth;
  }

  get selectedProfileId(): string | null {
    return this.state.selectedProfileId;
  }

  get selectedProjectId(): string | null {
    return this.state.selectedProjectId;
  }

  get config(): any {
    return this.state.config;
  }

  get labels(): any {
    return this.state.labels;
  }

  get selectedProfile(): any {
    return this.state.selectedProfile;
  }

  get selectedProject(): any {
    return this.state.selectedProject;
  }

  get effectiveConfig(): any {
    return this.state.effectiveConfig;
  }

  get dayGrid(): any[][] {
    return this.state.dayGrid;
  }

  get allMonthDays(): any[] {
    return this.state.allMonthDays;
  }

  get totalMinutes(): number {
    return this.state.totalMinutes;
  }

  get totalActions(): number {
    return this.state.totalActions;
  }

  get targetHours(): number {
    return this.state.targetHours;
  }

  get remainingMinutes(): number {
    return this.state.remainingMinutes;
  }

  get progress(): number {
    return this.state.progress;
  }

  get pageInfo(): any {
    return this.state.pageInfo;
  }

  dayFor(dateKey: string): any {
    return this.state.dayFor(dateKey);
  }

  toggleDay(day: any): void {
    this.state.toggleDay(day);
    this.persist();
  }

  changeMonth(month: string): void {
    this.state.changeMonth(month);
  }

  changeProfile(id: string): void {
    this.state.changeProfile(id);
    this.persist();
  }

  changeProject(id: string): void {
    this.state.changeProject(id);
    this.persist();
  }

  openBatch(): void {
    this.batchOpen = true;
  }

  openDictionaries(): void {
    this.configOpen = false;
    this.dictionariesOpen = true;
  }

  applyBatch(request: BatchEntryRequest): void {
    this.state.applyBatch(request);
    this.batchOpen = false;
    this.persist();
  }

  clearMonth(): void {
    if (!window.confirm(`Usunąć wszystkie dane dla ${this.currentMonth}?`)) return;
    this.state.clearMonth();
    this.persist();
  }

  async exportJson(): Promise<void> {
    await this.persist();
    const payload = {
      app: 'Ewidencja działań projektowych',
      version: DEFAULT_VERSION,
      exportedAt: new Date().toISOString(),
      data: await this.state.exportData()
    };
    let output: any = payload;
    let encrypted = false;
    if (window.confirm('Czy zaszyfrować plik JSON hasłem?')) {
      const password = window.prompt('Wprowadź hasło do zaszyfrowania pliku JSON:');
      if (password === null) return;
      if (!password.trim()) {
        window.alert('Hasło nie może być puste.');
        return;
      }
      output = await encryptJsonPayload(payload, password);
      encrypted = true;
    }
    this.downloadJson(output, `ewidencja-${this.currentMonth}${encrypted ? '.encrypted' : ''}.json`);
  }

  async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (!window.confirm('Import zastąpi bieżącą konfigurację i wszystkie lokalnie zapisane dane. Czy kontynuować?')) return;
      const parsed = JSON.parse(await file.text());
      let incoming = parsed?.data && !isEncryptedFilePayload(parsed) ? parsed.data : parsed;
      if (isEncryptedFilePayload(parsed)) {
        const password = window.prompt('Plik jest zaszyfrowany. Wprowadź hasło do odszyfrowania:');
        if (password === null) return;
        incoming = await decryptJsonPayload(parsed, password);
        incoming = incoming?.data || incoming;
      }
      if (!incoming || typeof incoming !== 'object' || !incoming.months) throw new Error('Nieprawidłowy format pliku');
      this.state.replaceDatabase(incoming);
      await this.state.replaceDictionaries(incoming.dictionaries || []);
      this.changeDetector.detectChanges();
      await this.persist();
      window.alert('Import zakończony.');
    } catch (error) {
      window.alert(`Nie udało się wczytać pliku JSON: ${this.errorMessage(error)}`);
    } finally {
      input.value = '';
    }
  }

  exportPdf(): void {
    exportMonthPdf(this.pdfContext());
  }

  saveAndToast(): void {
    this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await this.state.save();
      this.showToast('Zapisano zmiany');
    } catch (error) {
      this.showToast(`Nie udało się zapisać danych: ${this.errorMessage(error)}`);
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2500);
  }

  private pdfContext(): any {
    return {
      currentMonth: this.currentMonth,
      getEffectiveConfig: () => this.effectiveConfig,
      getSelectedProfile: () => this.selectedProfile,
      getSelectedProject: () => this.selectedProject,
      getLabels: () => this.labels,
      ensureDay: (date: string) => this.dayFor(date),
      getMonthTargetHours: () => this.targetHours,
      formatPdfDate: (date: string) => {
        const [year, month, day] = date.split('-');
        return `${day}.${month}.${year}`;
      }
    };
  }

  private downloadJson(data: any, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
