# Claude Task Reader MCP Server - Technical Context

## Tech Stack

The Claude Task Reader MCP Server uses the following technologies:

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| TypeScript | Programming language for type safety |
| MCP SDK | Integration with Claude Desktop |
| stream-json | Memory-efficient JSON processing |
| fs-extra | Enhanced file system operations |
| zod | Schema validation and parsing |

## Dependencies

### Core Dependencies

- **@modelcontextprotocol/sdk**: Provides the Model Context Protocol (MCP) integration for communicating with Claude Desktop
- **stream-json**: Enables processing large JSON files as streams without loading the entire file into memory
- **fs-extra**: Extends Node.js file system methods with additional functionality and promise support
- **zod**: Schema validation library for runtime type checking
- **jsonpath**: For querying JSON structures
- **node-fetch**: Isomorphic fetch implementation for Node.js

## Development Setup

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Build

```
npm run build
```

### Run

```
npm start
```

## File Structure

- **src/**
  - **models/**: TypeScript interfaces and data models
    - **task.ts**: Defines message and task data structures
  - **utils/**: Utility functions
    - **paths.ts**: Path resolution for different operating systems
    - **json-streaming.ts**: Streaming utilities for memory-efficient JSON processing
    - **declarations.d.ts**: TypeScript declarations for third-party modules
  - **services/**: Business logic services
    - **conversation-service.ts**: Handles conversation data
    - **task-service.ts**: Manages task metadata
    - **index.ts**: Re-exports services to avoid circular dependencies
  - **mcp-server.ts**: MCP server implementation with tool definitions
  - **app.ts**: Application entry point
  - **index.ts**: Main executable

## VS Code Extension File Structure

The Claude Dev VS Code extension stores conversations in the following structure:

```
VS Code Tasks Directory/
├── 1741234567890/  # Task ID (timestamp)
│   ├── api_conversation_history.json  # Conversation messages
│   └── ui_messages.json               # UI-related messages
├── 1741234567891/
│   ├── api_conversation_history.json
│   └── ui_messages.json
└── ...
```

The VS Code Tasks Directory is located at:

- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\tasks`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/tasks`

## MCP Integration

### MCP Capabilities

The server exposes the following MCP capabilities (tools) to Claude Desktop:

1. `get_last_n_messages`: Retrieve the last N messages from a conversation
2. `get_messages_since`: Retrieve messages after a specific timestamp
3. `get_conversation_summary`: Generate a concise summary of the conversation
4. `find_code_discussions`: Identify discussions about specific code files or snippets
5. `list_recent_tasks`: List the most recent tasks/conversations
6. `get_task_by_id`: Get a specific task by its ID
7. `search_conversations`: Search across conversations for specific terms or patterns

## Technical Constraints

### Large File Handling

The VS Code extension can generate conversation JSON files that are 2-3MB or larger. To handle these efficiently:

- Use streaming instead of loading entire files into memory
- Implement early filtering during stream processing
- Add pagination support for large datasets
- Apply aggressive filtering on the server side

### Cross-Platform Compatibility

The server must work correctly on Windows, macOS, and Linux, requiring:

- Platform-specific path resolution
- OS-specific file system operations
- Use of cross-platform libraries and patterns

### Connection Method

The server connects to Claude Desktop using stdio (standard input/output) based on the MCP specification.

## Performance Considerations

- **Memory Usage**: Keep memory usage minimal by processing JSON files as streams
- **Response Time**: Optimize for quick responses, especially for large files
- **Filtering Efficiency**: Implement early filtering to avoid processing unnecessary data
