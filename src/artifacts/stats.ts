/**
 * Artifact Index Statistics
 *
 * Reports index health, coverage, and distribution metrics.
 *
 * @implements #418
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/stats.test.ts
 */

import fs from 'fs';
import path from 'path';
import { loadIndexStats, indexExists } from './index-reader.js';

export interface StatsOptions {
  json?: boolean;
}

/**
 * Count total .md/.yaml/.json files under .aiwg/ (excluding .index/)
 */
function countArtifactFiles(cwd: string): number {
  const aiwgDir = path.join(cwd, '.aiwg');
  if (!fs.existsSync(aiwgDir)) return 0;

  let count = 0;
  const extensions = ['.md', '.yaml', '.json'];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.')) continue; // Skip .index, etc.
        walk(full);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        count++;
      }
    }
  }

  walk(aiwgDir);
  return count;
}

/**
 * Show artifact index statistics
 */
export async function showStats(
  cwd: string,
  options: StatsOptions = {}
): Promise<void> {
  if (!indexExists(cwd)) {
    console.error('Error: No artifact index found.');
    console.log("Run 'aiwg index build' first to create the index.");
    process.exit(1);
  }

  const stats = loadIndexStats(cwd);
  if (!stats) {
    console.error('Error: Failed to load index statistics.');
    process.exit(1);
  }

  if (options.json) {
    // Add coverage info
    const totalFiles = countArtifactFiles(cwd);
    console.log(JSON.stringify({
      ...stats,
      coverage: {
        indexed: stats.totalArtifacts,
        totalFiles,
        percentage: totalFiles > 0 ? Math.round((stats.totalArtifacts / totalFiles) * 100) : 100,
      },
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log('Artifact Index Statistics');
  console.log('─'.repeat(40));
  console.log(`Index version: ${stats.version}`);
  console.log(`Last built:    ${stats.builtAt}`);
  console.log(`Build time:    ${stats.buildTimeMs}ms`);
  console.log('');

  // By phase
  console.log('Artifacts by Phase:');
  const phases = Object.entries(stats.byPhase).sort((a, b) => b[1] - a[1]);
  for (const [phase, count] of phases) {
    console.log(`  ${phase.padEnd(20)} ${count} artifacts`);
  }
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(12)}`);
  console.log(`  ${'Total'.padEnd(20)} ${stats.totalArtifacts} artifacts`);
  console.log('');

  // By type
  console.log('Artifacts by Type:');
  const types = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of types) {
    console.log(`  ${type.padEnd(20)} ${count}`);
  }
  console.log('');

  // Tags
  const tagEntries = Object.entries(stats.tagDistribution).sort((a, b) => b[1] - a[1]);
  if (tagEntries.length > 0) {
    console.log('Tags (top 10):');
    const top10 = tagEntries.slice(0, 10);
    console.log(`  ${top10.map(([tag, count]) => `${tag} (${count})`).join(', ')}`);
    console.log('');
  }

  // Dependency graph
  console.log('Dependency Graph:');
  console.log(`  Total edges:        ${stats.graphMetrics.totalEdges}`);
  console.log(`  Orphaned artifacts: ${stats.graphMetrics.orphanedArtifacts}`);
  if (stats.graphMetrics.mostReferenced) {
    console.log(`  Most referenced:    ${stats.graphMetrics.mostReferenced.path} (${stats.graphMetrics.mostReferenced.count} dependents)`);
  }
  console.log('');

  // Coverage
  const totalFiles = countArtifactFiles(cwd);
  const coverage = totalFiles > 0
    ? Math.round((stats.totalArtifacts / totalFiles) * 100)
    : 100;
  console.log('Index Health:');
  console.log(`  Coverage: ${stats.totalArtifacts}/${totalFiles} artifacts indexed (${coverage}%)`);
}
