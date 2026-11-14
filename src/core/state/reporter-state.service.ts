import { Injectable } from '@angular/core';
import {
  DEFAULT_TARGET_HOURS,
  DEFAULT_VERSION,
  DEFAULT_WORK_FROM,
  DEFAULT_WORK_TO,
  createDefaultConfig,
  createDefaultLabels,
  defaultCollaborationRecordAttributes,
  defaultCollaborationRecordConfig,
  defaultDayFields,
  defaultPageInfo,
  defaultWorkTypes
} from '../config/defaults.js';
import { normalizeConfig } from '../config/normalize.js';
import { getDefaultDayShape } from '../../features/calendar/calendar.js';
import { loadDb, saveDb } from '../persistence/indexeddb.js';
import { actionMinutes, iso, monthGrid, normalizeResolution, roundTime, timeToMin, ym } from '../../shared/utils/time.js';

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const BUILTIN_DAY_FIELDS = ['area', 'nextPlan', 'risks', 'notes'];

@Injectable({ providedIn: 'root' })
export class ReporterStateService {
  db: any = createDefaultDb();
  currentMonth = ym(new Date());
  selectedProfileId: string | null = null;
  selectedProjectId: string | null = null;

  async initialize(): Promise<void> {
    this.db = await loadDb();
    this.selectedProfileId = this.config.defaultProfileId || this.config.profiles[0]?.id || null;
    this.selectedProjectId = this.config.defaultProjectId || this.config.projects[0]?.id || null;
    this.ensureMonthDays();
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

  changeMonth(month: string): void {
    if (!month) return;
    this.currentMonth = month;
    this.ensureMonthDays();
  }

  changeProfile(id: string): void {
    this.selectedProfileId = id;
    this.config.defaultProfileId = id;
    this.refreshMonth();
  }

  changeProject(id: string): void {
    this.selectedProjectId = id;
    this.config.defaultProjectId = id;
    this.refreshMonth();
  }

  toggleDay(day: any): void {
    day.collapsed = !day.collapsed;
  }

  applyBatch(request: {
    workType: string;
    resolution: string;
    workFrom: string;
    workTo: string;
    description: string;
    notes: string;
    weekdays: number[];
  }): void {
    const selected = this.allMonthDays.filter(({ date }) => request.weekdays.includes((date.getDay() + 6) % 7));
    for (const { day } of selected) {
      const action = this.actionDefaults(this.effectiveConfig.workTypes.find((type: any) => type.id === request.workType));
      action.from = roundTime(request.workFrom, request.resolution);
      action.to = roundTime(request.workTo, request.resolution);
      action.description = request.description;
      action.notes = request.notes;
      day.actions.push(action);
      this.syncDayRange(day);
    }
  }

  clearMonth(): void {
    const month = this.db.months[this.currentMonth];
    if (month?.[this.selectedProfileId as string]?.[this.selectedProjectId as string]) {
      delete month[this.selectedProfileId as string][this.selectedProjectId as string];
    }
    this.ensureMonthDays();
  }

  replaceDatabase(incoming: any): void {
    this.db = { version: DEFAULT_VERSION, config: normalizeConfig(incoming.config || incoming), months: incoming.months };
    this.selectedProfileId = this.config.defaultProfileId || this.config.profiles[0]?.id || null;
    this.selectedProjectId = this.config.defaultProjectId || this.config.projects[0]?.id || null;
    this.refreshMonth();
  }

  save(): Promise<void> {
    return saveDb(this.db);
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
}

function createDefaultDb(): any {
  const config = createDefaultConfig();
  return { version: DEFAULT_VERSION, config, months: {} };
}