/**
 * Script to copy JavaScript files to the build directory
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');
const buildDir = path.join(rootDir, 'build');

/**
 * Copy JavaScript files from src to build
 */
async function copyJsFiles() {
  try {
    // Create utils directory in build if it doesn't exist
    await fs.ensureDir(path.join(buildDir, 'utils'));
    
    // Copy JavaScript files
    await fs.copy(
      path.join(srcDir, 'utils', 'vscode-tracker.js'),
      path.join(buildDir, 'utils', 'vscode-tracker.js')
    );
    
    await fs.copy(
      path.join(srcDir, 'utils', 'git-analyzer.js'),
      path.join(buildDir, 'utils', 'git-analyzer.js')
    );
    
    await fs.copy(
      path.join(srcDir, 'utils', 'vscode-settings.js'),
      path.join(buildDir, 'utils', 'vscode-settings.js')
    );
    
    console.log('JavaScript files copied successfully!');
  } catch (error) {
    console.error('Error copying JavaScript files:', error);
  }
}

// Run the copy function
copyJsFiles();
