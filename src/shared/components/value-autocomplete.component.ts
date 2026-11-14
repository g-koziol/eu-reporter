import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectDictionaryService } from '../../core/state/project-dictionary.service';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-value-autocomplete',
  templateUrl: './value-autocomplete.component.html'
})
export class ValueAutocompleteComponent {
  @Input() projectId: string | null = null;
  @Input({ required: true }) fieldKey = '';
  @Input() value = '';
  @Output() valueSelected = new EventEmitter<string>();

  open = false;
  query = '';
  matches: string[] = [];
  loading = false;

  constructor(
    private readonly dictionaries: ProjectDictionaryService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly host: ElementRef<HTMLElement>
  ) {}

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
      this.changeDetector.markForCheck();
    }
  }

  async toggle(): Promise<void> {
    this.open = !this.open;
    if (!this.open) return;
    this.query = this.value;
    await this.search();
  }

  async search(): Promise<void> {
    if (!this.projectId || !this.fieldKey) {
      this.matches = [];
      return;
    }
    this.loading = true;
    try {
      this.matches = await this.dictionaries.search(this.projectId, this.fieldKey, this.query);
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async rememberCurrentValue(): Promise<void> {
    if (!this.projectId || !this.value.trim()) return;
    await this.dictionaries.addValue(this.projectId, this.fieldKey, this.value);
    await this.search();
  }

  select(value: string): void {
    this.valueSelected.emit(value);
    this.open = false;
  }

  isRemembered(): boolean {
    return this.matches.some((match) => match.toLocaleLowerCase() === this.value.trim().toLocaleLowerCase());
  }
}