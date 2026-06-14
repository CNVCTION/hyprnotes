# hyprnotes — Agent instructions

Single-file Node.js/TypeScript CLI TUI notepad. Plain `.txt` files in `~/notes/`.

## Commands

```bash
npm install          # install deps
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm run dev          # tsc --watch
```

**No test suite exists.** No test framework, no test files, no test script in `package.json`.

Smoke test after changes:
```bash
npm run build && node dist/index.js --help
node dist/index.js list
```

No project-local linter or formatter. `tsc` with `strict: true` is the only static check you get.

## Key facts

- **One source file:** `src/index.ts` (~700 lines). Do not split without strong reason.
- **Dependencies only:** `@earendil-works/pi-tui` (TUI library) and `chalk` (colors). No other runtime deps.
- **Published as** `hyprnotes` on npm, CLI entry: `dist/index.js` with `#!/usr/bin/env node` shebang.
- **Notes storage:** `~/notes/` directory, session state in `~/notes/.notes-session.json`.
- **CI** runs `npm ci && npm run build` on Node 20 and 22 (`.github/workflows/node.js.yml`).
- **Publish** via GitHub Releases → `publish.yml` (uses `--provenance`).

## Architecture

- `SLASH_COMMANDS` array (`src/index.ts:42`) is the source of truth for the `/` menu — add entry here + `case` in `dispatchCommand`.
- `generateTitle` (`src/index.ts`) slugifies the first non-empty line → filename (max 40 chars, defaults to `untitled`). All new save flows should reuse it.
- Overlay pattern: `buildOverlay` + `showOverlay` + `dismissOverlay` on cancel/select.
- Global key handling in `handleGlobalInput` — returns `{ consume: true }` for handled shortcuts, `undefined` to pass through to focused component.
- Non-interactive `list`/`ls` and `--help`/`-h` handled in `main()` before TUI starts.

## See also

`.github/copilot-instructions.md` — more detailed architecture walkthrough and conventions.
