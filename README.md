# ✎ hyprnotes

> Dead-simple CLI notepad — type, slash-command, save. No AI, no modes, just notes.

`notes` is a terminal notepad with a minimalist TUI: an editor buffer, `/` slash commands with arrow-key selection, and zero configuration. Notes are plain `.txt` files in `~/notes/`.

![hyprnotes](https://cnvction.com/projects/clinotes/screenshot.png)

## Install

```bash
# npm (recommended)
npm i -g hyprnotes --allow-scripts=koffi
# If `hyprnotes` is not found, add npm global bin to PATH:
# echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# Homebrew
brew install cnvction/hyprnotes/hyprnotes

# curl (any platform)
curl -sL https://raw.githubusercontent.com/CNVCTION/hyprnotes/master/install.sh | bash
```

## Quick Start

```bash
hyprnotes           # Start TUI
hyprnotes list      # List notes (non-interactive)
hyprnotes --help    # Help
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

Built on [`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui) — a lightweight TUI library — stripped of all AI features:

- **Editor** — `Editor` component (multi-line, autocomplete, clipboard)
- **SelectList** — Dropdown picker (arrow keys, descriptions, scroll)
- **Input** — Single-line input (for title prompts)
- **ProcessTerminal** — Terminal abstraction (raw mode, resize, Kitty protocol)

No React, no Ink, no frameworks. Just battle-tested TUI primitives.

## Development

```bash
git clone https://github.com/cnvction/hyprnotes.git
cd hyprnotes
npm install
npm run build
node dist/index.js
```

## License

MIT © [cnvction.com](https://cnvction.com) — [github.com/cnvction/hyprnotes](https://github.com/cnvction/hyprnotes)