# Crash Recovery to Active Conversations

This feature allows users to recover content from crashed chats and send it as external advice to active conversations in VS Code.

## Overview

When a chat crashes in VS Code, users can use this feature to:

1. Recover the content from the crashed chat
2. Send the recovered content as external advice to an active conversation (marked as Active A or B)

This provides a seamless way to continue working with content from crashed chats without losing important information.

## How It Works

The feature uses the `recover_crashed_chat` MCP tool with the following parameters:

- `task_id`: The ID of the crashed conversation to recover
- `send_as_advice`: Set to `true` to send the recovered content as external advice
- `active_label`: Specify which active conversation (A or B) to send the advice to

## User Flow

1. A chat crashes in VS Code
2. The user starts a new conversation in VS Code
3. The user marks this new conversation as Active A or Active B using the toggle in the extension
4. The user uses the `recover_crashed_chat` tool to recover the crashed chat and send it to the active conversation

## Example Usage

Using the test script:

```bash
node test-recover-crashed-chat-as-advice.js <crashed_task_id> <active_label>
```

Where:
- `crashed_task_id`: The ID of the crashed conversation to recover
- `active_label`: The active label (A or B) of the conversation to send advice to

## Implementation Details

The implementation:

1. Recovers the content from the crashed chat
2. Looks up which conversation is marked with the specified active label
3. Sends the recovered content as external advice to that active conversation

If the specified active label doesn't exist, it falls back to the original behavior of sending to the original crashed chat's conversation (though this is less useful since the chat is crashed).

## Benefits

- Seamless recovery from crashed chats
- No loss of important information
- Ability to continue working with the recovered content in a new conversation
- Integration with the active conversation system for better workflow
