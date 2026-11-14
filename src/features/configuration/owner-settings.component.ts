import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { clone, defaultCollaborationRecordConfig, defaultWorkTypes, uid } from '../../core/config/defaults.js';

const BUILTIN_DAY_FIELDS = ['area', 'nextPlan', 'risks', 'notes'];

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-owner-settings',
  templateUrl: './owner-settings.component.html'
})
export class OwnerSettingsComponent {
  @Input({ required: true }) owner: any;
  @Input({ required: true }) kind: 'profile' | 'project' = 'profile';
  @Input({ required: true }) labels: any;
  @Input() canDelete = true;
  @Output() changed = new EventEmitter<void>();
  @Output() removeRequested = new EventEmitter<void>();

  addWorkType(): void {
    this.owner.config.workTypes.push({
      id: uid('worktype'),
      name: 'Nowy typ',
      defaultValues: { from: '', to: '', description: '', notes: '', attrs: {} },
      attributes: []
    });
    this.changed.emit();
  }

  removeWorkType(index: number): void {
    this.owner.config.workTypes.splice(index, 1);
    if (!this.owner.config.workTypes.length) this.owner.config.workTypes.push(...clone(defaultWorkTypes()));
    this.changed.emit();
  }

  addWorkTypeAttribute(type: any): void {
    type.attributes ||= [];
    type.attributes.push({ id: uid('attr'), label: 'Nowy atrybut', name: 'Nowy atrybut', type: 'textarea', defaultValue: '' });
    this.changed.emit();
  }

  addDayField(): void {
    this.owner.config.dayFields ||= [];
    this.owner.config.dayFields.push({ id: uid('field'), label: 'Nowe pole', type: 'textarea', defaultValue: '' });
    this.changed.emit();
  }

  addCollaborationAttribute(): void {
    this.owner.config.collaborationRecords ||= defaultCollaborationRecordConfig();
    this.owner.config.collaborationRecords.attributes ||= [];
    this.owner.config.collaborationRecords.attributes.push({ id: uid('collab-attr'), label: 'Nowy atrybut', name: 'Nowy atrybut', type: 'textarea', defaultValue: '' });
    this.changed.emit();
  }

  removeItem(items: any[], index: number): void {
    items.splice(index, 1);
    this.changed.emit();
  }

  builtinField(id: string): boolean {
    return BUILTIN_DAY_FIELDS.includes(id);
  }
}