#!/bin/bash

# Script to restart Claude Desktop to apply the improved Parser import fixes and fallback solution
# This script will restart Claude Desktop and apply the createRequire fixes and fallback JSON parsing for the conversation analysis tools
# Now also includes the new feature to send recovered chat content to active conversations

echo "Restarting Claude Desktop to apply improved Parser import fixes and JSON parsing solution..."
echo "Also applying the new feature to send recovered chat content to active conversations..."

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
echo ""
echo "New feature: Recover crashed chats and send to active conversations"
echo "You can now use the recover_crashed_chat tool with the following parameters:"
echo "- task_id: The ID of the crashed conversation to recover"
echo "- send_as_advice: Set to true to send the recovered content as external advice"
echo "- active_label: Specify which active conversation (A or B) to send the advice to"
echo ""
echo "Example usage:"
echo "npm run test:recover-to-active <crashed_task_id> <active_label>"
