# Claude Task Reader MCP Server - System Patterns

## Architecture Overview

The Claude Task Reader MCP Server follows a modular architecture with clear separation of concerns:

```
claude-task-reader-mcp-server
├── src/
│   ├── models/          # Data models and interfaces
│   ├── utils/           # Utility functions and helpers
│   ├── services/        # Core business logic
│   ├── mcp-server.ts    # MCP server implementation
│   ├── app.ts           # Application entry point
│   └── index.ts         # Main executable
└── build/               # Compiled JavaScript files
```

## Key Technical Patterns

### 1. Memory-Efficient JSON Processing

The system uses streaming techniques to process large JSON files (2-3MB+) without loading the entire file into memory, which is critical for performance and resource management.

**Pattern Implementation:**
- JSON streaming with `stream-json` library
- Incremental processing with chain transform pipelines
- Early filtering during stream processing

```typescript
// Example: Stream and filter a JSON array
export function streamJsonArray<T>(
  filePath: string, 
  options: MessageFilterOptions = {},
  filterFn?: (item: T) => boolean
): Promise<T[]> {
  // Create a chain of stream processing operations
  const pipeline = chain([
    fs.createReadStream(filePath),
    new Parser({ jsonStreaming: true }),
    new StreamArray(),
    // Process and filter items one at a time
    (data: { value: T }) => {
      const item = data.value as T;
      // Apply filters and return null for items to skip
      return passesFilter(item) ? item : null;
    }
  ]);
  
  // ...
}
```

### 2. MCP Capability Pattern

The MCP server exposes a set of focused capabilities (tools) rather than generic data access, making integration with Claude Desktop more effective.

**Pattern Implementation:**
- Each tool has a clear purpose and well-defined schema
- Input validation with Zod schemas
- Strong typing throughout the codebase

```typescript
// Example: Tool definition with input schema
{
  name: 'find_code_discussions',
  description: 'Identify discussions about specific code files or snippets',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'Task ID (timestamp) of the conversation'
      },
      filename: {
        type: 'string',
        description: 'Filename to filter discussions by (optional)'
      }
    },
    required: ['task_id']
  }
}
```

### 3. Cross-Platform File Access

The system detects and adapts to different operating systems to locate VS Code extension files correctly.

**Pattern Implementation:**
- Platform detection for Windows, macOS, and Linux
- Path resolution based on platform
- File access abstraction

```typescript
export function getVSCodeTasksDirectory(): string {
  const homedir = os.homedir();
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'darwin':
      return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    case 'linux':
      return path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
```

### 4. Service Layer Pattern

The business logic is organized in service modules that focus on specific functionality domains.

**Pattern Implementation:**
- Task service for managing task metadata
- Conversation service for handling message data
- Clear separation between data access and business logic

```typescript
// Example: Task service function
export async function getTaskSummary(tasksDir: string, taskId: string): Promise<TaskSummary> {
  // Get task details
  const task = await getTask(tasksDir, taskId);
  
  // Compute summary data
  const summary: TaskSummary = {
    ...task,
    totalMessages: 0,
    // ...additional summary data
  };
  
  // ...populate summary with conversation data
  
  return summary;
}
```

## Data Flow Patterns

1. **File Discovery Flow**:
   - Find VS Code extension directory based on OS
   - List available task directories
   - Access specific task conversation files

2. **Conversation Processing Flow**:
   - Open JSON file as a stream
   - Process JSON tokens incrementally
   - Apply filters during stream processing
   - Collect filtered results

3. **MCP Response Flow**:
   - Validate and parse input parameters
   - Call appropriate service function
   - Format response data
   - Return structured response to Claude Desktop

## Error Handling Pattern

The system follows a consistent error handling approach:

1. Use try-catch blocks in all async functions
2. Convert type-specific errors to general error messages
3. Include context in error messages (e.g., file paths, task IDs)
4. Log errors with appropriate detail level

```typescript
try {
  // Operation that might fail
} catch (error) {
  console.error(`Error context: ${context}`, error);
  throw new Error(`User-friendly message: ${(error as Error).message}`);
}
