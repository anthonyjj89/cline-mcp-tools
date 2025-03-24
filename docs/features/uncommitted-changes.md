# Uncommitted Changes Functionality

This feature adds the ability to identify and analyze all uncommitted changes in a Git repository, including modified, staged, and untracked files. This is particularly useful for understanding the current state of a working directory and what changes are pending to be committed.

## Features

- Detect all modified files in the working directory (unstaged changes)
- Detect all staged files that are ready to be committed
- Detect all untracked files in the repository
- Provide detailed information about each file including its status and diff content
- Generate a summary of the overall uncommitted state

## Implementation

The uncommitted changes functionality is implemented in the following files:

1. `src/utils/git-analyzer.js` - Contains the `getUncommittedChanges` function
2. `src/utils/git-analyzer.d.ts` - TypeScript definitions for the uncommitted changes functionality
3. `src/mcp-server.ts` - MCP server integration with the `get_uncommitted_changes` tool

## Usage

### MCP Tool

The uncommitted changes functionality is exposed as an MCP tool called `get_uncommitted_changes`. This tool can be used from Claude Desktop to get information about uncommitted changes in a Git repository.

```json
{
  "name": "get_uncommitted_changes",
  "arguments": {
    "repoPath": "/path/to/repo"
  }
}
```

### Direct API Usage

You can also use the `getUncommittedChanges` function directly in your code:

```javascript
import { getUncommittedChanges } from './utils/git-analyzer.js';

// Get uncommitted changes
const uncommittedInfo = await getUncommittedChanges('/path/to/repo');

// Check if there are uncommitted changes
if (uncommittedInfo.summary.hasChanges) {
  console.log(`Found ${uncommittedInfo.summary.totalChanges} uncommitted changes`);
  
  // Process modified files
  uncommittedInfo.modified.forEach(file => {
    console.log(`Modified: ${file.path}`);
    console.log(`Diff: ${file.diff}`);
  });
  
  // Process staged files
  uncommittedInfo.staged.forEach(file => {
    console.log(`Staged: ${file.path}`);
    console.log(`Diff: ${file.diff}`);
  });
  
  // Process untracked files
  uncommittedInfo.untracked.forEach(file => {
    console.log(`Untracked: ${file}`);
  });
}
```

## Output Format

The `getUncommittedChanges` function returns an object with the following structure:

```javascript
{
  isGitRepo: true,
  branch: "main",
  summary: {
    hasChanges: true,
    modifiedCount: 2,
    stagedCount: 1,
    untrackedCount: 3,
    deletedCount: 1,
    totalChanges: 7
  },
  modified: [
    {
      path: "src/utils/example.js",
      status: "modified",
      staged: false,
      diff: "diff --git a/src/utils/example.js b/src/utils/example.js\n..."
    },
    {
      path: "README.md",
      status: "modified",
      staged: false,
      diff: "diff --git a/README.md b/README.md\n..."
    }
  ],
  staged: [
    {
      path: "src/index.js",
      status: "modified",
      staged: true,
      diff: "diff --git a/src/index.js b/src/index.js\n..."
    }
  ],
  untracked: [
    "new-file.js",
    "docs/example.md",
    "test/new-test.js"
  ]
}
```

If the repository doesn't have any uncommitted changes, the function will return:

```javascript
{
  isGitRepo: true,
  branch: "main",
  summary: {
    hasChanges: false,
    modifiedCount: 0,
    stagedCount: 0,
    untrackedCount: 0,
    totalChanges: 0
  },
  modified: [],
  staged: [],
  untracked: []
}
```

## Testing

You can test the uncommitted changes functionality using the `test-uncommitted-changes.js` script:

```bash
node test-uncommitted-changes.js /path/to/git/repo
```

This script will:

1. Find the Git repository at the specified path
2. Get all uncommitted changes in the repository
3. Display a summary of the changes
4. Show details for each modified, staged, and untracked file

The test script provides colorized output to make the information easier to read.

## Example

Here's an example of using the uncommitted changes functionality to check what changes are pending to be committed:

```javascript
const uncommittedInfo = await getUncommittedChanges('/path/to/repo');

if (uncommittedInfo.summary.hasChanges) {
  console.log(`You have ${uncommittedInfo.summary.totalChanges} uncommitted changes:`);
  console.log(`- ${uncommittedInfo.summary.modifiedCount} modified files`);
  console.log(`- ${uncommittedInfo.summary.stagedCount} staged files`);
  console.log(`- ${uncommittedInfo.summary.untrackedCount} untracked files`);
  
  if (uncommittedInfo.summary.stagedCount > 0) {
    console.log('The following files are staged and ready to be committed:');
    uncommittedInfo.staged.forEach(file => console.log(`- ${file.path}`));
  }
  
  if (uncommittedInfo.summary.modifiedCount > 0) {
    console.log('The following files have been modified but are not staged:');
    uncommittedInfo.modified.forEach(file => console.log(`- ${file.path}`));
  }
} else {
  console.log('Your working directory is clean. No uncommitted changes found.');
}
```

## Integration with Claude Desktop

When using Claude Desktop, you can ask Claude to show you the uncommitted changes in a repository:

"Show me all uncommitted changes in my project repository"

Claude will use the `get_uncommitted_changes` tool to retrieve and display the uncommitted changes information.
