#!/bin/bash
# Script to backup and delete the claude-dev-mcp directory
# Created as part of the project reorganization

echo "Creating backup of claude-dev-mcp directory..."
tar -czf ~/claude-dev-mcp-backup.tar.gz ~/claude-dev-mcp

echo "Backup created at ~/claude-dev-mcp-backup.tar.gz"
echo "To restore the backup, run: tar -xzf ~/claude-dev-mcp-backup.tar.gz -C ~/"

echo "Do you want to delete the claude-dev-mcp directory? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Deleting claude-dev-mcp directory..."
    rm -rf ~/claude-dev-mcp
    echo "claude-dev-mcp directory deleted."
else
    echo "Deletion cancelled. The claude-dev-mcp directory was not deleted."
fi

echo "Process completed."
