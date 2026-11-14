import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { getDaySummary } from './calendar.js';
import { DayCardComponent } from './day-card.component';

@Component({
  imports: [CommonModule, DayCardComponent],
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html'
})
export class CalendarViewComponent {
  @Input({ required: true }) monthDays: any[] = [];
  @Input({ required: true }) weeks: any[][] = [];
  @Input({ required: true }) config: any;
  @Input({ required: true }) today = '';
  @Input() projectId: string | null = null;
  @Output() batchRequested = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @Output() dayCollapsed = new EventEmitter<any>();

  summary(day: any): any {
    return getDaySummary(day);
  }

  scrollToDay(dateKey: string): void {
    document.getElementById(`day-${dateKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}