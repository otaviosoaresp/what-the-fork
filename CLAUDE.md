# CLAUDE.md

Project notes for Claude Code (and other AI agents) working on this repo.

## Project

**What the Fork** — Electron + React + TypeScript desktop Git client.

- Runtime: Electron 40, Node ≥ 22 (`.nvmrc`).
- Frontend: React 19, Vite 7, Tailwind 4, Zustand 5, Monaco editor.
- Main process: `electron/` (compiled via `tsc -p tsconfig.node.json` to
  `dist-electron/`).
- Renderer: `src/` (built by Vite to `dist/`).
- Packaging: `electron-builder` driven by `electron-builder.json`.
  Linux targets: `AppImage` and `pacman`.

## Local run / update flow (Linux)

The repo ships three helper scripts that wrap `electron-builder` so users can
build, launch and update a portable AppImage without `sudo` and without
touching the system package manager.

| Script | Purpose |
|--------|---------|
| `update.sh` | git pull, `npm ci` only if `package-lock.json` changed, build AppImage, refresh symlink |
| `run.sh` | Launch the AppImage (builds via `update.sh --skip-pull` if missing) |
| `install-desktop.sh` | Register a `.desktop` entry + icon under `~/.local/share/` so the app shows up in the system menu |

Important details when modifying these scripts:

- `update.sh` aborts on a dirty working tree unless `--skip-pull` is passed.
  This protects users from clobbering local changes during a pull.
- `update.sh` hashes `package-lock.json` into
  `node_modules/.update-lock-hash` and skips `npm ci` when the hash matches.
  `npm ci` deletes `node_modules` every run — running it unconditionally
  makes updates painfully slow.
- `update.sh` removes old AppImages from `release/` before building, then
  creates a stable relative symlink `release/what-the-fork.AppImage` →
  `What the Fork-<version>.AppImage`. Keep this symlink — the desktop entry
  references it, so a rebuild does not invalidate the menu shortcut.
- `run.sh` prefers the symlink, falls back to the newest AppImage by mtime,
  and retries with `--appimage-extract-and-run` if the first launch fails
  (newer kernels often lack `libfuse2`).
- `install-desktop.sh` writes the desktop entry with `Exec="<absolute path
  to symlink>" %U` and `Icon=what-the-fork`. The icon is copied to
  `hicolor/512x512/apps/` to satisfy the freedesktop spec.
- The npm script `build:appimage` skips the `pacman` target so the helper
  flow does not require root.

## NPM scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server only (renderer) |
| `npm run dev:electron` | Vite + Electron with HMR (`scripts/electron-dev.js`) |
| `npm run build:electron` | Compile main process TypeScript to `dist-electron/` |
| `npm run build` | Full build: tsc + vite + main process + electron-builder (all targets) |
| `npm run build:appimage` | Same as `build` but only the Linux AppImage target |
| `npm run preview` | Vite preview of the built renderer |

## House rules for changes

- TypeScript first: prefer concrete types over `any` / `unknown` / `var`.
- No comments in source unless the *why* is non-obvious; refactor into named
  functions instead of leaving prose behind.
- No emojis in code, commits, PRs, or docs unless explicitly requested.
- Do not add `Co-Authored-By: Claude` trailers to commits.
- When touching `update.sh` / `run.sh` / `install-desktop.sh`, run
  `bash -n` on them and re-test the full flow (`./update.sh --skip-pull`
  followed by `./run.sh`) before claiming the work is done.

## Distribution targets

`electron-builder.json` declares:

- Linux: AppImage, pacman.
- macOS: dmg.
- Windows: nsis.

Only the Linux helper flow is wired up to the shell scripts — the other
targets still require the appropriate host OS and tooling.
