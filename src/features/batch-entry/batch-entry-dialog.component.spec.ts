import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BatchEntryDialogComponent } from './batch-entry-dialog.component';

describe('BatchEntryDialogComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<BatchEntryDialogComponent>>;
  const config = {
    timeResolution: '30m',
    workFrom: '09:00',
    workTo: '17:00',
    workTypes: [{ id: 'meeting', defaultValues: { from: '09:15', to: '10:15', description: 'Plan', notes: '' } }]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BatchEntryDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(BatchEntryDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('currentMonth', '2026-11');
    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('monthDays', [
      { date: new Date(2026, 10, 2) },
      { date: new Date(2026, 10, 7) }
    ]);
    fixture.detectChanges();
  });

  it('initializes values from the effective work configuration', () => {
    expect(fixture.componentInstance.workFrom).toBe('09:30');
    expect(fixture.componentInstance.description).toBe('Plan');
    expect(fixture.componentInstance.daysCount).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Dodaj wpisy dla 2026-11');
  });

  it('emits the selected values when submitted', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    fixture.nativeElement.querySelector('.modal-actions .primary').click();

    expect(submitted).toHaveBeenCalledWith({
      workType: 'meeting',
      resolution: '30m',
      workFrom: '09:30',
      workTo: '10:30',
      description: 'Plan',
      notes: '',
      weekdays: [0, 1, 2, 3, 4]
    });
  });
});