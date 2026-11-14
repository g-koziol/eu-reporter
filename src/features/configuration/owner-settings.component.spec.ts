import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultLabels, createProfile } from '../../core/config/defaults.js';
import { OwnerSettingsComponent } from './owner-settings.component';

describe('OwnerSettingsComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OwnerSettingsComponent>>;
  const owner = createProfile();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OwnerSettingsComponent] }).compileComponents();
    fixture = TestBed.createComponent(OwnerSettingsComponent);
    fixture.componentRef.setInput('owner', owner);
    fixture.componentRef.setInput('labels', createDefaultLabels());
    fixture.componentRef.setInput('kind', 'profile');
    fixture.detectChanges();
  });

  it('adds a work type and emits a change', () => {
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    const initialCount = owner.config.workTypes.length;

    const addWorkTypeButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.includes('Dodaj typ wpisu'));
    addWorkTypeButton?.click();

    expect(owner.config.workTypes).toHaveLength(initialCount + 1);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('keeps built-in day fields non-removable', () => {
    expect(fixture.componentInstance.builtinField('area')).toBe(true);
    expect(fixture.componentInstance.builtinField('custom')).toBe(false);
  });
});