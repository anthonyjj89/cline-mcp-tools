/**
 * File analyzer for debugging conversation file issues
 * Provides chunked reading and analysis capabilities
 */

import fs from 'fs-extra';
import path from 'path';
import { logInfo, logDebug, logError } from './diagnostic-logger.js';

export interface FileChunk {
  startByte: number;
  endByte: number;
  content: string;
  hexDump: string;
  analysis: string;
}

export async function analyzeFileChunk(
  filePath: string,
  startByte: number,
  chunkSize: number
): Promise<FileChunk> {
  try {
    // Verify file exists
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // Validate requested chunk
    if (startByte >= fileSize) {
      throw new Error(`Start byte ${startByte} exceeds file size ${fileSize}`);
    }

    const endByte = Math.min(startByte + chunkSize - 1, fileSize - 1);
    const actualChunkSize = endByte - startByte + 1;

    // Read the chunk
    const buffer = Buffer.alloc(actualChunkSize);
    const fd = await fs.open(filePath, 'r');
    await fs.read(fd, buffer, 0, actualChunkSize, startByte);
    await fs.close(fd);

    const content = buffer.toString('utf8');
    const hexDump = buffer.toString('hex').match(/.{1,32}/g)?.join(' ') || '';

    // Basic analysis
    let analysis = '';
    try {
      const json = JSON.parse(content);
      analysis = `Valid JSON structure found. Type: ${Array.isArray(json) ? 'array' : 'object'}`;
    } catch (e) {
      analysis = `JSON parse error: ${(e as Error).message}`;
    }

    return {
      startByte,
      endByte,
      content,
      hexDump,
      analysis
    };

  } catch (error) {
    logError('File analysis error:', error);
    throw error;
  }
}

export async function getFileStructureAnalysis(
  filePath: string,
  chunkSize: number = 1024
): Promise<{
  header: FileChunk;
  middle?: FileChunk;
  footer: FileChunk;
}> {
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;

  // Analyze header
  const header = await analyzeFileChunk(filePath, 0, chunkSize);

  // Analyze middle if file is large enough
  let middle: FileChunk | undefined;
  if (fileSize > chunkSize * 3) {
    const middleStart = Math.floor(fileSize / 2) - Math.floor(chunkSize / 2);
    middle = await analyzeFileChunk(filePath, middleStart, chunkSize);
  }

  // Analyze footer
  const footerStart = Math.max(0, fileSize - chunkSize);
  const footer = await analyzeFileChunk(filePath, footerStart, chunkSize);

  return { header, middle, footer };
}
