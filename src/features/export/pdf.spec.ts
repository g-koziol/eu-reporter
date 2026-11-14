import { describe, expect, it } from 'vitest';
import { buildPdfDocumentTitle } from './pdf.js';

describe('buildPdfDocumentTitle', () => {
  it('combines project, profile, month, and ISO timestamp with safe separators', () => {
    const context = {
      currentMonth: '2026-11',
      getSelectedProject: () => ({ name: 'Żółć / Projekt & Co.' }),
      getSelectedProfile: () => ({ name: 'Anna Maria (główny)' })
    };

    const title = buildPdfDocumentTitle(context, new Date('2026-11-14T12:34:56.789Z'));

    expect(title).toBe('Żółć_Projekt_Co_Anna_Maria_główny_Raport_2026_11_2026_11_14T12_34_56_789Z');
    expect(title).not.toMatch(/[\s\-/.&()]/);
  });

  it('uses fallback labels when profile or project names are missing', () => {
    const context = {
      currentMonth: '2026-11',
      getSelectedProject: () => null,
      getSelectedProfile: () => null
    };

    expect(buildPdfDocumentTitle(context, new Date('2026-11-14T12:34:56.789Z')))
      .toBe('Projekt_Profil_Raport_2026_11_2026_11_14T12_34_56_789Z');
  });
});