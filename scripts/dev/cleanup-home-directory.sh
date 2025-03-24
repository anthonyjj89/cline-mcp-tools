#!/bin/bash
# Script to clean up duplicate directories from the home folder
# Created as part of the project reorganization

echo "Cleaning up duplicate directories from home folder..."

# Remove duplicate directories
rm -rf /Users/ant/.github
rm -rf /Users/ant/docs
rm -rf /Users/ant/examples
rm -rf /Users/ant/scripts
rm -rf /Users/ant/tests
rm -f /Users/ant/README.md

echo "Cleanup completed successfully!"
