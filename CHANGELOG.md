# Changelog

All notable changes to the Cline Chat Reader MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2025-03-31

### Changed
- Enhanced .gitignore with additional patterns for non-public-facing files
- Added patterns for local development files, temporary files, and debug logs
- Added patterns for user-specific configuration files
- Added patterns for source code backups

## [0.6.1] - 2025-03-31

### Added
- Support for structured message format in send_external_advice tool
- Improved README documentation with clear examples

### Changed
- Better type safety for message handling
- Enhanced error messages and validation
- Updated version to maintain consistency across package.json and config.ts

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

[... rest of existing changelog content remains unchanged ...]
