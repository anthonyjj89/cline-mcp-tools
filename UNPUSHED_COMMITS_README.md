# Unpushed Commits Functionality

This feature adds the ability to identify and analyze commits that exist locally but have not been pushed to a remote repository. This is particularly useful for understanding what changes are still pending to be shared with collaborators.

## Features

- Detect if a repository has a remote
- Check if the current branch has an upstream branch
- List all commits that exist locally but not on the remote
- Provide detailed information about each unpushed commit

## Implementation

The unpushed commits functionality is implemented in the following files:

1. `src/utils/git-analyzer.js` - Contains the `getUnpushedCommits` function
2. `src/utils/git-analyzer.d.ts` - TypeScript definitions for the unpushed commits functionality
3. `src/mcp-server.ts` - MCP server integration with the `get_unpushed_commits` tool

## Usage

### MCP Tool

The unpushed commits functionality is exposed as an MCP tool called `get_unpushed_commits`. This tool can be used from Claude Desktop to get information about unpushed commits in a Git repository.

```json
{
  "name": "get_unpushed_commits",
  "arguments": {
    "repoPath": "/path/to/repo"
  }
}
```

### Direct API Usage

You can also use the `getUnpushedCommits` function directly in your code:

```javascript
import { getUnpushedCommits } from './utils/git-analyzer.js';

// Get unpushed commits
const unpushedInfo = await getUnpushedCommits('/path/to/repo');

// Check if there are unpushed commits
if (unpushedInfo.unpushedCount > 0) {
  console.log(`Found ${unpushedInfo.unpushedCount} unpushed commits`);
  
  // Process each unpushed commit
  unpushedInfo.commits.forEach(commit => {
    console.log(`${commit.hash} - ${commit.message}`);
  });
}
```

## Output Format

The `getUnpushedCommits` function returns an object with the following structure:

```javascript
{
  isGitRepo: true,
  hasRemote: true,
  hasUpstream: true,
  branch: "main",
  unpushedCount: 2,
  commits: [
    {
      hash: "abc1234",
      date: "2025-03-24T00:15:30Z",
      message: "Fix bug in login component",
      author: "John Doe"
    },
    {
      hash: "def5678",
      date: "2025-03-24T01:20:45Z",
      message: "Update documentation",
      author: "Jane Smith"
    }
  ]
}
```

If the repository doesn't have a remote or the current branch doesn't have an upstream branch, the function will return appropriate information:

```javascript
// No remote
{
  isGitRepo: true,
  hasRemote: false,
  message: "No remote repository found"
}

// No upstream branch
{
  isGitRepo: true,
  hasRemote: true,
  hasUpstream: false,
  branch: "feature/new-component",
  message: "Branch 'feature/new-component' does not have an upstream branch"
}
```

## Testing

You can test the unpushed commits functionality using the `test-unpushed-commits.js` script:

```bash
node test-unpushed-commits.js /path/to/git/repo
```

This script will:

1. Find the Git repository at the specified path
2. Check if the repository has a remote
3. Check if the current branch has an upstream branch
4. List all unpushed commits with detailed information

The test script provides colorized output to make the information easier to read.

## Example

Here's an example of using the unpushed commits functionality to check what changes are pending to be pushed:

```javascript
const unpushedInfo = await getUnpushedCommits('/path/to/repo');

if (unpushedInfo.unpushedCount > 0) {
  console.log(`You have ${unpushedInfo.unpushedCount} unpushed commits on branch ${unpushedInfo.branch}`);
  console.log('Remember to push your changes to share them with your team!');
} else {
  console.log('All commits have been pushed to the remote repository.');
}
```

## Integration with Claude Desktop

When using Claude Desktop, you can ask Claude to show you the unpushed commits in a repository:

"Show me the unpushed commits in my project repository"

Claude will use the `get_unpushed_commits` tool to retrieve and display the unpushed commits information.
