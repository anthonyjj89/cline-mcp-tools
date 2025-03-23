/**
 * Type declarations for VS Code Tracker module
 */

/**
 * File information object
 */
export interface FileInfo {
  path: string;
  lastModified: Date;
  size: number;
  extension: string;
}

/**
 * Get list of recently opened VS Code workspaces using multiple detection methods
 * @returns List of workspace paths
 */
export function getVSCodeWorkspaces(): string[];

/**
 * Get recently modified files in a directory
 * @param dirPath - Directory to scan
 * @param hoursBack - How many hours back to look
 * @returns List of recently modified files
 */
export function getRecentlyModifiedFiles(dirPath: string, hoursBack?: number): FileInfo[];
