# Changelog

All notable changes to the Cline Chat Reader MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-03-24

### Added
- GitHub issue templates for bug reports and feature requests
- GitHub Actions workflow for automated testing
- Comprehensive documentation in the docs/ directory
- Example files demonstrating Git, VS Code, and time utilities
- Scripts for project maintenance and setup

### Changed
- Complete project reorganization with proper directory structure
- Moved all files to appropriate directories (docs/, examples/, scripts/, tests/)
- Updated import paths in all files to work with the new structure
- Fixed path issues in scripts after reorganization

### Fixed
- Fixed copy-js-files.js to work from its new location in scripts/dev/
- Fixed import paths in Git test files
- Fixed import paths in example files
- Updated time-formatting-example.js to use correct function names
- Fixed "Parser is not a constructor" error in json-streaming.ts by updating import syntax
- Fixed MCP server disconnection issue by properly importing CommonJS modules in json-streaming.ts

## [0.2.0] - 2025-03-24

### Added
- Time utilities for consistent timestamp formatting with time zone awareness
- Git analysis tools for detecting unpushed commits and uncommitted changes
- VS Code monitoring and workspace analysis features
- Conversation analyzer for extracting key information from chats
- File history retrieval with Git integration

### Changed
- Enhanced MCP server responses with comprehensive time information
- Improved timestamp handling in all handlers with proper time zone information
- Added human-readable time difference calculations

### Upcoming
- File consolidation: Moving all project files to ensure everything is in one place
- Comprehensive testing: Developing a more robust testing strategy

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
