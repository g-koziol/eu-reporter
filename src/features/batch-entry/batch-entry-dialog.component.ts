import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { roundTime, stepForResolution } from '../../shared/utils/time.js';
import { ValueAutocompleteComponent } from '../../shared/components/value-autocomplete.component';

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

export interface BatchEntryRequest {
  workType: string;
  resolution: string;
  workFrom: string;
  workTo: string;
  description: string;
  notes: string;
  weekdays: number[];
}

@Component({
  imports: [CommonModule, FormsModule, ValueAutocompleteComponent],
  selector: 'app-batch-entry-dialog',
  templateUrl: './batch-entry-dialog.component.html'
})
export class BatchEntryDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() monthDays: any[] = [];
  @Input() currentMonth = '';
  @Input() projectId: string | null = null;
  @Input() config: any;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<BatchEntryRequest>();

  readonly weekdays = WEEKDAYS;
  description = '';
  notes = '';
  workFrom = '';
  workTo = '';
  workType = '';
  resolution = 'minute';
  selectedWeekdays = [0, 1, 2, 3, 4];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue && this.config) this.resetForm();
  }

  get daysCount(): number {
    return this.monthDays.filter(({ date }) => this.selectedWeekdays.includes((date.getDay() + 6) % 7)).length;
  }

  step(): number {
    return stepForResolution(this.resolution);
  }

  typeChanged(): void {
    const defaults = this.config.workTypes.find((type: any) => type.id === this.workType)?.defaultValues || {};
    this.description = defaults.description || '';
    this.notes = defaults.notes || '';
    this.workFrom = roundTime(defaults.from || this.config.workFrom, this.resolution);
    this.workTo = roundTime(defaults.to || this.config.workTo, this.resolution);
  }

  toggleWeekday(index: number, checked: boolean): void {
    this.selectedWeekdays = checked
      ? [...new Set([...this.selectedWeekdays, index])]
      : this.selectedWeekdays.filter((weekday) => weekday !== index);
  }

  submit(): void {
    this.submitted.emit({
      workType: this.workType,
      resolution: this.resolution,
      workFrom: this.workFrom,
      workTo: this.workTo,
      description: this.description,
      notes: this.notes,
      weekdays: [...this.selectedWeekdays]
    });
  }

  private resetForm(): void {
    const firstType = this.config.workTypes[0];
    this.workType = firstType?.id || '';
    this.resolution = this.config.timeResolution;
    this.selectedWeekdays = [0, 1, 2, 3, 4];
    this.typeChanged();
  }
}