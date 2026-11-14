import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DayCardComponent } from './day-card.component';
import {
  DEFAULT_RESOLUTION,
  DEFAULT_TARGET_HOURS,
  DEFAULT_VERSION,
  DEFAULT_WORK_FROM,
  DEFAULT_WORK_TO,
  clone,
  createDefaultConfig,
  createDefaultLabels,
  createProfile,
  createProject,
  defaultCollaborationRecordAttributes,
  defaultCollaborationRecordConfig,
  defaultDayFields,
  defaultPageInfo,
  defaultWorkTypes,
  uid
} from '../config/defaults.js';
import { normalizeConfig } from '../config/normalize.js';
import { decryptJsonPayload, encryptJsonPayload, isEncryptedFilePayload } from '../crypto.js';
import { getDaySummary, getDefaultDayShape, isMeaningfullyEmpty } from '../render/calendar.js';
import { exportMonthPdf } from '../render/pdf.js';
import { loadDb, saveDb } from '../storage.js';
import {
  actionMinutes,
  fmtMin,
  iso,
  monthGrid,
  normalizeResolution,
  roundTime,
  stepForResolution,
  timeToMin,
  ym
} from '../utils/time.js';

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const BUILTIN_DAY_FIELDS = ['area', 'nextPlan', 'risks', 'notes'];

