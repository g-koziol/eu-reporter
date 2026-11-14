import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fmtMin } from '../../shared/utils/time.js';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-reporter-toolbar',
  templateUrl: './reporter-toolbar.component.html'
})
export class ReporterToolbarComponent {
  @Input({ required: true }) labels: any;
  @Input() profiles: any[] = [];
  @Input() projects: any[] = [];
  @Input() currentMonth = '';
  @Input() selectedProfileId: string | null = null;
  @Input() selectedProjectId: string | null = null;
  @Input() totalMinutes = 0;
  @Input() remainingMinutes = 0;
  @Input() targetHours = 0;
  @Input() totalActions = 0;
  @Input() progress = 0;
  @Output() pageInfoRequested = new EventEmitter<void>();
  @Output() monthChanged = new EventEmitter<string>();
  @Output() profileChanged = new EventEmitter<string>();
  @Output() projectChanged = new EventEmitter<string>();
  @Output() configurationRequested = new EventEmitter<void>();
  @Output() exportJsonRequested = new EventEmitter<void>();
  @Output() exportPdfRequested = new EventEmitter<void>();
  @Output() importRequested = new EventEmitter<Event>();
  @Output() clearMonthRequested = new EventEmitter<void>();

  optionsOpen = false;

  formatMinutes(value: number): string {
    return fmtMin(value);
  }

  configure(): void {
    this.optionsOpen = false;
    this.configurationRequested.emit();
  }

  importFile(event: Event): void {
    this.optionsOpen = false;
    this.importRequested.emit(event);
  }
}