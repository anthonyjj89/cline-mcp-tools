# Git Diff Functionality

This feature adds the ability to view the actual line-by-line changes between Git commits or between the working directory and HEAD. It provides both raw diff output and a structured parsed representation of the changes.

## Features

- Get diff between working directory and HEAD
- Get diff between any two commits or references
- Parsed diff output with structured information about changes
- Raw diff output for traditional Git diff display

## Implementation

The Git diff functionality is implemented in the following files:

1. `src/utils/git-analyzer.js` - Contains the `getGitDiff` function
2. `src/utils/git-analyzer.d.ts` - TypeScript definitions for the Git diff functionality
3. `src/mcp-server.ts` - MCP server integration with the `get_git_diff` tool

## Usage

### MCP Tool

The Git diff functionality is exposed as an MCP tool called `get_git_diff`. This tool can be used from Claude Desktop to get the diff for a specific file.

```json
{
  "name": "get_git_diff",
  "arguments": {
    "filePath": "/path/to/file",
    "oldRef": "commit-hash-1",  // Optional
    "newRef": "commit-hash-2"   // Optional
  }
}
```

If `oldRef` and `newRef` are not provided, the tool will show the diff between the working directory and HEAD.

### Direct API Usage

You can also use the `getGitDiff` function directly in your code:

```javascript
import { getGitDiff } from './utils/git-analyzer.js';

// Get diff between working directory and HEAD
const diff = await getGitDiff(repoPath, filePath);

// Get diff between two commits
const diff = await getGitDiff(repoPath, filePath, oldRef, newRef);
```

## Output Format

The `getGitDiff` function returns an object with the following structure:

```javascript
{
  isGitRepo: true,
  command: "git diff HEAD -- path/to/file",
  rawDiff: "diff --git a/file b/file\nindex abc123..def456 100644\n--- a/file\n+++ b/file\n@@ -1,3 +1,3 @@\n line1\n-line2\n+modified line2",
  parsedDiff: {
    changes: [
      {
        header: "diff --git a/file b/file",
        oldFile: "--- a/file",
        newFile: "+++ b/file",
        hunks: [
          {
            header: "@@ -1,3 +1,3 @@",
            lines: [
              { type: "context", content: " line1" },
              { type: "removed", content: "-line2" },
              { type: "added", content: "+modified line2" }
            ]
          }
        ]
      }
    ]
  }
}
```

## Testing

You can test the Git diff functionality using the `test-git-diff.js` script:

```bash
node test-git-diff.js /path/to/git/repo
```

This script will:

1. Find the Git repository at the specified path
2. Test the diff between working directory and HEAD for a file in the repository
3. Test the diff between the two most recent commits for the same file

The test script provides colorized output to make the diff easier to read.

## Example

Here's an example of using the Git diff functionality to show the changes to a file:

```javascript
const diff = await getGitDiff('/path/to/repo', '/path/to/repo/file.js');

if (diff.rawDiff) {
  console.log('Changes detected:');
  console.log(diff.rawDiff);
} else {
  console.log('No changes detected');
}
```

## Integration with Claude Desktop

When using Claude Desktop, you can ask Claude to show you the changes to a file:

"Show me the changes to src/utils/git-analyzer.js"

Claude will use the `get_git_diff` tool to retrieve and display the changes to the file.
