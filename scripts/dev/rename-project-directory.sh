#!/bin/bash

# Script to rename the project directory from Claude-Task-Reader to Cline-Chat-Reader

echo "Renaming project directory from Claude-Task-Reader to Cline-Chat-Reader..."

# Check if the source directory exists
if [ ! -d "/Users/ant/Claude-Task-Reader" ]; then
  echo "Error: Source directory /Users/ant/Claude-Task-Reader does not exist."
  exit 1
fi

# Check if the destination directory already exists
if [ -d "/Users/ant/Cline-Chat-Reader" ]; then
  echo "Error: Destination directory /Users/ant/Cline-Chat-Reader already exists."
  exit 1
fi

# Rename the directory
mv /Users/ant/Claude-Task-Reader /Users/ant/Cline-Chat-Reader

# Check if the rename was successful
if [ $? -eq 0 ]; then
  echo "Successfully renamed project directory to Cline-Chat-Reader."
  echo "You will need to update the Claude Desktop configuration to point to the new directory."
  echo "Edit the file: /Users/ant/Library/Application Support/Claude/claude_desktop_config.json"
  echo "Change 'claude-task-reader' to 'cline-chat-reader' and update the path."
else
  echo "Error: Failed to rename project directory."
  exit 1
fi

echo "Done."
