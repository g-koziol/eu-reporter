import { DEFAULT_WORK_FROM, DEFAULT_WORK_TO } from '../../core/config/defaults.js';
import type { DayRecord, SettingsConfig } from '../../core/models.js';
import { fmtMin, actionMinutes } from '../../shared/utils/time.js';

export function isMeaningfullyEmpty(day: Partial<DayRecord> = {}): boolean {
  const values = [
    day.area,
    day.nextPlan,
    day.risks,
    day.notes,
    day.workFrom,
    day.workTo,
    ...(Object.values(day.extra || {}))
  ];
  return !(day.actions || []).length && values.every((value) => !value || !String(value).trim());
}

export function getDaySummary(day: Partial<DayRecord> = {}) {
  const total = (day.actions || []).reduce((sum, action) => sum + actionMinutes(action), 0);
  const isEmpty = isMeaningfullyEmpty(day);
  return {
    label: isEmpty ? '-' : fmtMin(total),
    totalMinutes: total,
    isEmpty
  };
}

export function getDefaultDayShape(config: Partial<SettingsConfig> = {}): DayRecord {
  return {
    workFrom: config.workFrom || DEFAULT_WORK_FROM,
    workTo: config.workTo || DEFAULT_WORK_TO,
    area: '',
    nextPlan: '',
    risks: '',
    notes: '',
    extra: {},
    actions: [],
    collaborationRecords: [],
    collapsed: Boolean(config.collapseEmptyDaysByDefault)
  };
}
