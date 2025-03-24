#!/bin/bash

# Script to restart Claude Desktop to apply the improved Parser import fixes and fallback solution
# This script will restart Claude Desktop and apply the createRequire fixes and fallback JSON parsing for the conversation analysis tools

echo "Restarting Claude Desktop to apply improved Parser import fixes and fallback JSON parsing solution..."

# Kill the Claude Desktop process if it's running
pkill -f "Claude"

# Wait a moment for the process to terminate
sleep 2

# Start Claude Desktop again
open -a "Claude"

echo "Claude Desktop has been restarted. The fixes should now be applied."
echo "You can now use the conversation analysis tools that were previously failing:"
echo "- get_task_by_id"
echo "- get_last_n_messages"
echo "- find_code_discussions"
echo ""
echo "The analyze_conversation and search_conversations tools were already working."
