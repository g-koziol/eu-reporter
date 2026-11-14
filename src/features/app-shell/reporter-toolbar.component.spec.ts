import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultLabels } from '../../core/config/defaults.js';
import { ReporterToolbarComponent } from './reporter-toolbar.component';

describe('ReporterToolbarComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ReporterToolbarComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReporterToolbarComponent] }).compileComponents();
    fixture = TestBed.createComponent(ReporterToolbarComponent);
    fixture.componentRef.setInput('labels', createDefaultLabels());
    fixture.componentRef.setInput('profiles', [{ id: 'profile-1', name: 'Profil' }]);
    fixture.componentRef.setInput('projects', [{ id: 'project-1', name: 'Projekt' }]);
    fixture.componentRef.setInput('currentMonth', '2026-11');
    fixture.componentRef.setInput('totalMinutes', 90);
    fixture.componentRef.setInput('remainingMinutes', 5910);
    fixture.componentRef.setInput('targetHours', 100);
    fixture.componentRef.setInput('totalActions', 2);
    fixture.componentRef.setInput('progress', 1.5);
    fixture.detectChanges();
  });

  it('renders the month summary and selectors', () => {
    expect(fixture.nativeElement.textContent).toContain('1:30 h');
    expect(fixture.nativeElement.querySelector('input[type="month"]').value).toBe('2026-11');
    expect(fixture.nativeElement.querySelectorAll('select option')).toHaveLength(2);
  });

  it('emits a configuration request from the options menu', () => {
    const requested = vi.fn();
    fixture.componentInstance.configurationRequested.subscribe(requested);
    fixture.nativeElement.querySelector('.toolbar-menu > button').click();
    fixture.detectChanges();
    [...fixture.nativeElement.querySelectorAll('.toolbar-menu-panel button')]
      .find((button: HTMLButtonElement) => button.textContent?.includes('Konfiguracja'))
      ?.click();

    expect(requested).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.optionsOpen).toBe(false);
  });
});