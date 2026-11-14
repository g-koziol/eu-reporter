import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReporterStateService } from './reporter-state.service';

describe('ReporterStateService', () => {
  let state: ReporterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ReporterStateService] });
    state = TestBed.inject(ReporterStateService);
    state.currentMonth = '2026-11';
    state.selectedProfileId = state.config.defaultProfileId;
    state.selectedProjectId = state.config.defaultProjectId;
  });


  it('resolves effective settings from project, profile, and global defaults', () => {
    state.selectedProfile.config.timeResolution = '30m';
    state.selectedProject.config.timeResolution = 'hour';
    state.selectedProject.config.workFrom = '10:00';

    expect(state.effectiveConfig.timeResolution).toBe('hour');
    expect(state.effectiveConfig.workFrom).toBe('10:00');
  });

  it('creates month day records and applies batch entries to matching weekdays', () => {
    state.applyBatch({
      workType: state.effectiveConfig.workTypes[0].id,
      resolution: 'minute',
      workFrom: '09:00',
      workTo: '10:00',
      description: 'Planowanie',
      notes: '',
      weekdays: [0]
    });

    expect(state.totalActions).toBe(5);
    expect(state.allMonthDays.every(({ day }) => Array.isArray(day.actions))).toBe(true);
    expect(state.totalMinutes).toBe(300);
  });

  it('rejects malformed imported month data without replacing the current database', () => {
    const currentDatabase = state.db;

    expect(() => state.replaceDatabase({
      config: state.config,
      months: {
        [state.currentMonth]: {
          [state.selectedProfileId as string]: {
            [state.selectedProjectId as string]: { days: [] }
          }
        }
      }
    })).toThrow('Nieprawidłowa struktura danych miesięcznych');
    expect(state.db).toBe(currentDatabase);
  });

  it('initializes missing days when importing an otherwise valid month bucket', () => {
    const incoming = {
      config: state.config,
      months: {
        [state.currentMonth]: {
          [state.selectedProfileId as string]: {
            [state.selectedProjectId as string]: {}
          }
        }
      }
    };

    expect(() => state.replaceDatabase(incoming)).not.toThrow();
    expect(state.dayFor(`${state.currentMonth}-01`).actions).toEqual([]);
  });
});