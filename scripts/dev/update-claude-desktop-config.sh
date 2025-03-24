#!/bin/bash

# Script to update the Claude Desktop configuration to use the new Cline Chat Reader

echo "Updating Claude Desktop configuration..."

CONFIG_FILE="/Users/ant/Library/Application Support/Claude/claude_desktop_config.json"

# Check if the config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Claude Desktop configuration file not found at $CONFIG_FILE"
  exit 1
fi

# Create a backup of the original config file
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
echo "Created backup of original config file at ${CONFIG_FILE}.backup"

# Update the configuration file
# Replace "claude-task-reader" with "cline-chat-reader" and update the path
sed -i '' 's/"claude-task-reader"/"cline-chat-reader"/g' "$CONFIG_FILE"
sed -i '' 's|/Users/ant/Claude-Task-Reader/|/Users/ant/Cline-Chat-Reader/|g' "$CONFIG_FILE"

echo "Updated Claude Desktop configuration."
echo "You will need to restart Claude Desktop for the changes to take effect."
echo "You can use the restart-claude-desktop.sh script to do this."

echo "Done."
