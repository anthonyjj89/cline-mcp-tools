# Examples Directory

This directory contains example usage of the Cline Chat Reader MCP server.

## Directory Structure

- `git-examples/`: Examples for Git analysis functionality
- `vscode-examples/`: Examples for VS Code monitoring functionality
- `time-examples/`: Examples for time utilities

## Git Examples

Examples demonstrating how to use the Git analysis functionality:

- Detecting unpushed commits
- Analyzing Git diffs
- Checking for uncommitted changes
- Retrieving file history

## VS Code Examples

Examples demonstrating how to use the VS Code monitoring functionality:

- Monitoring workspace changes
- Detecting recently opened workspaces
- Analyzing workspace settings
- Tracking file modifications

## Time Examples

Examples demonstrating how to use the time utilities:

- Formatting timestamps
- Calculating time differences
- Working with time zones
- Human-readable time representations

## Running Examples

You can run examples directly:

```bash
node examples/git-examples/unpushed-commits-example.js
```

Or use the npm scripts:

```bash
# Run Git examples
npm run example:git

# Run Time examples
npm run example:time

# Run VS Code examples
npm run example:vscode

# Run all examples
npm run examples
```

## Creating New Examples

If you'd like to create a new example:

1. Create a new JavaScript file in the appropriate subdirectory
2. Include clear comments explaining what the example demonstrates
3. Use descriptive variable names
4. Include console.log statements to show the output
5. Add error handling where appropriate
