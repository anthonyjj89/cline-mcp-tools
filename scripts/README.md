# Scripts Directory

This directory contains various scripts used for development, setup, and maintenance of the Cline Chat Reader MCP server.

## Directory Structure

- `dev/`: Development scripts
- `setup/`: Setup and installation scripts

## Development Scripts

### `complete-reorganization.sh`

Master script that runs all reorganization steps in sequence:
1. Migrates files from claude-dev-mcp
2. Cleans up duplicate directories from home folder
3. Updates copy-js-files.js location in package.json
4. Creates a backup of claude-dev-mcp
5. Optionally deletes claude-dev-mcp

Usage:
```bash
npm run reorganize
```

### `migrate-claude-dev-mcp.sh`

Copies important files from the claude-dev-mcp directory to the Cline-Chat-Reader project.

Usage:
```bash
npm run migrate
```

### `cleanup-home-directory.sh`

Removes duplicate directories from the home folder that were accidentally created during reorganization.

Usage:
```bash
npm run cleanup
```

### `backup-and-delete-claude-dev-mcp.sh`

Creates a backup of the claude-dev-mcp directory and optionally deletes it.

Usage:
```bash
npm run backup-and-delete
```

### `copy-js-files.js`

Copies JavaScript files that don't have TypeScript equivalents to the build directory.
Used as part of the build process.

Usage:
```bash
npm run build
```

### `restart-claude-desktop.sh`

Restarts the Claude Desktop application to apply changes.

### `update-claude-desktop-config.sh`

Updates the Claude Desktop configuration file.

### `check-mcp-server.js`

Checks if the MCP server is running correctly.

## Setup Scripts

### `install-dependencies.sh`

Installs all dependencies required for the project.

### `setup.sh`

Sets up the project for development.

## Running Scripts

All scripts can be run using npm:

```bash
npm run <script-name>
```

For example:
```bash
npm run reorganize
```

Or they can be run directly:

```bash
bash scripts/dev/complete-reorganization.sh
```
