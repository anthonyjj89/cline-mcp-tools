# Cline Chat Reader MCP Server

[![Version](https://img.shields.io/badge/version-0.5.6-blue.svg)](https://github.com/anthonyjj89/cline-mcp-tools)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A Model Context Protocol (MCP) server that enables Claude Desktop to access, search, and interact with VS Code chat conversations.

## Features

- **Conversation Management**
  - List recent VS Code chats/conversations
  - Get conversation history
  - Search across conversations
  - Generate conversation summaries
  - Find code discussions
  - Context-based search with surrounding messages

- **Developer Tools**
  - Git analysis (unpushed commits, uncommitted changes)
  - VS Code workspace monitoring and analysis
  - Time utilities with proper time zone handling
  - Conversation analyzer for extracting key information

- **Enhanced Integration**
  - External Advice feature for sending recommendations to VS Code
  - Active Conversations feature for enhanced Claude Desktop integration
  - Crash Recovery feature for recovering context from crashed conversations
  - Crash Reports Directory for storing and managing recovered conversations

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Claude Desktop application
- VS Code with Cline extension

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/anthonyjj89/cline-mcp-tools.git
   cd cline-mcp-tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Configure Claude Desktop to use this MCP server by adding the following to your Claude Desktop configuration file:

   ```json
   "mcpServers": {
     "cline-chat-reader": {
       "command": "node",
       "args": [
         "/path/to/cline-mcp-tools/build/index.js"
       ],
       "disabled": false,
       "autoApprove": []
     }
   }
   ```

   Replace `/path/to/cline-mcp-tools` with the actual path where you cloned the repository.

5. Restart Claude Desktop to apply the changes.

## Verification

You can verify that the server is working correctly by running the verification script:

```bash
npm run test:integration
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
npm run test:all
```

This will test all tools including:
- list_recent_tasks
- get_last_n_messages
- search_conversations
- search_by_context
- get_task_by_id
- get_conversation_summary
- find_code_discussions
- git analysis tools
- time utilities
- crash recovery features

### Testing Individual Features

You can also test specific features:

```bash
# Test Git analyzer
npm run test:git

# Test crash recovery
npm run test:crash-recovery

# Test examples
npm run examples
```

## New Features

### Active Conversations

The Active Conversations feature allows users to mark specific VS Code conversations as "Active A" or "Active B", making it easier for Claude Desktop to find and interact with those conversations through the MCP server.

#### Key Benefits:
- Improved integration between Claude Desktop and Cline
- User control over which conversations to interact with
- Support for two active conversations (A and B) for working with multiple contexts
- Graceful fallbacks when active conversations aren't available

#### Using Active Conversations:
- Users mark conversations as "Active A" or "Active B" by clicking the waving hand icon in Cline
- Most conversation-related tools now support omitting the `task_id` parameter to automatically use the active conversation
- Special placeholder values `ACTIVE_A` or `ACTIVE_B` can be used to explicitly request a specific active conversation
- The `send_external_advice` tool supports the `active_label` parameter to target an active conversation

For more details, see [Active Conversations Documentation](docs/features/active-conversations.md).

### Crash Recovery

The Crash Recovery feature provides a way to recover context from crashed or corrupted conversations. This feature is particularly useful when a conversation becomes inaccessible due to file corruption, VS Code crashes, or other technical issues.

#### Key Benefits:
- Extract and analyze content from corrupted conversation files
- Generate a summary of the conversation's main topics and context
- Save the recovered context to a dedicated crash reports directory
- View and manage crash reports through the Cline extension UI

#### Using Crash Recovery:
- From Claude Desktop: Use the "Recover Crashed Chat" option in the menu
- From VS Code (Cline): Use the "Recover Crashed Conversation" command from the command palette
- Using the MCP Tool: Use the `recover_crashed_chat` tool programmatically

For more details, see [Crash Recovery Documentation](docs/features/crash-recovery.md).

### External Advice

The External Advice feature allows Claude Desktop to send advice or recommendations directly to the VS Code extension as notifications. This feature enables Claude to proactively provide suggestions, tips, and guidance to users based on their code and context.

#### Key Benefits:
- Proactive communication from Claude to users outside of the normal conversation flow
- Contextually relevant notifications for specific conversations
- Seamless incorporation of advice into ongoing conversations
- Support for different types and priorities of advice

#### Using External Advice:
- Claude Desktop uses the `send_external_advice` MCP tool to create an advice notification
- The advice is stored as a JSON file in the `external-advice` directory within the conversation folder
- Cline displays a bell icon with a badge to indicate new notifications
- Users can view and interact with notifications directly in VS Code

**Note**: The External Advice feature works with the Cline VS Code extension.

For more details, see [External Advice Documentation](docs/features/external-advice.md).

## Current Status and Known Issues

### Recent Changes (v0.5.4 - March 25, 2025)

- Removed `send_to_active` parameter from `recover_crashed_chat` tool schema
- Updated documentation and examples to reflect the parameter removal
- Simplified the crash recovery workflow to use the Active Conversations feature separately

### Known Issues

1. **MCP Protocol Compatibility Issues**:
   - Some MCP tools may encounter "Method not found" errors due to inconsistencies in method naming conventions
   - The `recover_crashed_chat` tool works correctly when called directly but may have issues when called through the MCP protocol
   - Workaround: Use the direct call approach with `test-crash-recovery-direct-call.js` for reliable crash recovery

2. **find_code_discussions Tool Returns Too Much Data**:
   - The `find_code_discussions` tool works but may return too much data
   - Future improvement: Add better filtering options or pagination

3. **Naming Convention**:
   - Some references to "Claude Task Reader" still exist in the codebase
   - Future improvement: Update all references to use "Cline Chat Reader"

### Fixed Issues

1. **Message Ordering in get_last_n_messages**:
   - Fixed issue where the tool was returning the first/oldest messages instead of the most recent ones
   - Modified the `handleGetLastNMessages` function to explicitly sort messages in reverse order

2. **"apiStats is not defined" Error**:
   - Fixed issue in the `getTask` function in `task-service.js` where there were references to undefined variables
   - Declared `apiMtime` and `uiMtime` variables at the same scope level as `apiFileSize` and `uiFileSize`

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

7. **MCP method naming issues**: If you encounter "Method not found" errors, check the method names in your MCP requests. The server may be expecting different method names than what you're using.

## Technical Details

The server is implemented as a Node.js application using the Model Context Protocol (MCP). It reads conversation data from the VS Code chats directory and provides tools for accessing and searching this data.

Key files:
- `index.js`: Main entry point
- `mcp-server.js`: MCP server implementation
- `services/chat-service.js`: Chat-related functionality
- `services/conversation-service.js`: Conversation-related functionality
- `utils/json-streaming.js`: Utilities for streaming JSON data
- `utils/json-fallback.js`: Fallback JSON parsing methods
- `utils/paths.js`: Path-related utilities
- `utils/crash-recovery.ts`: Crash recovery functionality

## Recent Changes

### v0.5.4 (March 25, 2025)
- Removed `send_to_active` parameter from `recover_crashed_chat` tool schema
- Updated documentation and examples to reflect the parameter removal
- Simplified the crash recovery workflow to use the Active Conversations feature separately

### v0.5.3 (March 25, 2025)
- Added Crash Reports Directory feature for storing recovered conversations
- New `save_to_crashreports` parameter in `recover_crashed_chat` tool
- Automatic creation of crash reports directories in Cline
- Crash report JSON format for easy access and management

### v0.5.2 (March 25, 2025)
- Enhanced Crash Recovery feature with user-focused output format
- Main topic and subtopics detection in crashed conversations
- Recent conversation flow extraction (last ~15 messages)
- Current status detection at the time of crash
- Active files identification based on conversation context

### v0.5.1 (March 25, 2025)
- Folder-based approach for dismissed notifications in Cline
- New `Dismissed` subdirectory within each task's external-advice directory
- Support for moving notifications between directories when dismissed/restored

### v0.5.0 (March 25, 2025)
- Active Conversations feature for enhanced Claude Desktop integration
- New `get_active_task` MCP tool for retrieving active conversations
- Updated `send_external_advice` tool with `active_label` parameter
- Support for targeting conversations marked as "Active A" or "Active B"
- Extension type identification in task metadata
- Explicit `extensionType` field in TaskMetadata interface

For a complete list of changes, see the [Changelog](CHANGELOG.md).
