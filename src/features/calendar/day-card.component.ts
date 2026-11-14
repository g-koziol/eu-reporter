import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { actionMinutes, fmtMin, roundTime, stepForResolution } from '../../shared/utils/time.js';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-day-card',
  templateUrl: './day-card.component.html'
})
export class DayCardComponent {
  @Input({ required: true }) entry: any;
  @Input({ required: true }) config: any;
  @Input() collapsed = false;
  @Output() changed = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<void>();

  get day(): any {
    return this.entry.day;
  }

  get totalMinutes(): number {
    return (this.day.actions || []).reduce((total: number, action: any) => total + actionMinutes(action), 0);
  }

  get totalDuration(): string {
    return fmtMin(this.totalMinutes);
  }

  get dayFields(): any[] {
    return (this.config.dayFields || []).filter((field: any) => !['area', 'nextPlan', 'risks', 'notes'].includes(field.id));
  }

  get collaborationAttributes(): any[] {
    return this.config.collaborationRecords?.attributes || [];
  }

  actionDuration(action: any): string {
    return fmtMin(actionMinutes(action));
  }

  attributesFor(action: any): any[] {
    return this.config.workTypes.find((type: any) => type.id === action.workType)?.attributes || [];
  }

  newAction(): any {
    const type = this.config.workTypes[0];
    const defaults = type?.defaultValues || {};
    const attrs: Record<string, any> = {};
    for (const attribute of type?.attributes || []) {
      attrs[attribute.id] = defaults.attrs?.[attribute.id] ?? attribute.defaultValue ?? '';
    }
    return {
      workType: type?.id || '',
      from: roundTime(defaults.from || '', this.config.timeResolution),
      to: roundTime(defaults.to || '', this.config.timeResolution),
      description: defaults.description || '',
      notes: defaults.notes || '',
      attrs
    };
  }

  step(): number {
    return stepForResolution(this.config.timeResolution);
  }

  changeTime(action: any, field: 'from' | 'to', value: string): void {
    action[field] = roundTime(value, this.config.timeResolution);
    this.actionChanged();
  }

  actionTypeChanged(action: any): void {
    const type = this.config.workTypes.find((item: any) => item.id === action.workType);
    if (!type) {
      this.actionChanged();
      return;
    }
    const defaults = type.defaultValues || {};
    action.description = defaults.description || '';
    action.notes = defaults.notes || '';
    action.attrs = {};
    for (const attribute of type.attributes || []) {
      action.attrs[attribute.id] = defaults.attrs?.[attribute.id] ?? attribute.defaultValue ?? '';
    }
    action.from ||= roundTime(defaults.from || '', this.config.timeResolution);
    action.to ||= roundTime(defaults.to || '', this.config.timeResolution);
    this.actionChanged();
  }

  workRangeChanged(field: 'workFrom' | 'workTo', value: string): void {
    this.day[field] = value;
    this.day.workRangeAuto = false;
    this.actionChanged();
  }

  actionChanged(): void {
    this.day.collapsed = false;
    this.syncDayRange();
    this.changed.emit();
  }

  updateActionAttribute(action: any, id: string, value: string): void {
    action.attrs ||= {};
    action.attrs[id] = value;
    this.actionChanged();
  }

  updateCollaborationAttribute(record: any, id: string, value: string): void {
    record.attrs ||= {};
    record.attrs[id] = value;
    this.actionChanged();
  }

  toggle(): void {
    this.collapsedChange.emit();
  }

  private syncDayRange(): void {
    if (this.day.workRangeAuto === false) return;
    const actions = (this.day.actions || []).filter((action: any) => action.from || action.to);
    const from = actions.map((action: any) => this.timeToMinutes(action.from)).filter((value: number | null): value is number => value !== null);
    const to = actions.map((action: any) => this.timeToMinutes(action.to)).filter((value: number | null): value is number => value !== null);
    if (!from.length || !to.length) return;
    this.day.workFrom = roundTime(this.minutesToTime(Math.min(...from)), this.config.timeResolution);
    this.day.workTo = roundTime(this.minutesToTime(Math.max(...to)), this.config.timeResolution);
  }

  private timeToMinutes(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
}