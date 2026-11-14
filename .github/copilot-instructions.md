# Repository instructions for GitHub Copilot

## Project overview
- `index.html` is the Angular CLI document entry point; application markup and bootstrap are under `src/app/`.
- `src/app/app.ts` and `src/app/app.html` are the root coordinator and application shell.
- `src/core/` owns configuration normalization, application state, and IndexedDB persistence.
- `src/features/` contains the app shell, calendar/day cards, configuration, batch-entry, dictionaries, data-management, and export features. Keep feature UI and its tests together.
- `src/shared/` contains reusable UI and cross-feature helpers.
- `tests/e2e/` contains Playwright browser workflows; `*.spec.ts` files beside source cover component, service, and persistence behavior.
- `example-config-data.json` shows the expected import/export data shape used by the app.
- The application UI and labels are in Polish, so keep user-facing text in Polish unless a task explicitly requires otherwise.

## Change guidelines
- Prefer small, focused edits that preserve existing user-facing workflows.
- Reuse existing helpers and patterns from `src/core/`, `src/features/`, and `src/shared/` instead of introducing extra dependencies.
- Preserve JSON compatibility for existing data keys such as `config`, `profiles`, `projects`, `months`, `days`, and `actions`.
- Project dictionaries are keyed by `projectId` and stable field keys; keep autocomplete and the Słowniki editor on the same field-key convention.
- Keep configuration defaults aligned across the app and example data when changing work time, work types, or day fields.
- Keep IndexedDB's numeric version for object-store upgrades separate from the semantic `schemaVersion` in `metadata`.
- For a data-schema change, bump `CURRENT_SCHEMA_VERSION`, add an ordered `SCHEMA_MIGRATIONS` procedure, and preserve the pre-migration backup named `<database>_backup_<version>`.
- When changing dictionary fields or storage, preserve project isolation, full-text matching over values, and migration seeding from existing text entries.
- Preserve and test migration from the prior `appData` record; keep import/export on the existing JSON shape.
- Keep browser tests isolated from developer data; Playwright uses its own browser contexts and a separate local server.

## Validation
- Use `npm run build` to validate the Angular application.
- Use `npm test` for component, state, and persistence tests.
- Use `npm run test:e2e` for Playwright workflows covering real browser interactions and reload persistence.
- For persistence changes, verify the v1 `appData` migration, stored semantic version, versioned backup contents, IndexedDB reload persistence, and unchanged JSON import/export data.
