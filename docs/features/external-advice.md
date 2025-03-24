# External Advice Feature

The External Advice feature allows Claude Desktop to send advice or recommendations directly to the VS Code extension as notifications. This feature enables Claude to proactively provide suggestions, tips, and guidance to users based on their code and context.

> **Important Note**: The External Advice feature only works with the Cline Ultra VS Code extension, not with the standard Cline extension. The MCP server will still process and store advice for standard Cline users, but the notifications will not be displayed in the VS Code interface.

## Overview

External Advice is a mechanism for Claude to communicate important information to users outside of the normal conversation flow. These pieces of advice are stored as JSON files in a dedicated directory within each conversation folder and can be displayed by the VS Code extension as notifications. When users interact with these notifications, the content can be seamlessly incorporated into the ongoing conversation.

## How It Works

1. Claude Desktop uses the `send_external_advice` MCP tool to create an advice notification for a specific conversation
2. The MCP server determines whether the task exists in the Cline Ultra or standard Cline extension paths
3. The advice is stored as a JSON file in the `external-advice` directory within the specific conversation's folder
4. If using Cline Ultra:
   - The VS Code extension displays a bell icon with a badge to indicate new notifications
   - When the user clicks the bell icon, they can view all notifications
   - Each notification includes a "Read" button
   - When the user clicks "Read", the VS Code extension automatically:
     - Takes the content of the notification
     - Inserts it as a user message in the chat
     - Processes it as if the user had typed it themselves
   - This allows Claude's suggestions to be seamlessly incorporated into the conversation
5. If using standard Cline:
   - The advice is stored but not displayed to the user
   - The MCP server includes a warning in the response indicating that the feature only works with Cline Ultra

## Folder Structure

The advice files are stored in a specific folder structure:

```
tasks/
  ├── [task_id]/                # Conversation folder (timestamp ID)
  │   ├── api_conversation_history.json  # Conversation history
  │   ├── ui_messages.json      # UI messages
  │   └── external-advice/      # External advice directory
  │       ├── advice-123.json   # Advice file
  │       └── advice-456.json   # Another advice file
  └── [another_task_id]/
      └── ...
```

This structure ensures that each conversation has its own dedicated advice notifications that are contextually relevant to that specific conversation.

## Advice Properties

Each piece of advice has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier for the advice |
| content | string | The main content of the advice (this will be inserted as a user message when "Read" is clicked) |
| title | string | Title for the advice notification (defaults to "Advice from Claude") |
| type | string | Type of advice: "info", "warning", "tip", or "task" |
| priority | string | Priority level: "low", "medium", or "high" |
| timestamp | number | Creation timestamp (milliseconds since epoch) |
| expiresAt | number | Expiration timestamp (milliseconds since epoch), or null if it never expires |
| relatedFiles | string[] | Array of file paths related to this advice |
| read | boolean | Whether the advice has been read by the user |

## Using the MCP Tool

Claude Desktop can send external advice using the `send_external_advice` MCP tool with the following parameters:

```javascript
{
  "content": "Advice content to send to the user",
  "title": "Title for the advice notification", // Optional
  "type": "info", // Optional: "info" (default), "warning", "tip", "task"
  "priority": "medium", // Optional: "low", "medium" (default), "high"
  "expiresAfter": 60, // Optional: Time in minutes after which the advice should expire
  "relatedFiles": ["src/file1.js", "src/file2.js"], // Optional: Paths to files related to this advice
  "task_id": "1234567890" // Required: Task ID (timestamp) of the conversation
}
```

The `content` and `task_id` parameters are required; all others are optional with sensible defaults.

### Content Formatting

Since the content will be inserted directly into the chat as a user message, it should be formatted appropriately:

- Keep it concise and clear
- Format it as a complete thought or question
- Ensure it makes sense as a standalone message
- Avoid references to "this notification" or similar phrases

## Extension Compatibility

The MCP server supports both the standard Cline and Cline Ultra VS Code extensions:

| Extension | Package Name | External Advice Support | Task Metadata |
|-----------|--------------|-------------------------|---------------|
| Cline Ultra | `custom.claude-dev-ultra` | Full support | `extensionType: "Cline Ultra"` |
| Standard Cline | `saoudrizwan.claude-dev` | Storage only (no UI) | `extensionType: "Cline Regular"` |

The MCP server automatically detects which extension is being used based on the task ID and directory structure. It will store advice files in the appropriate location regardless of which extension is used, but only Cline Ultra will display the notifications to the user.

### Extension Type Identification

As of version 0.5.0, the MCP server includes explicit extension type identification in task metadata. This ensures that Claude Desktop can correctly identify which tasks belong to which extension, preventing misidentification based on content analysis.

Each task now includes an `extensionType` field in its metadata, which can be either "Cline Ultra" or "Cline Regular". This field is automatically populated by the `getTask` function based on the task's directory path:

```typescript
// Determine extension type based on the tasks directory path
const isUltra = tasksDir.includes('custom.claude-dev-ultra');
const extensionType = isUltra ? 'Cline Ultra' : 'Cline Regular';

// Include in task metadata
return {
  // ... other task metadata
  extensionType
};
```

This explicit identification ensures that Claude Desktop can correctly categorize tasks regardless of their content, providing a more reliable way to determine which extension a task belongs to.

## Example Usage

Here's an example of how Claude might use this feature:

```javascript
// Claude notices the user is using an outdated API
const adviceResponse = await callTool("send_external_advice", {
  content: "How can I update my code to replace the deprecated 'fs.exists()' method with a more modern alternative?",
  title: "Deprecated API Usage",
  type: "warning",
  priority: "medium",
  relatedFiles: ["src/utils/file-helpers.js"],
  task_id: "1742832664949" // The current conversation's task ID
});

// Check if the advice was sent to Cline Ultra
if (adviceResponse.warning) {
  console.log(adviceResponse.warning); // Will show a warning if sent to standard Cline
}
```

When the user clicks "Read" on this notification in Cline Ultra, the question "How can I update my code to replace the deprecated 'fs.exists()' method with a more modern alternative?" will be inserted into the chat as if the user had typed it themselves, and Claude will respond accordingly.

## Implementation Details

The External Advice feature is implemented in the MCP server (`src/mcp-server.ts`). The server creates a directory called `external-advice` inside each specific task folder to store the advice files. Each advice is stored as a JSON file with a unique ID.

The implementation includes validation to ensure that the specified task directory exists before creating the advice file. If the task directory doesn't exist, the server will return an error.

## Testing

You can test the External Advice feature using the provided test scripts:

- `test-external-advice.js`: Creates a test advice file directly
- `verify-external-advice.js`: Verifies that the advice files exist and are correctly formatted

## Future Enhancements

Possible future enhancements to the External Advice feature:

1. Add support for rich text content (Markdown)
2. Implement advice categories for better organization
3. Add support for multiple action buttons with different messages
4. Implement a feedback mechanism for users to rate the usefulness of advice
5. Add support for advice templates
