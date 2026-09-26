# Repository instructions for GitHub Copilot

## Project overview
- `index.html` contains the full application: HTML, CSS, and vanilla JavaScript in one file.
- `example-config-data.json` shows the expected import/export data shape used by the app.
- The application UI and labels are in Polish, so keep user-facing text in Polish unless a task explicitly requires otherwise.

## Change guidelines
- Prefer small, focused edits that keep the current single-file structure intact.
- Reuse existing helpers and patterns from `index.html` instead of introducing frameworks, build tooling, or extra dependencies.
- Preserve JSON compatibility for existing data keys such as `config`, `profiles`, `projects`, `months`, `days`, and `actions`.
- Keep configuration defaults aligned across the app and example data when changing work time, work types, or day fields.

## Validation
- There is currently no dedicated automated test or build setup in this repository.
- For changes to the app, validate with focused manual checks against `index.html` behavior and exported/imported JSON data where relevant.
