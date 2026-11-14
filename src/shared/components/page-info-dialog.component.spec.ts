import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultPageInfo } from '../../core/config/defaults.js';
import { PageInfoDialogComponent } from './page-info-dialog.component';

describe('PageInfoDialogComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PageInfoDialogComponent>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PageInfoDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(PageInfoDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('pageInfo', defaultPageInfo());
    fixture.detectChanges();
  });

  it('renders the page summary and information cards', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"] h3')?.textContent).toBe('Informacje o stronie');
    expect(fixture.nativeElement.querySelectorAll('.page-info-item')).toHaveLength(3);
  });

  it('emits close when the close button is pressed', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    fixture.nativeElement.querySelector('[aria-label="Zamknij"]').click();

    expect(closed).toHaveBeenCalledOnce();
  });
});