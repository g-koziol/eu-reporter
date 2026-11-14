import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  imports: [CommonModule],
  selector: 'app-page-info-dialog',
  templateUrl: './page-info-dialog.component.html'
})
export class PageInfoDialogComponent {
  @Input() open = false;
  @Input({ required: true }) pageInfo: any;
  @Output() closed = new EventEmitter<void>();
}