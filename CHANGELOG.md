# Changelog

All notable changes to the Cline Chat Reader MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-03-31

### Added
- Tool consolidation from 12+ tools to 4 essential tools:
  * read_last_messages (20 message limit)
  * read_last_40_messages (40 message limit)
  * get_active_task
  * send_external_advice
- JSON repair utility for handling malformed active_tasks.json
- Standardized on UI messages JSON format exclusively
- Removed fallback to problematic api_conversation_history.json

### Changed
- Enhanced error reporting with detailed diagnostics
- Improved path resolution across platforms
- Added active task caching with 30-second expiry
- Implemented message standardization utilities
- Added timeout handling for file operations
- Created comprehensive error code system

## [0.5.6] - 2025-03-26

### Added
- Support for sending recovered chat content to active conversations
- New `active_label` parameter in `recover_crashed_chat` tool
- Ability to specify which active conversation (A or B) to send recovered content to
- Test script for demonstrating the active conversation integration
- New documentation for the crash recovery to active conversations feature
- Enhanced user flow for recovering from crashed chats

[... rest of existing changelog content remains unchanged ...]
