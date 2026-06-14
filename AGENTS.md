# hyprnotes — Agent instructions

Single-file Node.js/TypeScript CLI TUI notepad. Plain `.txt` files in `~/notes/`.

## Commands

```bash
npm install          # install deps
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm run dev          # tsc --watch
```

**No test suite exists.** No test framework, no test files. `npm test` is a placeholder that exits 0.

Smoke test after changes:
```bash
npm run build && node dist/index.js --help
node dist/index.js list
```

No project-local linter or formatter. `tsc` with `strict: true` is the only static check you get.

`package.json` has a `"prepare": "test -d src && npm run build || true"` script. It auto-builds when installing from a GitHub tarball (`npm install -g <tarball_url>`) but is a no-op when installing from the npm registry (which ships pre-built `dist/`).

## Key facts

- **One source file:** `src/index.ts` (~700 lines). Do not split without strong reason.
- **Dependencies only:** `@earendil-works/pi-tui` (TUI library) and `chalk` (colors). No other runtime deps.
- **Published as** `hyprnotes` on npm, CLI entry: `dist/index.js` with `#!/usr/bin/env node` shebang.
- **Notes storage:** `~/notes/` directory, session state in `~/notes/.notes-session.json`.
- **CI** runs `npm ci && npm run build` on Node 20 and 22 (`.github/workflows/node.js.yml`).
- **Publish** via GitHub Releases → `publish.yml` (uses `--provenance`).
- **Homebrew tap:** `brew install cnvction/hyprnotes/hyprnotes`. Formula lives in this repo at `Formula/hyprnotes.rb` and is mirrored to `github.com/CNVCTION/homebrew-hyprnotes`.
- **Curl install:** `curl -sL https://raw.githubusercontent.com/CNVCTION/hyprnotes/master/install.sh | bash` — falls back from npm registry to GitHub release tarball with auto-build.

## Architecture

- `SLASH_COMMANDS` array (`src/index.ts:42`) is the source of truth for the `/` menu — add entry here + `case` in `dispatchCommand`.
- `generateTitle` (`src/index.ts`) slugifies the first non-empty line → filename (max 40 chars, defaults to `untitled`). All new save flows should reuse it.
- Overlay pattern: `buildOverlay` + `showOverlay` + `dismissOverlay` on cancel/select.
- Global key handling in `handleGlobalInput` — returns `{ consume: true }` for handled shortcuts, `undefined` to pass through to focused component.
- Non-interactive `list`/`ls` and `--help`/`-h` handled in `main()` before TUI starts.

## See also

`.github/copilot-instructions.md` — more detailed architecture walkthrough and conventions.
