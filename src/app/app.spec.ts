import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<App>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.componentInstance.retryLoad();
    fixture.detectChanges();
  });

  it('shows the calendar after loading local data', () => {
    expect(fixture.nativeElement.querySelector('app-calendar-view')).not.toBeNull();
  });

  it('opens the configuration feature from the options menu', () => {
    fixture.nativeElement.querySelector('.toolbar-menu > button').click();
    fixture.detectChanges();
    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.includes('Konfiguracja'))
      ?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-configuration-page')).not.toBeNull();
  });
});