@Component({
  imports: [CommonModule, FormsModule, DayCardComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  db: any = createDefaultDb();
  currentMonth = ym(new Date());
  selectedProfileId: string | null = null;
  selectedProjectId: string | null = null;
  ready = false;
  configOpen = false;
  optionsOpen = false;
  pageInfoOpen = false;
  batchOpen = false;
  batchDescription = '';
  batchNotes = '';
  batchWorkFrom = DEFAULT_WORK_FROM;
  batchWorkTo = DEFAULT_WORK_TO;
  batchWorkType = '';
  batchResolution = DEFAULT_RESOLUTION;
  batchWeekdays = [0, 1, 2, 3, 4];
  readonly weekdays = WEEKDAYS;
  readonly today = iso(new Date());
  toast = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  async ngOnInit(): Promise<void> {
    try {
      this.db = await loadDb();
      this.selectedProfileId = this.db.config.defaultProfileId || this.db.config.profiles[0]?.id || null;
      this.selectedProjectId = this.db.config.defaultProjectId || this.db.config.projects[0]?.id || null;
      this.ready = true;
      this.ensureMonthDays();
    } catch (error) {
      this.showToast(`Nie udało się wczytać danych: ${this.errorMessage(error)}`);
    }
  }

  get config(): any {
    return this.db.config || createDefaultConfig();
  }

  get labels(): any {
    return { ...createDefaultLabels(), ...(this.config.labels || {}) };
  }

  get selectedProfile(): any {
    return this.config.profiles.find((item: any) => item.id === this.selectedProfileId) || this.config.profiles[0];
  }

  get selectedProject(): any {
    return this.config.projects.find((item: any) => item.id === this.selectedProjectId) || this.config.projects[0];
  }

  get effectiveConfig(): any {
    const global = this.config.global || createDefaultConfig().global;
    const profile = this.selectedProfile?.config || {};
    const project = this.selectedProject?.config || {};
    return {
      ...global,
      ...profile,
      ...project,
      timeResolution: normalizeResolution(project.timeResolution || profile.timeResolution || global.timeResolution),
      workFrom: project.workFrom || profile.workFrom || global.workFrom || DEFAULT_WORK_FROM,
      workTo: project.workTo || profile.workTo || global.workTo || DEFAULT_WORK_TO,
      workTypes: project.workTypes?.length ? project.workTypes : profile.workTypes?.length ? profile.workTypes : global.workTypes || defaultWorkTypes(),
      dayFields: project.dayFields?.length ? project.dayFields : profile.dayFields?.length ? profile.dayFields : global.dayFields || defaultDayFields(),
      collaborationRecords: project.collaborationRecords || profile.collaborationRecords || global.collaborationRecords || defaultCollaborationRecordConfig()
    };
  }

  get dayGrid(): any[][] {
    const dates = monthGrid(this.currentMonth).map((date) => {
      const dateKey = iso(date);
      return {
        date,
        key: dateKey,
        day: this.dayFor(dateKey),
        inMonth: ym(date) === this.currentMonth,
        weekday: WEEKDAYS[(date.getDay() + 6) % 7]
      };
    });
    const weeks: any[][] = [];
    for (let index = 0; index < dates.length; index += 7) weeks.push(dates.slice(index, index + 7));
    return weeks;
  }

  get allMonthDays(): any[] {
    return this.dayGrid.flat().filter((entry) => entry.inMonth);
  }

  get totalMinutes(): number {
    return this.allMonthDays.reduce((sum, { day }) => sum + (day.actions || []).reduce((daySum: number, action: any) => daySum + actionMinutes(action), 0), 0);
  }

  get totalActions(): number {
    return this.allMonthDays.reduce((sum, { day }) => sum + (day.actions || []).length, 0);
  }

  get batchDaysCount(): number {
    return this.allMonthDays.filter(({ date }) => this.batchWeekdays.includes((date.getDay() + 6) % 7)).length;
  }

  get targetHours(): number {
    const value = Number(this.effectiveConfig.targetHoursPerMonth ?? DEFAULT_TARGET_HOURS);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_TARGET_HOURS;
  }

  get remainingMinutes(): number {
    return Math.max(0, this.targetHours * 60 - this.totalMinutes);
  }

  get progress(): number {
    return Math.min(100, (this.totalMinutes / Math.max(this.targetHours * 60, 1)) * 100);
  }

  get pageInfo(): any {
    return { ...defaultPageInfo(), ...(this.config.pageInfo || {}) };
  }

  get configTargets(): any[] {
    return [
      { type: 'global', name: 'Globalne', item: this.config.global },
      ...this.config.profiles.map((item: any) => ({ type: 'profile', name: item.name, item })),
      ...this.config.projects.map((item: any) => ({ type: 'project', name: item.name, item }))
    ];
  }

  dayFor(dateKey: string): any {
    if (dateKey.slice(0, 7) !== this.currentMonth) return getDefaultDayShape(this.effectiveConfig);
    const bucket = this.getMonthBucket();
    if (!bucket.days[dateKey]) bucket.days[dateKey] = getDefaultDayShape(this.effectiveConfig);
    const day = bucket.days[dateKey];
    day.extra ||= {};
    day.actions ||= [];
    day.collaborationRecords ||= [];
    day.workRangeAuto ??= true;
    day.area ??= '';
    day.nextPlan ??= '';
    day.risks ??= '';
    day.notes ??= '';
    day.workFrom ||= this.effectiveConfig.workFrom || DEFAULT_WORK_FROM;
    day.workTo ||= this.effectiveConfig.workTo || DEFAULT_WORK_TO;
    for (const field of this.effectiveConfig.dayFields || []) {
      if (!field?.id || BUILTIN_DAY_FIELDS.includes(field.id)) continue;
      day.extra[field.id] ??= field.defaultValue || '';
    }
    return day;
  }

  getFieldValue(day: any, fieldId: string): any {
    return BUILTIN_DAY_FIELDS.includes(fieldId) ? day[fieldId] || '' : day.extra?.[fieldId] || '';
  }

  setExtraField(day: any, id: string, value: any): void {
    day.extra ||= {};
    day.extra[id] = value;
    day.collapsed = false;
    this.persist();
  }

  markChanged(day?: any): void {
    if (day) day.collapsed = false;
    this.persist();
  }

  toggleDay(day: any): void {
    day.collapsed = !day.collapsed;
    this.persist();
  }

  changeMonth(month: string): void {
    if (!month) return;
    this.currentMonth = month;
    this.ensureMonthDays();
  }

  changeProfile(id: string): void {
    this.selectedProfileId = id;
    this.config.defaultProfileId = id;
    this.refreshMonth();
    this.persist();
  }

  changeProject(id: string): void {
    this.selectedProjectId = id;
    this.config.defaultProjectId = id;
    this.refreshMonth();
    this.persist();
  }

  addAction(day: any): void {
    const type = this.effectiveConfig.workTypes[0];
    day.actions.push(this.actionDefaults(type));
    this.syncDayRange(day);
    day.collapsed = false;
    this.persist();
  }

  removeAction(day: any, index: number): void {
    day.actions.splice(index, 1);
    this.syncDayRange(day);
    this.persist();
  }

  addCollaboration(day: any): void {
    const attrs: Record<string, string> = {};
    for (const attribute of this.effectiveConfig.collaborationRecords.attributes || defaultCollaborationRecordAttributes()) {
      attrs[attribute.id] = attribute.defaultValue || '';
    }
    day.collaborationRecords.push({ attrs });
    day.collapsed = false;
    this.persist();
  }

  removeCollaboration(day: any, index: number): void {
    day.collaborationRecords.splice(index, 1);
    this.persist();
  }

  onActionTypeChange(day: any, action: any): void {
    const selected = this.effectiveConfig.workTypes.find((type: any) => type.id === action.workType);
    if (selected) {
      const defaults = this.actionDefaults(selected);
      action.from ||= defaults.from;
      action.to ||= defaults.to;
      action.description = defaults.description;
      action.notes = defaults.notes;
      action.attrs = defaults.attrs;
    }
    this.syncDayRange(day);
    this.markChanged(day);
  }

  openBatch(): void {
    const firstType = this.effectiveConfig.workTypes[0];
    const defaults = firstType?.defaultValues || {};
    this.batchWorkType = firstType?.id || '';
    this.batchDescription = defaults.description || '';
    this.batchNotes = defaults.notes || '';
    this.batchWorkFrom = roundTime(defaults.from || this.effectiveConfig.workFrom, this.effectiveConfig.timeResolution);
    this.batchWorkTo = roundTime(defaults.to || this.effectiveConfig.workTo, this.effectiveConfig.timeResolution);
    this.batchResolution = this.effectiveConfig.timeResolution;
    this.batchOpen = true;
  }

  applyBatch(): void {
    const selected = this.allMonthDays.filter(({ date }) => this.batchWeekdays.includes((date.getDay() + 6) % 7));
    for (const { day } of selected) {
      const action = this.actionDefaults(this.effectiveConfig.workTypes.find((type: any) => type.id === this.batchWorkType));
      action.from = roundTime(this.batchWorkFrom, this.batchResolution);
      action.to = roundTime(this.batchWorkTo, this.batchResolution);
      action.description = this.batchDescription;
      action.notes = this.batchNotes;
      day.actions.push(action);
      this.syncDayRange(day);
    }
    this.batchOpen = false;
    this.persist();
  }

  toggleBatchWeekday(index: number, checked: boolean): void {
    this.batchWeekdays = checked ? [...new Set([...this.batchWeekdays, index])] : this.batchWeekdays.filter((value) => value !== index);
  }

  onBatchTypeChange(): void {
    const type = this.effectiveConfig.workTypes.find((item: any) => item.id === this.batchWorkType);
    const defaults = type?.defaultValues || {};
    this.batchDescription = defaults.description || '';
    this.batchNotes = defaults.notes || '';
    this.batchWorkFrom = roundTime(defaults.from || this.effectiveConfig.workFrom, this.batchResolution);
    this.batchWorkTo = roundTime(defaults.to || this.effectiveConfig.workTo, this.batchResolution);
  }

  clearMonth(): void {
    if (!window.confirm(`Usunąć wszystkie dane dla ${this.currentMonth}?`)) return;
    const month = this.db.months[this.currentMonth];
    if (month?.[this.selectedProfileId as string]?.[this.selectedProjectId as string]) {
      delete month[this.selectedProfileId as string][this.selectedProjectId as string];
    }
    this.ensureMonthDays();
    this.persist();
  }

  async exportJson(): Promise<void> {
    await this.persist();
    const payload = {
      app: 'Ewidencja działań projektowych',
      version: DEFAULT_VERSION,
      exportedAt: new Date().toISOString(),
      data: this.db
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
      this.db = { version: DEFAULT_VERSION, config: normalizeConfig(incoming.config || incoming), months: incoming.months };
      this.selectedProfileId = this.config.defaultProfileId || this.config.profiles[0]?.id || null;
      this.selectedProjectId = this.config.defaultProjectId || this.config.projects[0]?.id || null;
      await this.persist();
      this.refreshMonth();
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

  addProfile(): void {
    const profile = createProfile('Nowy profil');
    this.config.profiles.push(profile);
    this.selectedProfileId = profile.id;
    this.config.defaultProfileId = profile.id;
    this.persist();
  }

  removeProfile(profile: any): void {
    if (this.config.profiles.length < 2) return;
    this.config.profiles = this.config.profiles.filter((item: any) => item.id !== profile.id);
    if (this.selectedProfileId === profile.id) this.changeProfile(this.config.profiles[0].id);
    this.persist();
  }

  addProject(): void {
    const project = createProject('Nowy projekt');
    this.config.projects.push(project);
    this.selectedProjectId = project.id;
    this.config.defaultProjectId = project.id;
    this.persist();
  }

  removeProject(project: any): void {
    if (this.config.projects.length < 2) return;
    this.config.projects = this.config.projects.filter((item: any) => item.id !== project.id);
    if (this.selectedProjectId === project.id) this.changeProject(this.config.projects[0].id);
    this.persist();
  }

  addWorkType(target: any): void {
    target.config ? (target.config.workTypes ||= []) : (target.workTypes ||= []);
    const config = target.config || target;
    config.workTypes.push({ id: uid('worktype'), name: 'Nowy typ', defaultValues: { from: '', to: '', description: '', notes: '', attrs: {} }, attributes: [] });
    this.persist();
  }

  removeWorkType(target: any, index: number): void {
    target.splice(index, 1);
    if (!target.length) target.push(...clone(defaultWorkTypes()));
    this.persist();
  }

  addWorkTypeAttribute(type: any): void {
    type.attributes ||= [];
    type.attributes.push({ id: uid('attr'), label: 'Nowy atrybut', name: 'Nowy atrybut', type: 'textarea', defaultValue: '' });
    this.persist();
  }

  addDayField(config: any): void {
    config.dayFields ||= [];
    config.dayFields.push({ id: uid('field'), label: 'Nowe pole', type: 'textarea', defaultValue: '' });
    this.persist();
  }

  addCollaborationAttribute(config: any): void {
    config.collaborationRecords ||= defaultCollaborationRecordConfig();
    config.collaborationRecords.attributes ||= [];
    config.collaborationRecords.attributes.push({ id: uid('collab-attr'), label: 'Nowy atrybut', name: 'Nowy atrybut', type: 'textarea', defaultValue: '' });
    this.persist();
  }

  addAboutCard(): void {
    this.pageInfo.cards ||= [];
    this.pageInfo.cards.push({ id: uid('aboutcard'), title: 'Nowa karta', body: '' });
    this.persist();
  }

  removeItem(items: any[], index: number): void {
    items.splice(index, 1);
    this.persist();
  }

  onConfigChange(): void {
    this.persist();
  }

  fieldDefaults(config: any): any {
    return config || {};
  }

  summary(day: any): any {
    return getDaySummary(day);
  }

  dayIsEmpty(day: any): boolean {
    return isMeaningfullyEmpty(day);
  }

  actionDuration(action: any): string {
    return fmtMin(actionMinutes(action));
  }

  fmtMin(minutes: number): string {
    return fmtMin(minutes);
  }

  fieldStep(): number {
    return stepForResolution(this.batchResolution);
  }

  saveAndToast(): void {
    this.persist();
  }

  objectKeys(value: any): string[] {
    return Object.keys(value || {});
  }

  builtinField(id: string): boolean {
    return BUILTIN_DAY_FIELDS.includes(id);
  }

  scrollToDay(dateKey: string): void {
    document.getElementById(`day-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private async persist(): Promise<void> {
    try {
      await saveDb(this.db);
      this.showToast('Zapisano zmiany');
    } catch (error) {
      this.showToast(`Nie udało się zapisać danych: ${this.errorMessage(error)}`);
    }
  }

  private showToast(message: string): void {
    this.toast = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast = '', 2500);
  }

  private getMonthBucket(): any {
    this.db.months ||= {};
    this.db.months[this.currentMonth] ||= {};
    this.db.months[this.currentMonth][this.selectedProfileId as string] ||= {};
    this.db.months[this.currentMonth][this.selectedProfileId as string][this.selectedProjectId as string] ||= { days: {} };
    return this.db.months[this.currentMonth][this.selectedProfileId as string][this.selectedProjectId as string];
  }

  private ensureMonthDays(): void {
    if (!this.selectedProfileId || !this.selectedProjectId) return;
    for (const { key } of monthGrid(this.currentMonth).map((date) => ({ key: iso(date) })).filter(({ key }) => ym(key) === this.currentMonth)) {
      this.dayFor(key);
    }
  }

  private refreshMonth(): void {
    this.ensureMonthDays();
  }

  private actionDefaults(type: any): any {
    const defaults = type?.defaultValues || {};
    const attrs: Record<string, any> = {};
    for (const attribute of type?.attributes || []) attrs[attribute.id] = defaults.attrs?.[attribute.id] ?? attribute.defaultValue ?? '';
    return {
      workType: type?.id || '',
      from: roundTime(defaults.from || '', this.effectiveConfig.timeResolution),
      to: roundTime(defaults.to || '', this.effectiveConfig.timeResolution),
      description: defaults.description || '',
      notes: defaults.notes || '',
      attrs
    };
  }

  private syncDayRange(day: any): void {
    if (day.workRangeAuto === false) return;
    const valid = day.actions.filter((action: any) => action.from || action.to);
    const starts = valid.map((action: any) => timeToMin(action.from)).filter((value: number | null): value is number => value !== null);
    const ends = valid.map((action: any) => timeToMin(action.to)).filter((value: number | null): value is number => value !== null);
    if (starts.length && ends.length) {
      day.workFrom = roundTime(this.minutesToTime(Math.min(...starts)), this.effectiveConfig.timeResolution);
      day.workTo = roundTime(this.minutesToTime(Math.max(...ends)), this.effectiveConfig.timeResolution);
    }
  }

  private minutesToTime(minutes: number): string {
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
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

function createDefaultDb(): any {
  const config = createDefaultConfig();
  return { version: DEFAULT_VERSION, config, months: {} };
}
