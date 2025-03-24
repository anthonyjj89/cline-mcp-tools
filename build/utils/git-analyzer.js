/**
 * Git Analyzer - Utility for analyzing Git repositories
 * Part of the Cline Chat Reader MCP Server
 */

import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';

/**
 * Get recent changes in a Git repository
 * @param {string} repoPath - Path to the repository
 * @returns {Object} Git status and recent commits
 */
export async function getRecentChanges(repoPath) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      return { isGitRepo: false };
    }
    
    // Get status of files
    const status = await git.status();
    
    // Get recent commits (last 10)
    const log = await git.log({ maxCount: 10 });
    
    // Get current branch
    const branch = await git.branch();
    
    return {
      isGitRepo: true,
      branch: branch.current,
      modified: status.modified,
      created: status.created,
      deleted: status.deleted,
      renamed: status.renamed,
      commits: log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
      }))
    };
  } catch (error) {
    console.error('Error reading Git info:', error);
    return { 
      isGitRepo: false,
      error: error.message 
    };
  }
}

/**
 * Get git history for a specific file
 * @param {string} repoPath - Path to the repository
 * @param {string} filePath - Path to the file relative to repo
 * @returns {Array} Commit history for the file
 */
export async function getFileHistory(repoPath, filePath) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      return { isGitRepo: false };
    }
    
    // Get relative path to the file from repo root
    const relativeFilePath = path.relative(repoPath, filePath);
    
    // Get commit history for the file
    const log = await git.log({ file: relativeFilePath });
    
    return {
      isGitRepo: true,
      history: log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
      }))
    };
  } catch (error) {
    console.error('Error getting file history:', error);
    return { 
      isGitRepo: false,
      error: error.message 
    };
  }
}

/**
 * Find the Git repository containing a file
 * @param {string} filePath - Path to the file
 * @returns {string|null} Path to the repository or null if not found
 */
export function findGitRepository(filePath) {
  let currentPath = path.dirname(filePath);
  
  // Walk up the directory tree to find .git folder
  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

/**
 * Get diff between commits or working directory and HEAD
 * @param {string} repoPath - Path to the repository
 * @param {string} filePath - Path to the file
 * @param {string} [oldRef] - Old reference (commit hash, branch, etc.)
 * @param {string} [newRef] - New reference (commit hash, branch, etc.)
 * @returns {Object} Diff information
 */
export async function getGitDiff(repoPath, filePath, oldRef, newRef) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      return { isGitRepo: false };
    }
    
    // Get relative path to the file from repo root
    const relativeFilePath = path.relative(repoPath, filePath);
    
    let diffResult;
    let diffCommand;
    
    if (oldRef && newRef) {
      // Get diff between two specific commits/refs
      diffCommand = [oldRef, newRef, '--', relativeFilePath];
      diffResult = await git.diff(diffCommand);
    } else {
      // Get diff between working directory and HEAD
      diffCommand = ['HEAD', '--', relativeFilePath];
      diffResult = await git.diff(diffCommand);
    }
    
    // Parse the diff output to create a more structured result
    const parsedDiff = parseDiffOutput(diffResult);
    
    return {
      isGitRepo: true,
      command: `git diff ${diffCommand.join(' ')}`,
      rawDiff: diffResult,
      parsedDiff: parsedDiff
    };
  } catch (error) {
    console.error('Error getting diff:', error);
    return { 
      isGitRepo: false,
      error: error.message 
    };
  }
}

/**
 * Get unpushed commits in a Git repository
 * @param {string} repoPath - Path to the repository
 * @returns {Object} Information about unpushed commits
 */
export async function getUnpushedCommits(repoPath) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      return { isGitRepo: false };
    }
    
    // Check if the repository has a remote
    let remotes;
    try {
      remotes = await git.remote(['get-url', 'origin']);
    } catch (error) {
      // No remote found
      return {
        isGitRepo: true,
        hasRemote: false,
        message: 'No remote repository found'
      };
    }
    
    // Get current branch
    const branchInfo = await git.branch();
    const currentBranch = branchInfo.current;
    
    // Check if the current branch has an upstream branch
    let hasUpstream = false;
    try {
      // This will throw an error if there's no upstream branch
      await git.raw(['rev-parse', '--abbrev-ref', `${currentBranch}@{upstream}`]);
      hasUpstream = true;
    } catch (error) {
      // No upstream branch
      return {
        isGitRepo: true,
        hasRemote: true,
        hasUpstream: false,
        branch: currentBranch,
        message: `Branch '${currentBranch}' does not have an upstream branch`
      };
    }
    
    // Get unpushed commits (commits in HEAD that are not in the upstream branch)
    const unpushedLog = await git.log(['@{u}..HEAD']);
    
    return {
      isGitRepo: true,
      hasRemote: true,
      hasUpstream: true,
      branch: currentBranch,
      unpushedCount: unpushedLog.total,
      commits: unpushedLog.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
      }))
    };
  } catch (error) {
    console.error('Error getting unpushed commits:', error);
    return { 
      isGitRepo: false,
      error: error.message 
    };
  }
}

