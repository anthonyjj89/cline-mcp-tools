#!/bin/bash
# Master script to run all reorganization steps in sequence
# Created as part of the project reorganization

# Change to the Cline-Chat-Reader directory
cd /Users/ant/Cline-Chat-Reader

echo "=== Cline-Chat-Reader Project Reorganization ==="
echo "This script will run all the reorganization steps in sequence:"
echo "1. Migrate files from claude-dev-mcp"
echo "2. Clean up duplicate directories from home folder"
echo "3. Update copy-js-files.js location in package.json"
echo "4. Create a backup of claude-dev-mcp"
echo "5. Optionally delete claude-dev-mcp"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Step 1: Migrate files from claude-dev-mcp
echo ""
echo "=== Step 1: Migrating files from claude-dev-mcp ==="
bash scripts/dev/migrate-claude-dev-mcp.sh

# Step 2: Clean up duplicate directories from home folder
echo ""
echo "=== Step 2: Cleaning up duplicate directories from home folder ==="
bash scripts/dev/cleanup-home-directory.sh

# Step 3: Move copy-js-files.js to scripts/dev if it's still in the root directory
if [ -f "copy-js-files.js" ]; then
    echo ""
    echo "=== Step 3: Moving copy-js-files.js to scripts/dev ==="
    mv copy-js-files.js scripts/dev/
    echo "copy-js-files.js moved to scripts/dev/"
else
    echo ""
    echo "=== Step 3: copy-js-files.js is already in the correct location ==="
fi

# Step 4: Test the build process
echo ""
echo "=== Step 4: Testing the build process ==="
npm run build

# Step 5: Backup and optionally delete claude-dev-mcp
echo ""
echo "=== Step 5: Backup and optionally delete claude-dev-mcp ==="
bash scripts/dev/backup-and-delete-claude-dev-mcp.sh

echo ""
echo "=== Reorganization Complete ==="
echo "The Cline-Chat-Reader project has been successfully reorganized."
echo "You can now continue development with the new structure."
