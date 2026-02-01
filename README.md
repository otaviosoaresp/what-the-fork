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

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
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
