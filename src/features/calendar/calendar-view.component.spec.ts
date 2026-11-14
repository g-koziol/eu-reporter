import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CalendarViewComponent } from './calendar-view.component';

describe('CalendarViewComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CalendarViewComponent>>;
  const day = {
    actions: [{ from: '09:00', to: '10:00', workType: 'meeting' }],
    collaborationRecords: [],
    extra: {},
    workFrom: '09:00',
    workTo: '10:00'
  };
  const entry = {
    key: '2026-11-02',
    date: new Date(2026, 10, 2),
    day,
    weekday: 'Pon',
    inMonth: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CalendarViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(CalendarViewComponent);
    fixture.componentRef.setInput('monthDays', [entry]);
    fixture.componentRef.setInput('weeks', [[entry]]);
    fixture.componentRef.setInput('config', {
      cardsPerRow: 2,
      timeResolution: 'minute',
      workTypes: [{ id: 'meeting', name: 'Spotkanie', attributes: [] }],
      dayFields: [],
      collaborationRecords: { attributes: [] }
    });
    fixture.componentRef.setInput('today', entry.key);
    fixture.detectChanges();
  });

  it('renders the day navigation and day card', () => {
    expect(fixture.nativeElement.querySelector('.day-pill')?.textContent).toContain('Pon');
    expect(fixture.nativeElement.querySelector('app-day-card')).not.toBeNull();
  });

  it('emits calendar actions to the parent', () => {
    const batchRequested = vi.fn();
    const dayCollapsed = vi.fn();
    fixture.componentInstance.batchRequested.subscribe(batchRequested);
    fixture.componentInstance.dayCollapsed.subscribe(dayCollapsed);

    fixture.nativeElement.querySelector('.calendar-toolbar button').click();
    fixture.nativeElement.querySelector('.day-toggle').click();

    expect(batchRequested).toHaveBeenCalledOnce();
    expect(dayCollapsed).toHaveBeenCalledWith(day);
  });
});