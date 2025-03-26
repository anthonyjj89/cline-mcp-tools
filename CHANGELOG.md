# Changelog

All notable changes to the Cline Chat Reader MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4] - 2025-03-25

### Changed
- Removed `send_to_active` parameter from `recover_crashed_chat` tool schema
- Updated documentation and examples to reflect the parameter removal
- Simplified the crash recovery workflow to use the Active Conversations feature separately

## [0.5.3] - 2025-03-25

### Added
- Crash Reports Directory feature for storing recovered conversations
- New `save_to_crashreports` parameter in `recover_crashed_chat` tool
- Automatic creation of crash reports directories in Cline Ultra
- Crash report JSON format for easy access and management
- Test script for verifying crash reports functionality
- Updated documentation with crash reports directory information

## [0.5.2] - 2025-03-25

### Added
- Enhanced Crash Recovery feature with user-focused output format
- Main topic and subtopics detection in crashed conversations
- Recent conversation flow extraction (last ~15 messages)
- Current status detection at the time of crash
- Active files identification based on conversation context
- Open questions extraction for unanswered queries
- Comprehensive documentation for the Crash Recovery feature
- Test scripts for verifying crash recovery functionality
- Example prompt for using the recover_crashed_chat tool in Claude Desktop

### Changed
- Completely redesigned the crash recovery output format for better user experience
- Improved the `formatRecoveredContext` function with a more structured and readable format
- Enhanced topic analysis with recency weighting for more accurate main topic detection
- Updated the `recoverCrashedConversation` function to extract more context from crashed conversations

## [0.5.1] - 2025-03-25

### Added
- Folder-based approach for dismissed notifications in Cline Ultra
- New `Dismissed` subdirectory within each task's external-advice directory
- Support for moving notifications between directories when dismissed/restored

### Changed
- Removed `dismissed` field from notification JSON structure
- Updated all notification creation code to create the `Dismissed` subdirectory
- Modified `handleSendExternalAdvice` function to use the folder-based approach

## [0.5.0] - 2025-03-25

### Added
- Active Conversations feature for enhanced Claude Desktop integration
- New `get_active_task` MCP tool for retrieving active conversations
- Updated `send_external_advice` tool with `active_label` parameter
- Support for targeting conversations marked as "Active A" or "Active B"
- Comprehensive documentation for the Active Conversations feature
- Test scripts for verifying active conversation functionality
- Extension type identification in task metadata
- Explicit `extensionType` field in TaskMetadata interface
- Enhanced task identification for both Cline Ultra and Cline Regular extensions
- Comprehensive testing for extension type identification
- Test script for verifying extension type in task metadata
- Support for notification dismissal in Cline Ultra with `dismissed` field in notification JSON

### Changed
- Modified `getTask` function to include extension type information
- Updated task metadata to clearly indicate which extension a task belongs to
- Improved task directory resolution across multiple extension paths

### Fixed
- Fixed issue where Claude Desktop was misidentifying tasks based on content analysis
- Ensured consistent extension type identification across all MCP tools
- Fixed regression in `send_external_advice` tool to allow using only `active_label` without requiring `task_id`

## [0.4.0] - 2025-03-24

### Added
- External Advice feature for sending recommendations directly to VS Code
- Robust fallback JSON parsing system for improved reliability
- Direct file reading methods as alternatives to streaming
- Comprehensive error handling with graceful degradation
- Support for both Cline and Cline Ultra VS Code extensions
- Warning system for features that only work with specific extensions

### Changed
- Improved module imports using Node.js createRequire for better compatibility
- Enhanced error logging for easier debugging
- Updated restart script to include fallback solution information
- Simplified External Advice feature user flow to insert notification content directly into chat as user messages
- Updated documentation and examples to reflect the simplified External Advice workflow
- Modified `getVSCodeTasksDirectory` to support multiple extension paths

### Fixed
- Resolved remaining JSON parsing issues in conversation analysis tools
- Implemented fallback mechanisms for all JSON operations
- Added graceful error handling for streaming failures

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
- Fixed remaining Parser import issues in conversation-analyzer.ts to resolve conversation analysis tool errors
- Improved CommonJS module imports using Node.js createRequire for better compatibility and reliability
- Added fallback JSON parsing methods to handle streaming failures gracefully
- Implemented robust error handling with direct file reading fallbacks for all JSON operations

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
