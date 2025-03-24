# Git Analyzer Test Script

This script demonstrates how to use the git-analyzer utility functions to get information about Git repositories. It provides a simple way to test the functionality of the git-analyzer module.

## Features

The script tests the following git-analyzer functions:

1. `findGitRepository(filePath)` - Finds the Git repository containing a file
2. `getRecentChanges(repoPath)` - Gets the status of a Git repository including:
   - Current branch
   - Modified, created, deleted, and renamed files
   - Recent commits (last 10) with hash, date, message, and author
3. `getFileHistory(repoPath, filePath)` - Gets the commit history for a specific file

## Usage

```bash
node test-git-analyzer.js [path-to-git-repo]
```

If no path is provided, the script will use the current directory. If the current directory is not a Git repository, the script will search for Git repositories in parent directories.

## Example Output

When run on a Git repository, the script will display information like:

```
================================================================================
 Git Analyzer Test
================================================================================
ℹ Target directory: /path/to/git/repo


================================================================================
 Testing findGitRepository()
================================================================================
ℹ File path: /path/to/git/repo
✓ Found Git repository: /path/to/git/repo


================================================================================
 Testing getRecentChanges()
================================================================================
ℹ Repository path: /path/to/git/repo
✓ Successfully retrieved repository information

--- Repository Information ---

Current Branch: main

--- Modified Files ---

M src/utils/git-analyzer.js
M test-git-analyzer.js

--- Recent Commits ---

abcd123 - 3/24/2025, 4:00:00 AM
Author: John Doe
Message: Add git-analyzer test script

efgh456 - 3/23/2025, 10:30:00 PM
Author: Jane Smith
Message: Update README.md


================================================================================
 Testing getFileHistory()
================================================================================
ℹ Repository path: /path/to/git/repo
ℹ File path: /path/to/git/repo/src/utils/git-analyzer.js
✓ Successfully retrieved file history

--- Commit History ---

abcd123 - 3/24/2025, 4:00:00 AM
Author: John Doe
Message: Add git-analyzer test script

ijkl789 - 3/22/2025, 2:15:00 PM
Author: Jane Smith
Message: Initial implementation of git-analyzer


================================================================================
 Test Complete
================================================================================
✓ All git-analyzer functions tested successfully
```

## Integration with MCP Server

The git-analyzer functions are used by the VS Code monitoring tools in the MCP server, particularly in the `analyze_workspace` and `get_file_history` tools that can be called from Claude.

## Troubleshooting

If the script cannot find a Git repository, it will suggest running it with a path to a known Git repository:

```
✗ No Git repository found for this file
✗ Cannot proceed with tests: No Git repository found
ℹ Try running the script with a path to a Git repository:
ℹ   node test-git-analyzer.js /path/to/git/repo
```

The script will also search for Git repositories in parent directories and suggest using those if found.
