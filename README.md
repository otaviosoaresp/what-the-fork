# What The Fork

A desktop Git client focused on branch comparison and diff visualization. Built with Electron, React, and TypeScript.

![License](https://img.shields.io/github/license/otaviosoaresp/what-the-fork)

## Features

- **Branch Comparison** - Compare any two branches with a clean, GitHub-style interface
- **Diff Visualization** - Split and unified view modes with syntax highlighting
- **Branch Management** - Create, checkout, and delete branches
- **Favorites** - Mark frequently used branches as favorites for quick access
- **Search & Filter** - Quickly find branches and files
- **File Navigation** - Navigate between changed files with keyboard-friendly controls
- **Staging Area** - Stage, unstage, and commit changes
- **Remote Operations** - Fetch, pull, and push with visual feedback

## Screenshots

<img width="1710" height="1336" alt="image" src="https://github.com/user-attachments/assets/22f61db3-308d-4dd3-97cd-48e7909648fe" />

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/otaviosoaresp/what-the-fork.git
cd what-the-fork

# Set the correct node version
nvm use

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Quick Run (Linux, AppImage)

Helper scripts build, launch and update a portable AppImage without touching
the system package manager.

```bash
./update.sh             # git pull + npm ci (if needed) + rebuild AppImage
./update.sh --skip-pull # rebuild only, skip git pull (e.g. with local edits)
./run.sh                # launch the latest AppImage (builds it if missing)
./install-desktop.sh    # register app in the system menu with icon (run once)
```

What each script does:

- **`update.sh`** — refuses to run if the working tree is dirty (use
  `--skip-pull` to bypass), pulls `origin`, runs `npm ci` only when
  `package-lock.json` changed, then runs `npm run build:appimage`. Removes
  stale AppImages and refreshes the stable symlink
  `release/what-the-fork.AppImage` to point at the new build.
- **`run.sh`** — locates the AppImage (preferring the symlink), makes it
  executable and launches it. Falls back to `--appimage-extract-and-run` if
  the host is missing `libfuse2`.
- **`install-desktop.sh`** — copies the icon to
  `~/.local/share/icons/hicolor/512x512/apps/` and writes a `.desktop` entry
  to `~/.local/share/applications/`, so the app shows up in the system
  launcher. The entry points at the stable symlink, so you only run this
  once — future `./update.sh` runs keep working without re-registering.

Typical flow on a fresh clone:

```bash
nvm use
npm install
./update.sh --skip-pull   # first build
./install-desktop.sh      # optional: add to system menu
```

After that, `./update.sh` keeps the local AppImage in sync with the latest
commits on the current branch.

To uninstall the menu entry:

```bash
rm ~/.local/share/applications/what-the-fork.desktop
rm ~/.local/share/icons/hicolor/512x512/apps/what-the-fork.png
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron |
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Git | CLI (spawn) |

## Usage

1. Open the application
2. Select a Git repository folder
3. Click on a branch to set it as the **base** (shown in green)
4. Click on another branch to compare (shown in blue)
5. View the diff and navigate between changed files

### Branch Comparison

The comparison header shows:
- **compare** (blue) - Source branch with changes
- **base** (green) - Target branch where changes would be merged

Use the swap button to invert the comparison direction.

## Development

```bash
# Start development server
npm run dev

# Type check
npm run typecheck

# Build application
npm run build
```

## Contributing

Contributions are welcome! Feel free to open issues and pull requests.

## License

[MIT](LICENSE)
