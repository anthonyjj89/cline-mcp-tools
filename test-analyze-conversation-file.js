#!/usr/bin/env node
/**
 * Test script to analyze conversation file in chunks
 */

import { getFileStructureAnalysis } from './build/utils/file-analyzer.js';
import { 
  getApiConversationFilePath,
  getTasksDirectoryForTask
} from './build/utils/paths.js';
import { getActiveTaskWithCache } from './build/utils/active-task-fixed.js';

async function main() {
  try {
    // Get active task to find conversation file
    const activeTask = await getActiveTaskWithCache();
    if (!activeTask || !activeTask.id) {
      console.error('No active task found or task missing ID');
      console.error('Active task data:', activeTask);
      process.exit(1);
    }

    // Get tasks directory
    const tasksDir = await getTasksDirectoryForTask(activeTask.id);
    
    // Get conversation file path
    const filePath = getApiConversationFilePath(tasksDir, activeTask.id);
    console.log(`Analyzing conversation file: ${filePath}`);

    // Analyze file structure in chunks
    const analysis = await getFileStructureAnalysis(filePath);

    // Print results
    console.log('\n=== Header Analysis ===');
    console.log(`Bytes: ${analysis.header.startByte}-${analysis.header.endByte}`);
    console.log('Content start:', analysis.header.content.substring(0, 100) + '...');
    console.log('Analysis:', analysis.header.analysis);

    if (analysis.middle) {
      console.log('\n=== Middle Analysis ===');
      console.log(`Bytes: ${analysis.middle.startByte}-${analysis.middle.endByte}`);
      console.log('Content sample:', analysis.middle.content.substring(0, 100) + '...');
      console.log('Analysis:', analysis.middle.analysis);
    }

    console.log('\n=== Footer Analysis ===');
    console.log(`Bytes: ${analysis.footer.startByte}-${analysis.footer.endByte}`);
    console.log('Content end:', '...' + analysis.footer.content.slice(-100));
    console.log('Analysis:', analysis.footer.analysis);

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

main();
