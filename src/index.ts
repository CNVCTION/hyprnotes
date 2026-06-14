#!/usr/bin/env node
/**
 * hyprnotes — Dead-simple CLI notepad with minimalist TUI
 *
 * Type text → builds buffer.
 * / → dropdown: new, load, save, list, quit
 * Auto-save on quit. Persistent across sessions.
 * No AI, no models, no providers — just notes.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import chalk from "chalk";
import {
  Container,
  Editor,
  type EditorTheme,
  Input,
  Key,
  matchesKey,
  ProcessTerminal,
  SelectList,
  type SelectListTheme,
  type SelectItem,
  Spacer,
  Text,
  TUI,
  type AutocompleteSuggestions,
  type AutocompleteProvider,
  type Component,
} from "@earendil-works/pi-tui";

// ─── Config ────────────────────────────────────────────────────────────────────

const NOTES_DIR = path.join(os.homedir(), "notes");
const SESSION_FILE = path.join(NOTES_DIR, ".notes-session.json");
const VERSION = "1.0.1";

// ─── Slash Commands ────────────────────────────────────────────────────────────

const SLASH_COMMANDS: SelectItem[] = [
  { value: "/new", label: "/new", description: "Create a new note" },
  { value: "/load", label: "/load", description: "Load an existing note" },
  { value: "/save", label: "/save", description: "Save current note" },
  { value: "/list", label: "/list", description: "List all notes" },
  { value: "/quit", label: "/quit", description: "Exit (auto-saves if dirty)" },
];

// ─── Theme ──────────────────────────────────────────────────────────────────────

const accent = chalk.cyan;
const accentBold = chalk.cyan.bold;
const muted = chalk.dim;
const success = chalk.green;
const warning = chalk.yellow;
const error = chalk.red;
const border = chalk.dim.gray;

const selectListTheme: SelectListTheme = {
  selectedPrefix: (t) => accent("❯ ") + t,
  selectedText: (t) => accent.bold(t),
  description: (t) => muted(t),
  scrollInfo: (t) => muted(t),
  noMatch: (t) => warning(t),
};

const editorTheme: EditorTheme = {
  borderColor: (s: string) => border(s),
  selectList: selectListTheme,
};

// ─── Note Storage ───────────────────────────────────────────────────────────────

interface SessionState {
  currentFile?: string;
}

async function ensureNotesDir(): Promise<void> {
  await fs.mkdir(NOTES_DIR, { recursive: true });
}

async function listNoteFiles(): Promise<string[]> {
  await ensureNotesDir();
  const entries = await fs.readdir(NOTES_DIR);
  return entries
    .filter((f) => f.endsWith(".txt") && !f.startsWith("."))
    .sort();
}

async function readNote(filename: string): Promise<string> {
  return fs.readFile(path.join(NOTES_DIR, filename), "utf-8");
}

async function writeNote(filename: string, content: string): Promise<void> {
  await ensureNotesDir();
  await fs.writeFile(path.join(NOTES_DIR, filename), content, "utf-8");
}

async function loadSession(): Promise<SessionState> {
  try {
    const data = await fs.readFile(SESSION_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveSession(state: SessionState): Promise<void> {
  await ensureNotesDir();
  await fs.writeFile(SESSION_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function generateTitle(content: string): string {
  const first =
    content
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim() ?? "untitled";
  const sanitized = first
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return sanitized || "untitled";
}

// ─── Autocomplete Provider ───────────────────────────────────────────────────────

class SlashAutocomplete implements AutocompleteProvider {
  async getSuggestions(
    lines: string[],
    _cursorLine: number,
    _cursorCol: number,
    _options: { signal: AbortSignal; force?: boolean }
  ): Promise<AutocompleteSuggestions | null> {
    // Build prefix from all lines up to cursor
    const prefix = lines.join("\n");
    if (!prefix.startsWith("/")) return null;

    const q = prefix.toLowerCase();
    return {
      items: SLASH_COMMANDS.filter((c) =>
        c.value.toLowerCase().startsWith(q)
      ).map((c) => ({
        value: c.value,
        label: c.value,
        description: c.description ?? "",
      })),
      prefix,
    };
  }

  applyCompletion(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    item: { value: string },
    _prefix: string
  ): { lines: string[]; cursorLine: number; cursorCol: number } {
    // Replace current line with the command
    const newLines = [...lines];
    newLines[cursorLine] = item.value;
    return {
      lines: newLines,
      cursorLine,
      cursorCol: item.value.length,
    };
  }
}

// ─── Overlay Builder ────────────────────────────────────────────────────────────
// Builds a framed overlay component with title, body, and help footer.

function buildOverlay(
  title: string,
  body: Component,
  help: string
): Container {
  const c = new Container();
  c.addChild(new Text(title, 1, 0));
  c.addChild(new Spacer(1));
  c.addChild(body);
  if (help) {
    c.addChild(new Text(muted(help), 1, 0));
  }
  return c;
}

// ─── App ─────────────────────────────────────────────────────────────────────────

class NotesApp {
  private tui: TUI;
  private editor: Editor;

  // Layout
  private headerText = new Text("", 0, 0);
  private statusText = new Text("", 0, 0);
  private overlayContainer = new Container();

  // State
  private currentFile?: string;
  private dirty = false;
  private lastSavedContent = "";

  // ─── Init ────────────────────────────────────────────────────────────────

  constructor(tui: TUI, editor: Editor) {
    this.tui = tui;
    this.editor = editor;

    // Editor is multi-line: Enter inserts newline, not submit
    this.editor.disableSubmit = true;
    this.editor.setAutocompleteProvider(new SlashAutocomplete());

    // When autocomplete selects a slash command, trigger it
    this.editor.onChange = () => {
      const text = this.editor.getText();
      // If user picked a slash command from autocomplete
      const command = SLASH_COMMANDS.find(
        (c) => c.value === text.trim()
      );
      if (command) {
        this.editor.setText("");
        this.tui.requestRender();
        // Dispatch async
        setImmediate(() => this.dispatchCommand(command.value));
        return;
      }
      this.dirty = true;
      this.updateStatus();
      this.tui.requestRender();
    };

    // Layout: header → spacer → status → editor → overlay
    this.tui.addChild(this.headerText);
    this.tui.addChild(new Spacer(1));
    this.tui.addChild(this.statusText);
    this.tui.addChild(this.editor);
    this.tui.addChild(this.overlayContainer);

    this.tui.setFocus(this.editor);

    // Global input listener: intercept special keys BEFORE they reach editor
    tui.addInputListener((data: string) => {
      return this.handleGlobalInput(data);
    });
  }

  async init(): Promise<void> {
    const session = await loadSession();
    if (session.currentFile) {
      try {
        const content = await readNote(session.currentFile);
        this.currentFile = session.currentFile;
        this.lastSavedContent = content;
        this.editor.setText(content);
        this.dirty = false;
      } catch {
        // File was deleted, start fresh
      }
    }
    this.updateStatus();
    this.tui.requestRender();
  }

  // ─── Status Line ─────────────────────────────────────────────────────────

  private updateStatus(): void {
    const filename = this.currentFile ?? "(new note)";
    const dirtyFlag = this.dirty ? " ●" : "";
    this.headerText.setText(
      accentBold(" ✎ notes") + muted(" — ") + accent(filename) + dirtyFlag
    );
    const text = this.editor.getText();
    const lines = text.split("\n").length;
    const words = text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    this.statusText.setText(
      muted(` ${lines} line${lines !== 1 ? "s" : ""} · ${words} word${words !== 1 ? "s" : ""} · Ctrl+S save · / commands`)
    );
  }

  // ─── Global Input Handler ────────────────────────────────────────────────
  // Runs BEFORE the focused component. Return { consume: true } to swallow.

  private handleGlobalInput(
    data: string
  ): { consume?: boolean; data?: string } | undefined {
    // Esc always dismisses overlay
    if (matchesKey(data, Key.escape)) {
      if (this.overlayContainer.children.length > 0) {
        this.dismissOverlay();
        return { consume: true };
      }
    }

    // Ctrl+Q — quit
    if (matchesKey(data, Key.ctrl("q"))) {
      this.handleQuit();
      return { consume: true };
    }

    // Ctrl+S — save
    if (matchesKey(data, Key.ctrl("s"))) {
      this.handleSave();
      return { consume: true };
    }

    // Ctrl+C — quit if empty buffer
    if (matchesKey(data, Key.ctrl("c"))) {
      if (!this.editor.getText().trim()) {
        this.tui.stop();
        process.exit(0);
      }
    }

    // If overlay is showing, let it handle all other input
    if (this.overlayContainer.children.length > 0) {
      return undefined; // pass to focused overlay component
    }

    // "/" when editor is empty → show slash menu
    if (data === "/" && this.editor.getText().trim() === "") {
      this.editor.setText("");
      this.showSlashMenu();
      return { consume: true };
    }

    return undefined;
  }

  // ─── Overlay Management ──────────────────────────────────────────────────

  private showOverlay(interactive: Component, frame: Component): void {
    this.overlayContainer.clear();
    this.overlayContainer.addChild(frame);
    this.tui.setFocus(interactive);
    this.tui.requestRender();
  }

  private dismissOverlay(): void {
    this.overlayContainer.clear();
    this.tui.setFocus(this.editor);
    this.updateStatus();
    this.tui.requestRender();
  }

  // ─── Slash Menu ──────────────────────────────────────────────────────────

  private showSlashMenu(): void {
    const menu = new SelectList(
      SLASH_COMMANDS,
      SLASH_COMMANDS.length,
      selectListTheme
    );
    menu.onSelect = (item) => {
      this.dismissOverlay();
      this.dispatchCommand(item.value);
    };
    menu.onCancel = () => this.dismissOverlay();

    const frame = buildOverlay(
      accentBold(" Commands"),
      menu,
      "↑↓ navigate · enter select · esc cancel"
    );
    this.showOverlay(menu, frame);
  }

  // ─── Command Dispatch ────────────────────────────────────────────────────

  private async dispatchCommand(cmd: string): Promise<void> {
    switch (cmd) {
      case "/new":
        this.showTitleInput("new");
        break;
      case "/load":
        await this.showFileSelector("Load Note", (f) =>
          this.loadFile(f)
        );
        break;
      case "/save":
        this.handleSave();
        break;
      case "/list":
        await this.showFileSelector("Notes", (f) =>
          this.loadFile(f)
        );
        break;
      case "/quit":
        this.handleQuit();
        break;
    }
  }

  // ─── Title Input ─────────────────────────────────────────────────────────

  private showTitleInput(action: "new" | "save"): void {
    const defaultTitle =
      action === "save"
        ? this.currentFile?.replace(/\.txt$/, "") ??
          generateTitle(this.editor.getText())
        : "";

    const input = new Input();
    input.setValue(defaultTitle);
    input.onSubmit = (value) => {
      this.dismissOverlay();
      this.processTitleSubmit(value, action);
    };
    input.onEscape = () => this.dismissOverlay();

    const label =
      action === "new"
        ? accentBold(" New Note")
        : accentBold(" Save Note");
    const frame = buildOverlay(
      label,
      new Container(),
      ""
    );
    // Build proper layout
    const wrapper = new Container();
    wrapper.addChild(new Text(muted(" Title:"), 1, 0));
    wrapper.addChild(input);

    const frame2 = buildOverlay(label, wrapper, "enter confirm · esc cancel");
    this.showOverlay(input, frame2);
  }

  private async processTitleSubmit(
    title: string,
    action: "new" | "save"
  ): Promise<void> {
    const sanitized = title.trim().replace(/\.txt$/, "");
    if (!sanitized) return;

    const filename = `${sanitized}.txt`;

    if (action === "new") {
      this.currentFile = filename;
      this.editor.setText("");
      this.lastSavedContent = "";
      this.dirty = true;
      await this.autoSave();
    } else {
      this.currentFile = filename;
      await this.saveCurrentNote();
    }
    this.updateStatus();
    this.tui.requestRender();
  }

  // ─── File Selector ───────────────────────────────────────────────────────

  private async showFileSelector(
    title: string,
    onSelect: (filename: string) => Promise<void>
  ): Promise<void> {
    const files = await listNoteFiles();
    if (files.length === 0) {
      this.showNotice("No notes found. Use /new to create one.");
      return;
    }

    const items = await Promise.all(
      files.map(async (f): Promise<SelectItem> => {
        try {
          const content = await readNote(f);
          const preview =
            content.split("\n")[0]?.slice(0, 60) ?? "";
          return {
            value: f,
            label: f.replace(/\.txt$/, ""),
            description: preview,
          };
        } catch {
          return {
            value: f,
            label: f.replace(/\.txt$/, ""),
            description: "",
          };
        }
      })
    );

    const selector = new SelectList(items, 15, selectListTheme);
    selector.onSelect = async (item) => {
      this.dismissOverlay();
      await onSelect(item.value);
    };
    selector.onCancel = () => this.dismissOverlay();

    const frame = buildOverlay(
      accentBold(` ${title}`),
      selector,
      "↑↓ navigate · enter select · esc cancel"
    );
    this.showOverlay(selector, frame);
  }

  private async loadFile(filename: string): Promise<void> {
    try {
      const content = await readNote(filename);
      this.currentFile = filename;
      this.lastSavedContent = content;
      this.editor.setText(content);
      this.dirty = false;
      this.updateStatus();
      this.tui.requestRender();
      await saveSession({ currentFile: filename });
    } catch (err) {
      this.showNotice(`Error loading ${filename}`);
    }
  }

  // ─── Notice ──────────────────────────────────────────────────────────────

  private showNotice(message: string): void {
    const notice = new Text(`  ${message}`, 1, 0);
    const frame = buildOverlay("", notice, "Press any key to dismiss");

    // Dismiss on next key press
    const disposable = this.tui.addInputListener((data: string) => {
      this.dismissOverlay();
      disposable(); // remove listener
      return { consume: true };
    });

    this.showOverlay(notice, frame);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  private handleSave(): void {
    if (!this.currentFile) {
      this.showTitleInput("save");
      return;
    }
    this.saveCurrentNote();
  }

  private async saveCurrentNote(): Promise<void> {
    if (!this.currentFile) {
      this.showTitleInput("save");
      return;
    }
    const content = this.editor.getText();
    await writeNote(this.currentFile, content);
    this.lastSavedContent = content;
    this.dirty = false;
    this.updateStatus();
    this.tui.requestRender();
    await saveSession({ currentFile: this.currentFile });
  }

  private async autoSave(): Promise<void> {
    const content = this.editor.getText();
    if (!this.currentFile) {
      this.currentFile = `${generateTitle(content)}.txt`;
    }
    await writeNote(this.currentFile, content);
    this.lastSavedContent = content;
    this.dirty = false;
    this.updateStatus();
    await saveSession({ currentFile: this.currentFile });
  }

  // ─── Quit ────────────────────────────────────────────────────────────────

  private handleQuit(): void {
    if (this.dirty) {
      this.showQuitConfirm();
    } else {
      this.tui.stop();
      process.exit(0);
    }
  }

  private showQuitConfirm(): void {
    const items: SelectItem[] = [
      { value: "save", label: "Save & Quit", description: "Save current note then exit" },
      { value: "discard", label: "Discard & Quit", description: "Exit without saving" },
      { value: "cancel", label: "Cancel", description: "Go back to editing" },
    ];

    const selector = new SelectList(items, 3, selectListTheme);
    selector.onSelect = async (item) => {
      this.dismissOverlay();
      switch (item.value) {
        case "save":
          await this.autoSave();
          this.tui.stop();
          process.exit(0);
        case "discard":
          this.tui.stop();
          process.exit(0);
        case "cancel":
          break;
      }
    };
    selector.onCancel = () => this.dismissOverlay();

    const frame = buildOverlay(
      warning(" Unsaved changes!"),
      selector,
      "↑↓ navigate · enter select · esc cancel"
    );
    this.showOverlay(selector, frame);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Non-interactive: list
  if (args[0] === "list" || args[0] === "ls") {
    await ensureNotesDir();
    const files = await listNoteFiles();
    if (files.length === 0) {
      console.log(muted("No notes found in ~/notes/"));
    } else {
      for (const f of files) {
        console.log(`  ${accent(f.replace(/\.txt$/, ""))}`);
      }
    }
    process.exit(0);
  }

  // Help
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(`
${accentBold("notes")} ${muted(`v${VERSION}`)} — Dead-simple CLI notepad

${accent("Usage:")}
  notes           Start interactive TUI
  notes list       List all notes (non-interactive)
  notes --help     Show this help

${accent("In-App Commands (type / to open):")}
  /new             Create a new note
  /load            Load an existing note
  /save            Save current note
  /list            Browse all notes
  /quit            Exit

${accent("Keyboard Shortcuts:")}
  Ctrl+S           Save
  Ctrl+Q           Quit
  Ctrl+C           Quit if buffer empty
  Esc              Cancel overlay / close menu
  /                Open command menu (when buffer empty)

Notes are stored as plain text in ${accent("~/notes/")}
`);
    process.exit(0);
    return; // never reached
  }

  // ─── Start TUI ────────────────────────────────────────────────────────────

  await ensureNotesDir();

  const terminal = new ProcessTerminal();
  const tui = new TUI(terminal, true);
  const editor = new Editor(tui, editorTheme, {
    paddingX: 1,
    autocompleteMaxVisible: 5,
  });

  const app = new NotesApp(tui, editor);

  // Graceful shutdown
  process.on("SIGINT", () => {
    tui.stop();
    process.exit(0);
  });

  terminal.setTitle("notes");
  tui.start();

  await app.init();

  // Keep process alive
  process.stdin.resume();
}

main().catch((err) => {
  console.error(error("Fatal:"), err);
  process.exit(1);
});