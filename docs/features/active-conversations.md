# Active Conversations Feature

The Active Conversations feature allows users to mark specific VS Code conversations as "Active A" or "Active B", making it easier for Claude Desktop to find and interact with those conversations through the MCP server.

## Overview

This feature solves a key integration challenge between Claude Desktop and Cline Ultra by providing a way for users to explicitly mark which conversations they want to interact with from Claude Desktop. By marking conversations as "Active A" or "Active B", users create clear targets for Claude Desktop to send advice, retrieve messages, or analyze conversations.

## How It Works

1. **Marking Conversations**: Users can mark a conversation as "Active A" or "Active B" by clicking the waving hand icon in Cline Ultra.

2. **Storage**: The active conversation information is stored in an `active_tasks.json` file in the VS Code extension's storage directory.

3. **MCP Tools**: The MCP server provides tools to:
   - Get information about active conversations
   - Target active conversations when sending advice
   - Use active conversations as default targets for other operations

## MCP Tools

### `get_active_task`

Retrieves information about currently active conversations.

**Parameters:**
- `label` (optional): Filter by active label (A or B)
- `task_id` (optional): Check if a specific task ID is marked as active

**Example Response:**
```json
{
  "active_tasks": [
    {
      "id": "1711375200000",
      "title": "Conversation Title",
      "created": "2025-03-25T12:00:00.000Z",
      "active_label": "A",
      "last_activated": "2025-03-25T15:00:00.000Z"
    }
  ],
  "count": 1,
  "filtered_by_label": "A"
}
```

### Using Active Conversations in Other Tools

Most conversation-related tools now support:

1. **Omitting the `task_id` parameter** to automatically use the active conversation (prioritizing Active A)
2. **Using special placeholder values** `ACTIVE_A` or `ACTIVE_B` to explicitly request a specific active conversation
3. **Using the `active_label` parameter** in `send_external_advice` to target an active conversation

**Example:**
```javascript
// Get messages from Active A conversation
{
  "task_id": "ACTIVE_A",
  "limit": 10
}

// Send advice to Active B conversation
{
  "content": "This is advice for Active B conversation",
  "title": "Advice Title",
  "task_id": "1234567890123", // Fallback task_id
  "active_label": "B" // This takes precedence over task_id
}
```

## Implementation Details

The feature works by:

1. Looking for `active_tasks.json` in both standard Cline and Cline Ultra storage paths
2. Providing special handling in all conversation-related tools to check for active conversations
3. Prioritizing Active A over Active B when no specific active conversation is requested
4. Providing clear error messages when requested active conversations don't exist

## Benefits

- **Improved Integration**: Claude Desktop can now reliably target specific VS Code conversations
- **User Control**: Users explicitly mark which conversations they want to interact with
- **Flexibility**: Support for two active conversations (A and B) allows working with multiple contexts
- **Graceful Fallbacks**: Tools provide helpful error messages when active conversations aren't available

## Testing

A test script (`test-active-conversations.js`) is provided to verify the functionality of the Active Conversations feature. It tests:

1. The `get_active_task` tool
2. Using active conversation placeholders with `get_last_n_messages`
3. Using the `active_label` parameter with `send_external_advice`

Run the test script with:
```
node test-active-conversations.js
