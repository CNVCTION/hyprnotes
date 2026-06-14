# hyprnotes — Copilot Instructions

A single-file Node.js/TypeScript CLI notepad with a TUI. Notes are plain `.txt` files in `~/notes/`. No AI, no models, no frameworks beyond `@earendil-works/pi-tui` and `chalk`.

## Commands

```bash
npm install          # install deps
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm run dev          # tsc --watch (rebuild on save)
```

There is **no test suite and no project-local linter**. CI runs `github/super-linter` (`VALIDATE_ALL_CODEBASE: false`, so only changed files) and CodeQL. TypeScript itself acts as the lint via `strict: true` in `tsconfig.json`.

For a smoke test after changes:
```bash
npm run build && node dist/index.js --help
node dist/index.js list   # exercises storage helpers without TUI
```

## Architecture

Everything lives in `src/index.ts` (~700 lines). Top-to-bottom layout:

- **Config constants** — `NOTES_DIR` (`~/notes`), `SESSION_FILE` (`~/notes/.notes-session.json`), `VERSION`.
- **`SLASH_COMMANDS`** — the source of truth for the `/` menu. Each entry is a `SelectItem` with `value`/`label`/`description`. To add a command: add an entry here and a `case` in `NotesApp.dispatchCommand`.
- **Theme** — `chalk`-based color helpers (`accent`, `muted`, `success`, `warning`, `error`, `border`) and the `selectListTheme` / `editorTheme` objects passed to pi-tui.
- **Note storage** — pure async helpers: `listNoteFiles`, `readNote`, `writeNote`, `loadSession`, `saveSession`, plus `generateTitle` (slug from first non-empty line, max 40 chars, defaults to `untitled`).
- **`SlashAutocomplete`** — implements pi-tui's `AutocompleteProvider`. Filters `SLASH_COMMANDS` by case-insensitive `startsWith` on the joined buffer; `applyCompletion` replaces the current line with the full command value.
- **`NotesApp`** — the TUI controller. Holds `tui`, `editor`, header/status `Text` components, and the `overlayContainer`. Methods are grouped by concern: init, status, global input, overlay/slash menu, title input, file selector, save, quit.
- **`main()`** — argv handling (`list`/`ls`, `--help`/`-h`, else start TUI) + `SIGINT` handler that calls `tui.stop()`.

### TUI layout

`headerText` → `Spacer(1)` → `statusText` → `editor` → `overlayContainer`. Overlays are built with `buildOverlay(title, body, help)` which produces a `Container` of `Text(title)` + `Spacer` + body + optional muted help line. `showOverlay` clears `overlayContainer`, adds the frame, and focuses the interactive child; `dismissOverlay` reverses it and refocuses the editor.

### Key flow: slash command → action

1. `handleGlobalInput` sees `/` on empty buffer → `showSlashMenu()` opens a `SelectList` overlay of `SLASH_COMMANDS`.
2. `menu.onSelect` → `dismissOverlay()` → `dispatchCommand(value)`.
3. `dispatchCommand` (a `switch` on the command string) calls the right method: `showTitleInput("new" | "save")`, `showFileSelector("Load Note" | "Notes", callback)`, `handleSave`, or `handleQuit`.

### Key flow: dirty-quit guard

`handleQuit` checks `this.dirty`. If dirty, `showQuitConfirm` opens a 3-item `SelectList` (`save` / `discard` / `cancel`). `save` calls `autoSave` (which generates a filename from `generateTitle` when `currentFile` is unset) then `tui.stop() + process.exit(0)`. `Ctrl+C` only quits when the buffer is empty; otherwise it falls through to the editor.

### Session persistence

`loadSession()` runs in `NotesApp.init()` and tolerates a missing/corrupt `.notes-session.json` (returns `{}`). After every successful save/load, `saveSession({ currentFile })` rewrites the file. If the persisted file was deleted, the catch in `init` silently starts fresh.

## Conventions

- **One-file project.** All source lives in `src/index.ts`. Don't split into modules without a strong reason — there's no current build complexity to justify it.
- **Async helpers at module scope** (storage + session) return `Promise`s and call `ensureNotesDir()` themselves. Methods on `NotesApp` are mostly thin wrappers that mutate `currentFile` / `dirty` / `lastSavedContent` and call `updateStatus()` + `tui.requestRender()`.
- **Overlay pattern is uniform.** Any new modal (selector, input, notice) goes through `buildOverlay` + `showOverlay` + a `dismissOverlay` on cancel/select. `showNotice` is the only one that registers a one-shot input listener and immediately calls `disposable()` after dismissing.
- **Global key handling happens before focused components.** `tui.addInputListener` returns `{ consume: true }` to swallow the key. If the overlay is showing, non-shortcut keys are passed through (`return undefined`) so the focused overlay sees them.
- **Slash commands are the extension point.** Add a new in-app command by extending `SLASH_COMMANDS` and adding a `case` in `dispatchCommand`. Keep command strings lowercase and prefixed with `/`.
- **Title → filename.** `generateTitle` is the only place that slugifies note titles. New save flows should reuse it for consistency (auto-save does; manual save with an empty buffer does not — be aware).
- **No new top-level dependencies.** `package.json` lists only `@earendil-works/pi-tui` and `chalk`. Anything that needs DOM/AI/HTTP almost certainly doesn't belong here.
- **CI uses Node 20 and 22** (`.github/workflows/node.js.yml`). The `install.sh` script requires Node ≥ 18.
- **`.npmignore`** excludes `src/`, `.github/`, `node_modules/`, git metadata, and maps — the published package is `dist/` + `README.md` + `LICENSE` only.