/**
 * Get uncommitted changes in a Git repository
 * @param {string} repoPath - Path to the repository
 * @returns {Object} Information about uncommitted changes
 */
export async function getUncommittedChanges(repoPath) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      return { isGitRepo: false };
    }
    
    // Get status of files
    const status = await git.status();
    
    // Get current branch
    const branchInfo = await git.branch();
    const currentBranch = branchInfo.current;
    
    // Prepare the result object
    const result = {
      isGitRepo: true,
      branch: currentBranch,
      summary: {
        hasChanges: false,
        modifiedCount: 0,
        stagedCount: 0,
        untrackedCount: 0,
        totalChanges: 0
      },
      modified: [],
      staged: [],
      untracked: []
    };
    
    // Process modified files (unstaged changes)
    if (status.modified && status.modified.length > 0) {
      result.summary.modifiedCount = status.modified.length;
      result.summary.hasChanges = true;
      result.summary.totalChanges += status.modified.length;
      
      // Get diff for each modified file
      for (const filePath of status.modified) {
        try {
          // Get diff between working directory and HEAD for this file
          const diffResult = await git.diff(['HEAD', '--', filePath]);
          
          result.modified.push({
            path: filePath,
            status: 'modified',
            staged: false,
            diff: diffResult
          });
        } catch (error) {
          console.error(`Error getting diff for ${filePath}:`, error);
          result.modified.push({
            path: filePath,
            status: 'modified',
            staged: false,
            error: error.message
          });
        }
      }
    }
    
    // Process staged files
    const stagedFiles = [
      ...(status.staged || []),
      ...(status.created || []),
      ...(status.renamed || [])
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    if (stagedFiles.length > 0) {
      result.summary.stagedCount = stagedFiles.length;
      result.summary.hasChanges = true;
      result.summary.totalChanges += stagedFiles.length;
      
      // Get diff for each staged file
      for (const filePath of stagedFiles) {
        try {
          // Get diff for staged changes
          const diffResult = await git.diff(['--cached', '--', filePath]);
          
          result.staged.push({
            path: filePath,
            status: status.created && status.created.includes(filePath) ? 'created' : 
                   status.renamed && status.renamed.includes(filePath) ? 'renamed' : 'modified',
            staged: true,
            diff: diffResult
          });
        } catch (error) {
          console.error(`Error getting diff for staged ${filePath}:`, error);
          result.staged.push({
            path: filePath,
            status: status.created && status.created.includes(filePath) ? 'created' : 
                   status.renamed && status.renamed.includes(filePath) ? 'renamed' : 'modified',
            staged: true,
            error: error.message
          });
        }
      }
    }
    
    // Process deleted files
    if (status.deleted && status.deleted.length > 0) {
      result.summary.deletedCount = status.deleted.length;
      result.summary.hasChanges = true;
      result.summary.totalChanges += status.deleted.length;
      
      for (const filePath of status.deleted) {
        result.modified.push({
          path: filePath,
          status: 'deleted',
          staged: false
        });
      }
    }
    
    // Process untracked files
    if (status.not_added && status.not_added.length > 0) {
      // Filter out modified files that are already counted
      const untrackedFiles = status.not_added.filter(file => 
        !status.modified.includes(file) && 
        !status.deleted.includes(file)
      );
      
      result.summary.untrackedCount = untrackedFiles.length;
      result.summary.hasChanges = result.summary.hasChanges || untrackedFiles.length > 0;
      result.summary.totalChanges += untrackedFiles.length;
      result.untracked = untrackedFiles;
    }
    
    return result;
  } catch (error) {
    console.error('Error getting uncommitted changes:', error);
    return { 
      isGitRepo: false,
      error: error.message 
    };
  }
}

/**
 * Parse git diff output into a more structured format
 * @param {string} diffOutput - Raw diff output from git
 * @returns {Object} Structured diff information
 */
function parseDiffOutput(diffOutput) {
  if (!diffOutput || diffOutput.trim() === '') {
    return { changes: [] };
  }
  
  const lines = diffOutput.split('\n');
  const changes = [];
  
  let currentFile = null;
  let currentHunk = null;
  
  for (const line of lines) {
    // File header
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        changes.push(currentFile);
      }
      currentFile = {
        header: line,
        hunks: []
      };
      currentHunk = null;
    } 
    // File metadata
    else if (line.startsWith('---') || line.startsWith('+++')) {
      if (currentFile) {
        currentFile[line.startsWith('---') ? 'oldFile' : 'newFile'] = line;
      }
    } 
    // Hunk header
    else if (line.startsWith('@@')) {
      if (currentFile) {
        currentHunk = {
          header: line,
          lines: []
        };
        currentFile.hunks.push(currentHunk);
      }
    } 
    // Content lines
    else if (currentHunk) {
      currentHunk.lines.push({
        type: line.startsWith('+') ? 'added' : 
              line.startsWith('-') ? 'removed' : 
              'context',
        content: line
      });
    }
  }
  
  // Add the last file if it exists
  if (currentFile) {
    changes.push(currentFile);
  }
  
  return { changes };
}
