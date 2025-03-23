# VS Code Monitoring Tools

The Cline Chat Reader MCP server now includes tools for monitoring VS Code activity. These tools allow Claude Desktop to understand what you're working on in VS Code without requiring a VS Code extension.

## Available Tools

### 1. get_vscode_workspaces

Retrieves a list of recently opened VS Code workspaces.

**Usage:**
```javascript
const workspaces = await clineTools.get_vscode_workspaces();
```

**Example Response:**
```json
{
  "workspaces": [
    "/Users/username/projects/my-project",
    "/Users/username/projects/another-project"
  ],
  "count": 2
}
```

### 2. analyze_workspace

Analyzes a specific VS Code workspace, providing detailed information about the workspace, including:
- Workspace settings
- Launch configurations
- Recommended extensions
- Git repository information
- Recently modified files

**Usage:**
```javascript
const analysis = await clineTools.analyze_workspace({
  workspacePath: "/Users/username/projects/my-project",
  hoursBack: 24 // Optional, default: 24
});
```

**Example Response:**
```json
{
  "workspace": {
    "hasWorkspaceFile": true,
    "name": "my-project",
    "folders": [
      { "path": "." }
    ]
  },
  "settings": {
    "hasSettings": true,
    "settings": {
      "editor.formatOnSave": true,
      "editor.tabSize": 2
    }
  },
  "launchConfig": {
    "hasLaunchConfig": true,
    "configurations": [
      {
        "type": "node",
        "request": "launch",
        "name": "Launch Program",
        "program": "${workspaceFolder}/index.js"
      }
    ]
  },
  "extensions": {
    "hasRecommendations": true,
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode"
    ]
  },
  "gitInfo": {
    "isGitRepo": true,
    "branch": "main",
    "modified": ["src/index.js"],
    "commits": [
      {
        "hash": "abc123",
        "date": "2025-03-23T12:00:00Z",
        "message": "Initial commit",
        "author": "User Name"
      }
    ]
  },
  "recentFiles": {
    "count": 10,
    "byType": {
      ".js": [
        {
          "path": "/Users/username/projects/my-project/src/index.js",
          "lastModified": "2025-03-23T12:00:00Z",
          "size": 1024
        }
      ],
      ".json": [
        {
          "path": "/Users/username/projects/my-project/package.json",
          "lastModified": "2025-03-23T11:00:00Z",
          "size": 512
        }
      ]
    },
    "mostRecent": [
      {
        "path": "/Users/username/projects/my-project/src/index.js",
        "lastModified": "2025-03-23T12:00:00Z",
        "size": 1024
      }
    ]
  }
}
```

### 3. get_file_history

Retrieves the Git history for a specific file.

**Usage:**
```javascript
const history = await clineTools.get_file_history({
  filePath: "/Users/username/projects/my-project/src/index.js"
});
```

**Example Response:**
```json
{
  "isGitRepo": true,
  "history": [
    {
      "hash": "abc123",
      "date": "2025-03-23T12:00:00Z",
      "message": "Update index.js",
      "author": "User Name"
    },
    {
      "hash": "def456",
      "date": "2025-03-22T12:00:00Z",
      "message": "Initial commit",
      "author": "User Name"
    }
  ]
}
```

If the file is not in a Git repository, it will return basic file information:

```json
{
  "isGitRepo": false,
  "fileInfo": {
    "path": "/Users/username/projects/my-project/src/index.js",
    "lastModified": "2025-03-23T12:00:00Z",
    "size": 1024,
    "created": "2025-03-22T12:00:00Z"
  }
}
```

### 4. analyze_cline_activity

Analyzes recent VS Code activity across all workspaces, providing a comprehensive view of what you've been working on.

**Usage:**
```javascript
const activity = await clineTools.analyze_cline_activity({
  hoursBack: 48 // Optional, default: 24
});
```

**Example Response:**
```json
{
  "timestamp": "2025-03-24T00:00:00Z",
  "workspaceCount": 2,
  "workspaces": [
    {
      "workspace": {
        "hasWorkspaceFile": true,
        "name": "my-project"
      },
      "path": "/Users/username/projects/my-project",
      "gitInfo": {
        "isGitRepo": true,
        "branch": "main",
        "commits": [
          {
            "hash": "abc123",
            "date": "2025-03-23T12:00:00Z",
            "message": "Update index.js",
            "author": "User Name"
          }
        ]
      },
      "recentFileCount": 10,
      "mostRecentFiles": [
        {
          "path": "src/index.js",
          "lastModified": "2025-03-23T12:00:00Z"
        }
      ]
    }
  ]
}
```

## Implementation Details

These tools are implemented using:

- **fs-extra**: For file system operations
- **simple-git**: For Git repository analysis
- **path**: For path manipulation
- **os**: For OS-specific operations

The tools are designed to be non-invasive and only analyze files and directories that are already accessible to the system. They do not require any special permissions or extensions to be installed in VS Code.

## Use Cases

These tools can be used by Claude Desktop to:

1. **Understand your current project context**: By analyzing your VS Code workspaces, Claude can understand what projects you're working on and what files you've been modifying.

2. **Provide more relevant assistance**: With knowledge of your project structure, settings, and recent activity, Claude can provide more targeted and helpful assistance.

3. **Track your coding activity**: By analyzing your Git history and recently modified files, Claude can help you keep track of what you've been working on and what changes you've made.

4. **Suggest improvements**: Based on your project settings and structure, Claude can suggest improvements to your workflow or code organization.
