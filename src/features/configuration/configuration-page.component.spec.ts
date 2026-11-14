import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultConfig, createDefaultLabels } from '../../core/config/defaults.js';
import { ConfigurationPageComponent } from './configuration-page.component';

describe('ConfigurationPageComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigurationPageComponent>>;
  let config: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfigurationPageComponent] }).compileComponents();
    fixture = TestBed.createComponent(ConfigurationPageComponent);
    config = createDefaultConfig();
    fixture.componentRef.setInput('config', config);
    fixture.componentRef.setInput('labels', createDefaultLabels());
    fixture.detectChanges();
  });

  it('creates a profile and emits its selected id', () => {
    const selected = vi.fn();
    fixture.componentInstance.profileSelected.subscribe(selected);

    const addProfileButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.includes('Dodaj profil'));
    addProfileButton?.click();

    expect(config.profiles).toHaveLength(2);
    expect(config.defaultProfileId).toBe(config.profiles[1].id);
    expect(selected).toHaveBeenCalledWith(config.defaultProfileId);
  });

  it('renders reusable profile and project editors', () => {
    expect(fixture.nativeElement.querySelectorAll('app-owner-settings')).toHaveLength(2);
  });
});