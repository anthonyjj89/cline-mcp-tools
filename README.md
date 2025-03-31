# Cline Chat Reader MCP Server

This is the MCP server for Cline Chat Reader that provides access to VS Code extension conversations for Claude Desktop.

## Features

The MCP server implements four essential tools with fixed message limits:

1. **read_last_messages** - Retrieve 20 most recent conversation messages
2. **read_last_40_messages** - Retrieve 40 most recent conversation messages
3. **get_active_task** - Get active conversations
4. **send_external_advice** - Send notifications between agents

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npx tsc --project tsconfig.clean.json
   ```
4. Make the launcher script executable:
   ```bash
   chmod +x run-mcp-server.js
   ```

## Configuration

The MCP server needs to be added to the Claude Desktop configuration file. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cline-chat-reader": {
      "command": "node",
      "args": ["/path/to/run-mcp-server.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Replace `/path/to/run-mcp-server.js` with the absolute path to the run script.

## Usage

To run the MCP server:

```bash
./run-mcp-server.js
```

## Tools

### read_last_messages

Retrieves the last 20 messages from a conversation. If no task_id is provided, uses the active conversation.

Parameters:
- `task_id` (optional): Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.

### read_last_40_messages

Retrieves the last 40 messages from a conversation for more context. If no task_id is provided, uses the active conversation.

Parameters:
- `task_id` (optional): Task ID (timestamp) of the conversation. If not provided, uses the active conversation. Special values: "ACTIVE_A" or "ACTIVE_B" to explicitly request active tasks.

### get_active_task

Gets the active task(s).

Parameters:
- `label` (optional): Optional label (A, B) to filter by.

### send_external_advice

Sends advice to another conversation. Supports both simple and structured formats.

**Simple Format (backward compatible):**
```json
{
  "target_task_id": "1234567890",
  "message": "Your advice here",
  "source_task_id": "optional-source-id"
}
```

**Structured Format:**
```json
{
  "target_task_id": "1234567890",
  "title": "Message Summary",
  "content": "Detailed message content",
  "type": "info|warning|error",
  "priority": "low|medium|high", 
  "source_task_id": "optional-source-id"
}
```

**Required Parameters:**
- `target_task_id`: Task ID of the target conversation
- Either `message` (simple format) or both `title` and `content` (structured format)

**Optional Parameters:**
- `source_task_id`: Task ID of the source conversation
- `type`: Message type (structured format only)
- `priority`: Message priority (structured format only)

## Error Handling

The MCP server implements robust error handling with:

- Unique error codes for each error type
- Contextual information in error messages
- Graceful degradation for non-critical failures
- Consistent logging with severity levels (ERROR, WARN, INFO)

## Caching

The MCP server implements caching for active tasks with a 30-second expiry to improve performance.

## License

MIT
