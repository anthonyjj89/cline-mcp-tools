#!/usr/bin/env node

/**
 * Test script to verify the latest chat fix
 * 
 * This script tests the listChats function in chat-service.js to ensure
 * it's sorting chats based on the modification time of the files inside
 * the directories, not based on the directory name.
 */

import fs from 'fs-extra';
import path from 'path';
import { listChats } from '../Cline-Chat-Reader/build/services/chat-service.js';
import { getApiConversationFilePath, getUiMessagesFilePath } from '../Cline-Chat-Reader/build/utils/paths-chat.js';

// Get the VS Code chats directory
function getVSCodeChatsDirectory() {
  const homedir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'tasks');
}

// Get the modification times of the files inside a chat directory
async function getChatFilesModificationTimes(chatsDir, chatId) {
  const apiFilePath = getApiConversationFilePath(chatsDir, chatId);
  const uiFilePath = getUiMessagesFilePath(chatsDir, chatId);
  
  let apiMtime = 0;
  let uiMtime = 0;
  
  try {
    if (await fs.pathExists(apiFilePath)) {
      const apiStats = await fs.stat(apiFilePath);
      apiMtime = apiStats.mtime.getTime();
    }
  } catch (e) {
    console.warn(`Error accessing API file for chat ${chatId}:`, e);
  }
  
  try {
    if (await fs.pathExists(uiFilePath)) {
      const uiStats = await fs.stat(uiFilePath);
      uiMtime = uiStats.mtime.getTime();
    }
  } catch (e) {
    console.warn(`Error accessing UI file for chat ${chatId}:`, e);
  }
  
  return {
    apiMtime,
    uiMtime,
    lastActivityTimestamp: Math.max(apiMtime, uiMtime)
  };
}

// Main test function
async function testLatestChatFix() {
  try {
    const chatsDir = getVSCodeChatsDirectory();
    console.log(`Using VS Code chats directory: ${chatsDir}`);
    
    // Get the list of chats using the listChats function
    console.log('\nGetting chats using listChats function...');
    const chats = await listChats(chatsDir);
    
    if (chats.length === 0) {
      console.log('No chats found.');
      return;
    }
    
    console.log(`\nFound ${chats.length} chats.`);
    console.log('\nChats sorted by listChats function (should be by last activity):');
    
    // Print the chats sorted by the listChats function
    for (let i = 0; i < Math.min(5, chats.length); i++) {
      const chat = chats[i];
      const times = await getChatFilesModificationTimes(chatsDir, chat.id);
      
      console.log(`[${i}] Chat ID: ${chat.id}`);
      console.log(`    Creation Timestamp: ${chat.timestamp} (${new Date(chat.timestamp).toLocaleString()})`);
      console.log(`    API File Modification: ${times.apiMtime > 0 ? new Date(times.apiMtime).toLocaleString() : 'N/A'}`);
      console.log(`    UI File Modification: ${times.uiMtime > 0 ? new Date(times.uiMtime).toLocaleString() : 'N/A'}`);
      console.log(`    Last Activity: ${times.lastActivityTimestamp > 0 ? new Date(times.lastActivityTimestamp).toLocaleString() : 'N/A'}`);
      console.log('');
    }
    
    // Get all directories in the chats directory
    const dirs = await fs.readdir(chatsDir, { withFileTypes: true });
    
    // Filter for directories only
    const chatDirs = dirs
      .filter(dir => dir.isDirectory())
      .map(dir => {
        const id = dir.name;
        const timestamp = parseInt(id, 10) || 0; // Convert directory name to timestamp
        return { id, timestamp };
      })
      // Sort by timestamp descending (newest first)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('\nChats sorted by directory name (old method):');
    
    // Print the chats sorted by directory name
    for (let i = 0; i < Math.min(5, chatDirs.length); i++) {
      const chat = chatDirs[i];
      const times = await getChatFilesModificationTimes(chatsDir, chat.id);
      
      console.log(`[${i}] Chat ID: ${chat.id}`);
      console.log(`    Creation Timestamp: ${chat.timestamp} (${new Date(chat.timestamp).toLocaleString()})`);
      console.log(`    API File Modification: ${times.apiMtime > 0 ? new Date(times.apiMtime).toLocaleString() : 'N/A'}`);
      console.log(`    UI File Modification: ${times.uiMtime > 0 ? new Date(times.uiMtime).toLocaleString() : 'N/A'}`);
      console.log(`    Last Activity: ${times.lastActivityTimestamp > 0 ? new Date(times.lastActivityTimestamp).toLocaleString() : 'N/A'}`);
      console.log('');
    }
    
    // Verify that the chats are sorted correctly
    console.log('\nVerifying sort order...');
    
    // Get all chat directories with their last activity timestamp
    const chatDirsWithActivity = [];
    
    for (const chat of chatDirs) {
      const times = await getChatFilesModificationTimes(chatsDir, chat.id);
      chatDirsWithActivity.push({
        ...chat,
        lastActivityTimestamp: times.lastActivityTimestamp
      });
    }
    
    // Sort by last activity timestamp descending (newest first)
    chatDirsWithActivity.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
    
    // Compare the order of chats from listChats with the order of chats sorted by last activity
    let isCorrectlySorted = true;
    
    for (let i = 0; i < Math.min(chats.length, chatDirsWithActivity.length); i++) {
      if (chats[i].id !== chatDirsWithActivity[i].id) {
        isCorrectlySorted = false;
        console.log(`Mismatch at position ${i}:`);
        console.log(`  listChats: ${chats[i].id} (${new Date(chats[i].timestamp).toLocaleString()})`);
        console.log(`  Expected: ${chatDirsWithActivity[i].id} (${new Date(chatDirsWithActivity[i].lastActivityTimestamp).toLocaleString()})`);
      }
    }
    
    if (isCorrectlySorted) {
      console.log('\nSUCCESS: Chats are correctly sorted by last activity timestamp!');
    } else {
      console.log('\nFAILURE: Chats are not sorted correctly by last activity timestamp.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLatestChatFix();
