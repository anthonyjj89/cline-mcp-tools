# Changelog

All notable changes to the Cline Chat Reader MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-03-23

### Changed
- Renamed project from "Claude Task Reader" to "Cline Chat Reader"
- Renamed all instances of "task" to "chat" in code and documentation
- Updated file paths and imports to reflect the new naming
- Updated configuration references

## [0.1.0] - 2025-03-23

### Added
- Initial release of the Claude Task Reader MCP Server
- List recent VS Code chats/conversations
- Get conversation history
- Search across conversations
- Generate conversation summaries
- Find code discussions
- Context-based search with surrounding messages
- Improved "latest chat" detection using file modification times

### Changed
- Modified the `listChats` function to sort chats based on the modification time of the files inside the directories
- Added `lastActivityTimestamp` property to chat objects
- Updated the `getChat` function to include the `lastActivityTimestamp` in the returned object
- Modified the `searchConversations` function to use the `listChats` function to get chats sorted by `lastActivityTimestamp`
- Added notes to all MCP server tool handlers to explain that chats are sorted by `lastActivityTimestamp`

### Fixed
- Fixed schema serialization issues by converting Zod schemas to JSON Schema format
- Improved error handling and reporting
