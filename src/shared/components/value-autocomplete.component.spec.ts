import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDictionaryService } from '../../core/state/project-dictionary.service';
import { ValueAutocompleteComponent } from './value-autocomplete.component';

describe('ValueAutocompleteComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ValueAutocompleteComponent>>;
  const search = vi.fn(async (_projectId: string, _fieldKey: string, query: string) =>
    ['Planowanie tygodnia', 'Kontakt z OPS'].filter((value) => value.toLowerCase().includes(query.toLowerCase()))
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueAutocompleteComponent],
      providers: [{ provide: ProjectDictionaryService, useValue: { search, addValue: vi.fn() } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ValueAutocompleteComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('fieldKey', 'action.description');
    fixture.componentRef.setInput('value', 'plan');
    fixture.detectChanges();
  });

  it('searches stored values and selects a matching full-text result', async () => {
    const selected = vi.fn();
    fixture.componentInstance.valueSelected.subscribe(selected);
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search).toHaveBeenCalledWith('project-1', 'action.description', 'plan');
    expect(fixture.nativeElement.textContent).toContain('Planowanie tygodnia');
    fixture.nativeElement.querySelector('.value-autocomplete-option').click();

    expect(selected).toHaveBeenCalledWith('Planowanie tygodnia');
  });

  it('closes when clicking outside the component', async () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);

    outsideButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open).toBe(false);
    outsideButton.remove();
  });
});