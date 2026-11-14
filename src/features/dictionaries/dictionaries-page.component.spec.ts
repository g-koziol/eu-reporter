import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDictionaryService } from '../../core/state/project-dictionary.service';
import { DictionariesPageComponent } from './dictionaries-page.component';

describe('DictionariesPageComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DictionariesPageComponent>>;
  const list = vi.fn(async (projectId: string) => projectId === 'project-1'
    ? [{ id: 'one', projectId, fieldKey: 'day.area', values: ['School', 'Clinic'] }]
    : []);
  const dictionaryService = {
    list,
    saveDictionary: vi.fn(),
    addValue: vi.fn(),
    replaceValue: vi.fn(),
    removeValue: vi.fn(),
    removeDictionary: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DictionariesPageComponent],
      providers: [{ provide: ProjectDictionaryService, useValue: dictionaryService }]
    }).compileComponents();
    fixture = TestBed.createComponent(DictionariesPageComponent);
    fixture.componentRef.setInput('projects', [
      { id: 'project-1', name: 'Projekt pierwszy', config: {} },
      { id: 'project-2', name: 'Projekt drugi', config: {} }
    ]);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows dictionaries and filters by text contained in a value', async () => {
    expect(fixture.nativeElement.textContent).toContain('day.area');
    fixture.componentInstance.filter = 'lin';
    fixture.detectChanges();
    const displayedValues = [...fixture.nativeElement.querySelectorAll('.dictionary-value-row input')]
      .map((input: HTMLInputElement) => input.value);

    expect(displayedValues).toContain('Clinic');
    expect(displayedValues).not.toContain('School');
  });

  it('loads dictionaries when switching projects', async () => {
    fixture.nativeElement.querySelector('select').value = 'project-2';
    fixture.nativeElement.querySelector('select').dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(list).toHaveBeenLastCalledWith('project-2');
    expect(fixture.nativeElement.textContent).toContain('Brak słowników');
  });
});