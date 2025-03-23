# Cline Chat Reader MCP Server

This MCP server allows Claude Desktop to access and search through VS Code chat conversations.

## Features

- List recent VS Code chats/conversations
- Get conversation history
- Search across conversations
- Generate conversation summaries
- Find code discussions
- Context-based search with surrounding messages
- **NEW**: Improved "latest chat" detection using file modification times

## Installation

The server is already installed and configured. If you need to reinstall or update it, follow these steps:

1. Ensure the server files are in the correct location:
   ```
   /Users/ant/Cline-Chat-Reader/
   ```

2. Make sure the Claude Desktop configuration file is updated:
   ```json
   "cline-chat-reader": {
     "command": "node",
     "args": [
       "/Users/ant/Cline-Chat-Reader/build/index.js"
     ],
     "disabled": false,
     "autoApprove": []
   }
   ```

3. Restart Claude Desktop to apply the changes.

## Verification

You can verify that the server is working correctly by running the verification script:

```bash
cd /Users/ant/Cline-Chat-Reader
./tests/test-claude-integration.js
```

This script will check:
- The Claude Desktop configuration
- The MCP server module
- The server startup process
- The connection to Claude Desktop

## Testing

The server includes comprehensive test scripts to ensure all features work correctly:

### Automated Tests

Run the automated test suite to verify all features:

```bash
cd /Users/ant/Cline-Chat-Reader
./tests/test-tools.js
```

This will test all tools including:
- list_recent_chats
- get_last_n_messages
- search_conversations
- search_by_context (new context search feature)
- get_chat_by_id
- get_conversation_summary
- find_code_discussions

### Testing with Claude Desktop

To test the integration with Claude Desktop:

```bash
cd /Users/ant/Cline-Chat-Reader
./tests/test-claude-integration.js
```

This script will:
1. Verify the MCP server module
2. Test the server startup
3. Check the connection to Claude Desktop
4. Provide example commands for testing the new context search feature

## New Context Search Feature

The new `search_by_context` tool allows you to search for conversations about specific topics and view the surrounding messages for context. This is particularly useful for finding discussions about projects or technical topics.

### Using Context Search in Claude Desktop

Try these commands in Claude Desktop:

1. "Search for conversations about [project/topic] with context"
2. "Find discussions about [topic] and show me the surrounding messages"
3. "Look for conversations mentioning [term] and show me the context"

Example:
```
Search for conversations about React project with context and show me 3 messages before and after each match
```

## Troubleshooting

If you encounter issues with the MCP server, try the following:

1. **Check the logs**: Look for error messages in the Claude Desktop logs.

2. **Verify the configuration**: Make sure the configuration file has the correct path to the MCP server.

3. **Check for missing dependencies**: The server requires the following npm packages:
   - `@modelcontextprotocol/sdk`
   - `stream-json`
   - `stream-chain`
   - `zod`
   - `zod-to-json-schema`

4. **Path issues**: If you see errors about modules not being found, make sure all import paths include the `.js` extension.

5. **CommonJS vs ES Modules**: If you see errors about named exports not being found, use the default import pattern with createRequire:
   ```javascript
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
   const { ExportName } = require('module-name');
   ```

6. **Schema serialization issues**: If tools appear in the list but don't work when called, check that Zod schemas are being properly converted to JSON Schema format.

## Technical Details

The server is implemented as a Node.js application using the Model Context Protocol (MCP). It reads conversation data from the VS Code chats directory and provides tools for accessing and searching this data.

Key files:
- `index.js`: Main entry point
- `mcp-server.js`: MCP server implementation
- `services/chat-service.js`: Chat-related functionality
- `services/conversation-service.js`: Conversation-related functionality
- `utils/json-streaming.js`: Utilities for streaming JSON data
- `utils/paths.js`: Path-related utilities

## Recent Changes

- Fixed schema serialization issues by converting Zod schemas to JSON Schema format
- Added detailed logging for better debugging
- Created comprehensive test scripts for all tools
- Added the new context search feature
- Improved error handling and reporting
- Added lastActivityTimestamp feature for better "latest chat" detection

## Latest Chat Detection

The server now uses a more intelligent method to determine which chat is the "latest" one:

- Previously, chats were sorted based on their creation timestamp (the folder name)
- Now, chats are sorted based on the `lastActivityTimestamp`, which is the most recent modification time of the conversation files
- This ensures that the most recently active conversation is considered the "latest" chat, even if it was created earlier than other conversations
- All tools now include notes about the `lastActivityTimestamp` to explicitly tell Claude to use it to determine which chat is the "latest" one

### Testing the Latest Chat Detection

You can test the latest chat detection feature by running:

```bash
cd /Users/ant/claude-dev-mcp
node test-latest-chat-fix.js
```

This script will:
1. Get chats using the listChats function
2. Show chats sorted by lastActivityTimestamp
3. Show chats sorted by directory name (old method)
4. Verify that chats are correctly sorted by last activity timestamp
