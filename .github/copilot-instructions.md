# Repository instructions for GitHub Copilot

## Project overview
- `index.html` is the Angular CLI document entry point; application markup and bootstrap are under `src/app/`.
- `src/legacy-app.js` currently preserves the existing imperative UI behavior while it is hosted by Angular.
- `src/storage.js` persists the application database to IndexedDB and migrates existing localStorage data.
- `example-config-data.json` shows the expected import/export data shape used by the app.
- The application UI and labels are in Polish, so keep user-facing text in Polish unless a task explicitly requires otherwise.

## Change guidelines
- Prefer small, focused edits that preserve existing user-facing workflows.
- Reuse existing helpers and patterns from `src/` instead of introducing extra dependencies.
- Preserve JSON compatibility for existing data keys such as `config`, `profiles`, `projects`, `months`, `days`, and `actions`.
- Keep configuration defaults aligned across the app and example data when changing work time, work types, or day fields.

## Validation
- Use `npm run build` to validate the Angular application.
- For changes to persistence, verify localStorage migration, IndexedDB reload persistence, and unchanged JSON import/export data.
