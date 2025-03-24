#!/bin/bash

# Script to restart Claude Desktop to apply configuration changes

echo "Restarting Claude Desktop..."

# Kill the Claude Desktop process if it's running
pkill -f "Claude"

# Wait a moment for the process to terminate
sleep 2

# Start Claude Desktop again
open -a "Claude"

echo "Claude Desktop has been restarted. The changes should now be applied."
echo "You can now use the get_last_n_messages tool to retrieve the most recent messages."
