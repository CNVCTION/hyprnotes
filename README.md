# ✎ notes-cli

> Dead-simple CLI notepad — type, slash-command, save. No AI, no modes, just notes.

`notes` is a terminal notepad with Pi-style TUI: an editor buffer, `/` slash commands with arrow-key selection, and zero configuration. Notes are plain `.txt` files in `~/notes/`.

![notes-cli](https://cnvction.com/projects/clinotes/screenshot.png)

## Install

```bash
# npm (recommended)
npm i -g notes-cli

# curl
curl -sL notescli.sh | bash
```

## Quick Start

```bash
notes           # Start TUI
notes list      # List notes (non-interactive)
notes --help    # Help
```

## In-App Commands

Type `/` when the buffer is empty to open the command menu:

| Command  | Description                     |
|----------|---------------------------------|
| `/new`   | Create a new note               |
| `/load`  | Load an existing note           |
| `/save`  | Save current note               |
| `/list`  | Browse all notes                |
| `/quit`  | Exit (auto-saves if dirty)      |

## Keyboard Shortcuts

| Key      | Action                          |
|----------|---------------------------------|
| `Ctrl+S` | Save                            |
| `Ctrl+Q` | Quit                            |
| `Ctrl+C` | Quit if buffer empty            |
| `Esc`    | Cancel overlay / close menu     |
| `/`       | Open command menu (empty buffer)|

## How It Works

- **Editor** — Full multi-line text editing (arrows, delete, insert, word-wrap).
- **Autocomplete** — Type `/` and get a dropdown of commands with fuzzy matching.
- **Persistent** — Remembers which note you had open. Reopen picks up where you left off.
- **Plain text** — Notes are `~/notes/*.txt`. No database, no lock files, no format.
- **Auto-save** — On quit with unsaved changes, you're prompted to save.

## Use Cases

### VPS / Remote Server

```bash
ssh myserver
notes          # quick jot on a remote machine
```

### Termius / Mobile

```bash
# Works great in Termius and other mobile SSH clients
notes list     # quick list without TUI
```

### Scratch Pad

```bash
echo "Buy milk" >> ~/notes/todo.txt
notes          # open and edit
```

## Architecture

Built on [`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui) — the same TUI library powering [Pi](https://pi.dev) coding agent — stripped of all AI features:

- **Editor** — Pi's `Editor` component (multi-line, autocomplete, clipboard)
- **SelectList** — Pi's dropdown picker (arrow keys, descriptions, scroll)
- **Input** — Pi's single-line input (for title prompts)
- **ProcessTerminal** — Pi's terminal abstraction (raw mode, resize, Kitty protocol)

No React, no Ink, no frameworks. Just Pi's battle-tested TUI primitives.

## Development

```bash
git clone https://github.com/cnvction/notes-cli.git
cd notes-cli
npm install
npm run build
node dist/index.js
```

## License

MIT © [cnvction.com](https://cnvction.com)