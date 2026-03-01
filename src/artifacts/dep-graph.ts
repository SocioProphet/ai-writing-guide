/**
 * Artifact Dependency Graph
 *
 * Traverses the artifact dependency graph built from @-mention relationships.
 * Shows upstream (what this depends on) and downstream (what depends on this).
 *
 * @implements #417
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/dep-graph.test.ts
 */

import type { DependencyGraph } from './types.js';
import { loadDependencyGraph, indexExists } from './index-reader.js';

export interface DepsOptions {
  direction?: 'upstream' | 'downstream' | 'both';
  depth?: number;
  json?: boolean;
}

interface TraversalResult {
  path: string;
  depth: number;
  children: TraversalResult[];
}

/**
 * Traverse the dependency graph in one direction
 */
function traverse(
  graph: DependencyGraph,
  startPath: string,
  direction: 'upstream' | 'downstream',
  maxDepth: number,
  visited: Set<string> = new Set(),
  currentDepth: number = 0
): TraversalResult[] {
  if (currentDepth >= maxDepth) return [];

  const node = graph[startPath];
  if (!node) return [];

  const neighbors = direction === 'upstream' ? node.upstream : node.downstream;
  const results: TraversalResult[] = [];

  for (const neighbor of neighbors) {
    if (visited.has(neighbor)) continue; // Cycle detection
    visited.add(neighbor);

    const children = traverse(graph, neighbor, direction, maxDepth, visited, currentDepth + 1);
    results.push({ path: neighbor, depth: currentDepth + 1, children });
  }

  return results;
}

/**
 * Format tree output for human readability
 */
function formatTree(results: TraversalResult[], prefix: string = ''): string {
  let output = '';
  for (let i = 0; i < results.length; i++) {
    const isLast = i === results.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    output += `${prefix}${connector}${results[i].path}\n`;
    if (results[i].children.length > 0) {
      output += formatTree(results[i].children, prefix + childPrefix);
    }
  }
  return output;
}

/**
 * Flatten traversal results into a unique path list
 */
function flattenResults(results: TraversalResult[]): string[] {
  const paths: string[] = [];
  for (const r of results) {
    paths.push(r.path);
    paths.push(...flattenResults(r.children));
  }
  return [...new Set(paths)];
}

/**
 * Show dependencies for an artifact
 */
export async function showDeps(
  cwd: string,
  artifactPath: string,
  options: DepsOptions = {}
): Promise<void> {
  const { direction = 'both', depth = 3, json = false } = options;

  if (!indexExists(cwd)) {
    console.error('Error: No artifact index found.');
    console.log("Run 'aiwg index build' first to create the index.");
    process.exit(1);
  }

  const graph = loadDependencyGraph(cwd);
  if (!graph) {
    console.error('Error: Failed to load dependency graph.');
    process.exit(1);
  }

  if (!graph[artifactPath]) {
    console.error(`Error: '${artifactPath}' not found in the dependency index.`);
    console.log('Check the path or run `aiwg index build` to refresh.');
    process.exit(1);
  }

  const showUpstream = direction === 'upstream' || direction === 'both';
  const showDownstream = direction === 'downstream' || direction === 'both';

  const upstreamResults = showUpstream
    ? traverse(graph, artifactPath, 'upstream', depth, new Set([artifactPath]))
    : [];
  const downstreamResults = showDownstream
    ? traverse(graph, artifactPath, 'downstream', depth, new Set([artifactPath]))
    : [];

  if (json) {
    console.log(JSON.stringify({
      artifact: artifactPath,
      direction,
      depth,
      upstream: flattenResults(upstreamResults),
      downstream: flattenResults(downstreamResults),
      upstreamCount: flattenResults(upstreamResults).length,
      downstreamCount: flattenResults(downstreamResults).length,
    }, null, 2));
  } else {
    console.log(`Dependencies for ${artifactPath}:`);
    console.log('');

    if (showUpstream) {
      console.log('  UPSTREAM (this artifact depends on):');
      if (upstreamResults.length === 0) {
        console.log('    (none)');
      } else {
        const tree = formatTree(upstreamResults, '    ');
        process.stdout.write(tree);
      }
      console.log('');
    }

    if (showDownstream) {
      console.log('  DOWNSTREAM (depends on this artifact):');
      if (downstreamResults.length === 0) {
        console.log('    (none)');
      } else {
        const tree = formatTree(downstreamResults, '    ');
        process.stdout.write(tree);
      }
      console.log('');
    }

    const upCount = flattenResults(upstreamResults).length;
    const downCount = flattenResults(downstreamResults).length;
    console.log(`  Upstream: ${upCount} | Downstream: ${downCount} | Total: ${upCount + downCount}`);
  }
}
