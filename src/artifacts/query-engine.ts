/**
 * Artifact Query Engine
 *
 * Searches the artifact index by keyword, type, phase, tags, and path pattern.
 * Returns ranked results in human-readable or JSON format.
 *
 * @implements #416
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/query-engine.test.ts
 */

import { minimatch } from 'minimatch';
import type { QueryParams, QueryResult, MetadataEntry, GraphType, ArtifactIndex } from './types.js';
import { loadMetadataIndex, indexExists, loadGraphIndexFile } from './index-reader.js';

export interface QueryOptions {
  json?: boolean;
  graph?: GraphType;
}

/**
 * Score a metadata entry against a keyword query
 */
function scoreEntry(entry: MetadataEntry, text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Title match (3x weight)
  if (entry.title.toLowerCase().includes(lower)) {
    score += 0.3 * 3;
    // Exact title match bonus
    if (entry.title.toLowerCase() === lower) score += 0.2;
  }

  // Tag match (2x weight)
  for (const tag of entry.tags) {
    if (tag.toLowerCase().includes(lower)) {
      score += 0.2 * 2;
    }
  }

  // Summary match (1x weight)
  if (entry.summary.toLowerCase().includes(lower)) {
    score += 0.15;
  }

  // Path match (0.5x weight)
  if (entry.path.toLowerCase().includes(lower)) {
    score += 0.1;
  }

  // Type match (0.5x weight)
  if (entry.type.toLowerCase().includes(lower)) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * Query the artifact index
 */
export async function queryIndex(
  cwd: string,
  params: QueryParams,
  options: QueryOptions = {}
): Promise<void> {
  const { graph } = options;

  if (!graph && !indexExists(cwd)) {
    console.error('Error: No artifact index found.');
    console.log("Run 'aiwg index build' first to create the index.");
    process.exit(1);
  }

  const startTime = Date.now();
  const index = graph
    ? loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', graph)
    : loadMetadataIndex(cwd);
  if (!index) {
    console.error('Error: Failed to load artifact index.');
    process.exit(1);
  }

  let candidates = Object.values(index.entries);

  // Apply filters
  if (params.type) {
    candidates = candidates.filter(e => e.type === params.type);
  }
  if (params.phase) {
    candidates = candidates.filter(e => e.phase === params.phase);
  }
  if (params.tags && params.tags.length > 0) {
    candidates = candidates.filter(e =>
      params.tags!.every(tag => e.tags.includes(tag))
    );
  }
  if (params.path) {
    candidates = candidates.filter(e => minimatch(e.path, params.path!));
  }
  if (params.updatedAfter) {
    const cutoff = new Date(params.updatedAfter).getTime();
    candidates = candidates.filter(e => new Date(e.updated).getTime() >= cutoff);
  }

  // Score and rank
  let results: QueryResult[];
  if (params.text) {
    results = candidates
      .map(entry => ({ entry, score: scoreEntry(entry, params.text!) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  } else {
    // No keyword — return all filtered results with score 1.0
    results = candidates.map(entry => ({ entry, score: 1.0 }));
  }

  // Apply limit
  const limit = params.limit ?? 20;
  results = results.slice(0, limit);

  const queryTimeMs = Date.now() - startTime;

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      query: { text: params.text, filters: { type: params.type, phase: params.phase, tags: params.tags, path: params.path } },
      results: results.map(r => ({
        path: r.entry.path,
        type: r.entry.type,
        phase: r.entry.phase,
        title: r.entry.title,
        score: Math.round(r.score * 100) / 100,
        summary: r.entry.summary,
      })),
      total: results.length,
      query_time_ms: queryTimeMs,
    }, null, 2));
  } else {
    const queryDesc = params.text ? `"${params.text}"` : 'all';
    console.log(`Results for ${queryDesc} (${results.length} matches, ${queryTimeMs}ms):`);
    console.log('');
    console.log('  #  Score  Type         Phase          Path');

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const num = String(i + 1).padStart(3);
      const score = r.score.toFixed(2).padStart(4);
      const type = r.entry.type.padEnd(12).slice(0, 12);
      const phase = r.entry.phase.padEnd(14).slice(0, 14);
      console.log(`  ${num}  ${score}  ${type} ${phase} ${r.entry.path}`);
    }

    if (results.length === 0) {
      console.log('  No results found.');
    }
    console.log('');
  }
}
