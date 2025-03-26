# Documentation Directory

This directory contains documentation for the Cline Chat Reader MCP server.

## Directory Structure

- `features/`: Documentation for specific features
- `testing/`: Documentation for testing strategies
- `installation.md`: Installation instructions
- `original-readme.md`: Original README file
- `setup-instructions.md`: Setup instructions
- `roadmap.md`: Future development plans and improvements

## Feature Documentation

### Core Features

- `features/CLINE_CHAT_READER_SUMMARY.md`: Overview of the Cline Chat Reader
- `features/MESSAGE_ORDERING_FIX.md`: Documentation for the message ordering fix

### Integration Features

- `features/active-conversations.md`: Documentation for the Active Conversations feature
- `features/extension-type-identification.md`: Documentation for the extension type identification feature
- `features/external-advice.md`: Documentation for the External Advice feature
- `features/crash-recovery.md`: Documentation for the Crash Recovery feature

### Git Analysis

- `features/git-analyzer.md`: Documentation for the Git analyzer functionality
- `features/git-diff.md`: Documentation for the Git diff functionality
- `features/uncommitted-changes.md`: Documentation for detecting uncommitted changes
- `features/unpushed-commits.md`: Documentation for detecting unpushed commits

### VS Code Monitoring

- `features/vscode-monitoring.md`: Documentation for VS Code monitoring functionality

### Conversation Analysis

- `features/conversation-analyzer.md`: Documentation for conversation analysis

### Time Utilities

- `features/time-utilities.md`: Documentation for time utilities

### Fixes and Improvements

- `features/fixes.md`: Documentation for fixes and improvements

## Testing Documentation

- `testing/external-advice-testing-strategy.md`: Testing strategy for the External Advice feature

## Recent Updates

### Active Conversations (v0.5.0)

The Active Conversations feature allows users to mark specific VS Code conversations as "Active A" or "Active B", making it easier for Claude Desktop to find and interact with those conversations through the MCP server. See `features/active-conversations.md` for details.

### Crash Recovery (v0.5.2 - v0.5.4)

The Crash Recovery feature provides a way to recover context from crashed or corrupted conversations. This feature is particularly useful when a conversation becomes inaccessible due to file corruption, VS Code crashes, or other technical issues. See `features/crash-recovery.md` for details.

### External Advice (v0.4.0 - v0.5.1)

The External Advice feature allows Claude Desktop to send advice or recommendations directly to the VS Code extension as notifications. This feature enables Claude to proactively provide suggestions, tips, and guidance to users based on their code and context. See `features/external-advice.md` for details.

### Extension Type Identification (v0.5.0)

The Extension Type Identification feature ensures that Claude Desktop can correctly identify which tasks belong to which extension, preventing misidentification based on content analysis. See `features/extension-type-identification.md` for details.

## Known Issues

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

## Installation and Setup

- `installation.md`: Detailed installation instructions
- `setup-instructions.md`: Setup instructions for development

## Contributing

If you'd like to contribute to the documentation, please follow these guidelines:

1. Use Markdown for all documentation files
2. Include a clear title and description
3. Use code blocks for code examples
4. Include usage examples where appropriate
5. Keep the documentation up-to-date with the code
6. When adding new features, create a dedicated documentation file in the `features/` directory
7. Update this README.md file to include references to new documentation

## Version History

For a complete list of changes and version history, see the [Changelog](../CHANGELOG.md) in the root directory.
