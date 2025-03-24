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

/**
 * Git diff line information
 */
export interface GitDiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
}

/**
 * Git diff hunk information
 */
export interface GitDiffHunk {
  header: string;
  lines: GitDiffLine[];
}

/**
 * Git diff file information
 */
export interface GitDiffFile {
  header: string;
  oldFile?: string;
  newFile?: string;
  hunks: GitDiffHunk[];
}

/**
 * Git diff parsed result
 */
export interface GitDiffParsed {
  changes: GitDiffFile[];
}

/**
 * Git diff information
 */
export interface GitDiffInfo {
  isGitRepo: boolean;
  command?: string;
  rawDiff?: string;
  parsedDiff?: GitDiffParsed;
  error?: string;
}

/**
 * Get diff between commits or working directory and HEAD
 * @param repoPath - Path to the repository
 * @param filePath - Path to the file
 * @param oldRef - Old reference (commit hash, branch, etc.)
 * @param newRef - New reference (commit hash, branch, etc.)
 * @returns Diff information
 */
export function getGitDiff(
  repoPath: string, 
  filePath: string, 
  oldRef?: string, 
  newRef?: string
): Promise<GitDiffInfo>;

/**
 * Git unpushed commits information
 */
export interface GitUnpushedInfo {
  isGitRepo: boolean;
  hasRemote?: boolean;
  hasUpstream?: boolean;
  branch?: string;
  unpushedCount?: number;
  commits?: GitCommit[];
  message?: string;
  error?: string;
}

/**
 * Get unpushed commits in a Git repository
 * @param repoPath - Path to the repository
 * @returns Information about unpushed commits
 */
export function getUnpushedCommits(repoPath: string): Promise<GitUnpushedInfo>;

/**
 * Git file change information
 */
export interface GitFileChange {
  path: string;
  status: 'modified' | 'created' | 'renamed' | 'deleted';
  staged: boolean;
  diff?: string;
  error?: string;
}

/**
 * Git uncommitted changes summary
 */
export interface GitUncommittedSummary {
  hasChanges: boolean;
  modifiedCount: number;
  stagedCount: number;
  untrackedCount: number;
  deletedCount?: number;
  totalChanges: number;
}

/**
 * Git uncommitted changes information
 */
export interface GitUncommittedInfo {
  isGitRepo: boolean;
  branch?: string;
  summary?: GitUncommittedSummary;
  modified?: GitFileChange[];
  staged?: GitFileChange[];
  untracked?: string[];
  error?: string;
}

/**
 * Get uncommitted changes in a Git repository
 * @param repoPath - Path to the repository
 * @returns Information about uncommitted changes
 */
export function getUncommittedChanges(repoPath: string): Promise<GitUncommittedInfo>;
