/**
 * Type declarations for Git Analyzer module
 */

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

/**
 * Git repository information
 */
export interface GitRepoInfo {
  isGitRepo: boolean;
  branch?: string;
  modified?: string[];
  created?: string[];
  deleted?: string[];
  renamed?: string[];
  commits?: GitCommit[];
  error?: string;
}

/**
 * Git file history information
 */
export interface GitFileHistory {
  isGitRepo: boolean;
  history?: GitCommit[];
  error?: string;
}

/**
 * Get recent changes in a Git repository
 * @param repoPath - Path to the repository
 * @returns Git status and recent commits
 */
export function getRecentChanges(repoPath: string): Promise<GitRepoInfo>;

/**
 * Get git history for a specific file
 * @param repoPath - Path to the repository
 * @param filePath - Path to the file relative to repo
 * @returns Commit history for the file
 */
export function getFileHistory(repoPath: string, filePath: string): Promise<GitFileHistory>;

/**
 * Find the Git repository containing a file
 * @param filePath - Path to the file
 * @returns Path to the repository or null if not found
 */
export function findGitRepository(filePath: string): string | null;
