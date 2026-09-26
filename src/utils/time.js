import { DEFAULT_RESOLUTION } from '../config/defaults.js';

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function iso(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ym(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function timeToMin(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function actionMinutes(action) {
  const start = timeToMin(action && action.from);
  const end = timeToMin(action && action.to);
  if (start === null || end === null) return 0;
  return end >= start ? end - start : (24 * 60 - start) + end;
}

export function fmtMin(min) {
  const rounded = Math.max(0, Math.round(min));
  return `${Math.floor(rounded / 60)}:${pad(rounded % 60)} h`;
}

export function normalizeResolution(value) {
  if (value === '30m') return '30m';
  if (value === 'hour') return 'hour';
  return DEFAULT_RESOLUTION;
}

export function stepForResolution(resolution) {
  const value = normalizeResolution(resolution);
  if (value === 'hour') return 3600;
  if (value === '30m') return 1800;
  return 60;
}

export function roundTime(value, resolution) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return value || '';
  const [hours, minutes] = value.split(':').map(Number);
  const total = (hours * 60) + minutes;
  const step = resolution === 'hour' ? 60 : resolution === '30m' ? 30 : 1;
  const rounded = Math.max(0, Math.round(total / step) * step);
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function monthGrid(key) {
  const [year, month] = key.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);

  const sundayIndex = (last.getDay() + 6) % 7;
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - sundayIndex));

  const days = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return days;
}
