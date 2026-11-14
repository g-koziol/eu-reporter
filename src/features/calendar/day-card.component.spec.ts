import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DayCardComponent } from './day-card.component';

describe('DayCardComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DayCardComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DayCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(DayCardComponent);
    fixture.componentRef.setInput('entry', {
      weekday: 'Pon',
      date: new Date(2026, 10, 2),
      inMonth: true,
      day: {
        actions: [{ from: '09:00', to: '10:30', workType: 'meeting' }],
        collaborationRecords: [],
        extra: {},
        workFrom: '09:00',
        workTo: '10:30'
      }
    });
    fixture.componentRef.setInput('config', {
      timeResolution: 'minute',
      workTypes: [{ id: 'meeting', name: 'Spotkanie', attributes: [] }],
      dayFields: [],
      collaborationRecords: { attributes: [] }
    });
    fixture.detectChanges();
  });

  it('renders the day label and calculated duration', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Pon 02');
    expect(text).toContain('1:30 h');
  });

  it('emits a change when the day is collapsed', () => {
    const changed = vi.fn();
    fixture.componentInstance.collapsedChange.subscribe(changed);
    fixture.nativeElement.querySelector('.day-toggle').click();

    expect(changed).toHaveBeenCalledOnce();
  });
});