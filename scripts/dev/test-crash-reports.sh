#!/bin/bash
# Script to run the crash reports tests

# Set the current directory to the project root
cd "$(dirname "$0")/../.." || exit

# Check if the build directory exists
if [ ! -d "build" ]; then
  echo "Error: build directory not found. Please run 'npm run build' first."
  exit 1
fi

# Check if the crash-recovery.js file exists in the build directory
if [ ! -f "build/utils/crash-recovery.js" ]; then
  echo "Error: build/utils/crash-recovery.js not found. Please run 'npm run build' first."
  exit 1
fi

# Run the test script
echo "Running crash reports tests..."
node tests/unit/crash-recovery/test-crash-reports.js

# Check the exit code
if [ $? -eq 0 ]; then
  echo "Crash reports tests completed successfully!"
else
  echo "Crash reports tests failed!"
  exit 1
fi

# Run the simple test script
echo -e "\nRunning simple crash reports test..."
node test-crash-reports.js

# Check the exit code
if [ $? -eq 0 ]; then
  echo "Simple crash reports test completed successfully!"
else
  echo "Simple crash reports test failed!"
  exit 1
fi

echo -e "\nAll tests completed successfully!"
