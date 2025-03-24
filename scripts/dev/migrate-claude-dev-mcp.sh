#!/bin/bash
# Script to migrate important files from claude-dev-mcp to Cline-Chat-Reader
# Created as part of the project reorganization

# Ensure we're in the Cline-Chat-Reader directory
cd /Users/ant/Cline-Chat-Reader

# Create directories if they don't exist
mkdir -p tests/unit/conversation
mkdir -p docs/features
mkdir -p scripts/dev

# Copy test scripts
echo "Copying test scripts..."
cp /Users/ant/claude-dev-mcp/test-latest-chat-fix.js tests/unit/conversation/
cp /Users/ant/claude-dev-mcp/test-message-ordering-fix.js tests/unit/conversation/
cp /Users/ant/claude-dev-mcp/test-mcp-tool.js tests/unit/
cp /Users/ant/claude-dev-mcp/verify-mcp-server.js tests/unit/

# Copy documentation
echo "Copying documentation..."
cp /Users/ant/claude-dev-mcp/CLINE_CHAT_READER_SUMMARY.md docs/features/
cp /Users/ant/claude-dev-mcp/MESSAGE_ORDERING_FIX.md docs/features/

# Copy utility scripts
echo "Copying utility scripts..."
cp /Users/ant/claude-dev-mcp/rename-project-directory.sh scripts/dev/
cp /Users/ant/claude-dev-mcp/update-claude-desktop-config.sh scripts/dev/
cp /Users/ant/claude-dev-mcp/check-mcp-server.js scripts/dev/

echo "Migration completed successfully!"
