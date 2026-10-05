# Repository Guidelines

## Project Structure & Module Organization

`main.go` initializes the Wails v3 desktop app and binds Go services. Backend logic lives in `internal/`, grouped by feature: prayer calculations, scheduling, notifications, audio, settings, and location. React/TypeScript code lives in `frontend/src/`, with `pages/`, reusable `components/`, `hooks/`, and Zustand state in `store/`. `frontend/bindings/` contains generated Wails bindings; regenerate these instead of editing them manually.

`assets/` holds icons, `internal/audio/` bundles adhan recordings, and `preview/` contains screenshots. `build/` contains platform tasks and packaging configuration; binaries go to `bin/`. Installation scripts live in `scripts/`.

## Build, Test, and Development Commands

Use Go 1.26.0 as declared in `go.mod`, the Wails v3 CLI, and pnpm. CI uses Node.js 24 and pnpm 12.3.4. Install native platform prerequisites described in `README.md`.

Run from the repository root:

- `pnpm --dir frontend install`: install frontend dependencies.
- `wails3 task dev`: start the backend, Vite, and desktop app together.
- `wails3 task build`: build for the current platform.
- `wails3 task package`: create platform packages.
- `pnpm --dir frontend build`: type-check and build frontend assets.
- `pnpm --dir frontend typecheck`: check TypeScript without emitting files.
- `pnpm --dir frontend format:check`: check Prettier formatting; use `format` to apply it.
- `go test ./...`: run Go tests once added; requires frontend assets and native build dependencies.

## Coding Style & Naming Conventions

Format Go with `gofmt`; use lowercase package names and exported PascalCase identifiers. Keep platform-specific implementations in files such as `autostart_windows.go`.

Follow frontend Prettier settings: two-space indentation, single quotes, semicolons, trailing commas, and a 120-character print width. Use PascalCase component filenames and camelCase functions and variables. Use `@/…` for imports from `frontend/src/`; use `@bindings/…`, `@assets/…`, or `@frontend/…` for generated bindings, shared assets, and frontend-root files. With MUI 9, use `sx` for system styles and `slotProps` for component slots. Keep translations in `frontend/src/i18n/locales/`; register new locales in `i18n/index.ts`.

## Testing Guidelines

No automated test suite, frontend test runner, or coverage threshold is currently configured. Add Go regression tests beside affected code as `*_test.go`, using `testing` and `TestXxx` names. Before submitting, run relevant build, type, and formatting checks. Manually verify affected prayer times, timezones, reminders, audio, and settings persistence; use the Test Tools page for reminder checks.

## Commit & Pull Request Guidelines

History uses concise subjects with `fix:`, `feat:`, and `refactor:` prefixes, plus `bump version to X.Y.Z` release commits. Follow that pattern and keep commits focused. PRs should explain the behavior change, link relevant issues, list validation and platforms tested, and include screenshots for UI changes.
