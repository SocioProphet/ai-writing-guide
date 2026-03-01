/**
 * Artifact Index Reader
 *
 * Shared utility to load .aiwg/.index/ JSON files.
 * Used by query, deps, and stats commands.
 *
 * @implements #420
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/index-reader.test.ts
 */

import fs from 'fs';
import path from 'path';
import type {
  ArtifactIndex,
  TagIndex,
  DependencyGraph,
  IndexStats,
} from './types.js';
import { INDEX_DIR } from './types.js';

/**
 * Load a JSON file from the index directory
 *
 * @param cwd - Project root directory
 * @param filename - JSON file to load (e.g. 'metadata.json')
 * @returns Parsed JSON or null if file doesn't exist or is corrupt
 */
export function loadIndexFile<T>(cwd: string, filename: string): T | null {
  const filePath = path.join(cwd, INDEX_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Load the master metadata index
 */
export function loadMetadataIndex(cwd: string): ArtifactIndex | null {
  return loadIndexFile<ArtifactIndex>(cwd, 'metadata.json');
}

/**
 * Load the tag reverse index
 */
export function loadTagIndex(cwd: string): TagIndex | null {
  return loadIndexFile<TagIndex>(cwd, 'tags.json');
}

/**
 * Load the dependency graph
 */
export function loadDependencyGraph(cwd: string): DependencyGraph | null {
  return loadIndexFile<DependencyGraph>(cwd, 'dependencies.json');
}

/**
 * Load the index statistics
 */
export function loadIndexStats(cwd: string): IndexStats | null {
  return loadIndexFile<IndexStats>(cwd, 'stats.json');
}

/**
 * Check if an index exists
 */
export function indexExists(cwd: string): boolean {
  const metadataPath = path.join(cwd, INDEX_DIR, 'metadata.json');
  return fs.existsSync(metadataPath);
}

/**
 * Write a JSON file to the index directory atomically
 *
 * Uses write-to-temp + rename for POSIX-safe atomic writes.
 *
 * @param cwd - Project root directory
 * @param filename - JSON file to write
 * @param data - Data to serialize
 */
export function writeIndexFile(cwd: string, filename: string, data: unknown): void {
  const dirPath = path.join(cwd, INDEX_DIR);
  const filePath = path.join(dirPath, filename);
  const tmpPath = `${filePath}.tmp`;

  // Ensure directory exists
  fs.mkdirSync(dirPath, { recursive: true });

  // Write to temp, then rename (atomic on POSIX)
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}
