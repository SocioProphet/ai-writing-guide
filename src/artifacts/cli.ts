/**
 * Artifact Index CLI Commands
 *
 * Provides CLI interface for artifact index operations:
 * - build: Build/rebuild the artifact index
 * - query: Search artifacts by keyword, type, phase, tags
 * - deps:  Show artifact dependency graph
 * - stats: Show index statistics
 *
 * Supports multi-graph architecture via --graph flag:
 * - framework: AIWG framework source (shared, built during `aiwg use`)
 * - project: SDLC artifacts in .aiwg/ (per-project)
 * - codebase: Source code, tests, configs (per-project)
 *
 * @implements #420 #421
 * @source @src/cli/handlers/subcommands.ts
 * @tests @test/unit/artifacts/cli.test.ts
 */

import type { GraphType } from './types.js';

/** Parse --graph flag from args, returns undefined for "all graphs" */
function parseGraphFlag(args: string[]): GraphType | undefined {
  const idx = args.indexOf('--graph');
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  const val = args[idx + 1];
  if (val === 'framework' || val === 'project' || val === 'codebase') return val;
  console.error(`Error: Invalid graph type '${val}'. Valid: framework, project, codebase`);
  process.exit(1);
}

/**
 * Main index command router
 */
export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subcommandArgs = args.slice(1);

  switch (subcommand) {
    case 'build':
      await handleBuild(subcommandArgs);
      break;

    case 'query':
      await handleQuery(subcommandArgs);
      break;

    case 'deps':
      await handleDeps(subcommandArgs);
      break;

    case 'stats':
      await handleStats(subcommandArgs);
      break;

    case undefined:
      console.error('Error: Index subcommand required');
      console.log('');
      console.log('Available subcommands:');
      console.log('  build   Build/rebuild the artifact index');
      console.log('  query   Search artifacts by keyword, type, phase, tags');
      console.log('  deps    Show artifact dependency graph');
      console.log('  stats   Show index statistics');
      console.log('');
      console.log('Options:');
      console.log('  --graph <type>  Target a specific graph (framework, project, codebase)');
      console.log('');
      console.log('Examples:');
      console.log('  aiwg index build');
      console.log('  aiwg index build --graph codebase --force');
      console.log('  aiwg index query "authentication" --type use-case');
      console.log('  aiwg index query "security rules" --graph framework --json');
      console.log('  aiwg index deps .aiwg/requirements/UC-001.md');
      console.log('  aiwg index stats --json');
      console.log('  aiwg index stats --graph project');
      process.exit(1);
      break;

    default:
      console.error(`Error: Unknown index subcommand '${subcommand}'`);
      console.log('Available: build, query, deps, stats');
      process.exit(1);
  }
}

/**
 * Handle 'index build' command
 *
 * Stub — full implementation in #415
 */
async function handleBuild(args: string[]): Promise<void> {
  // Dynamic import to keep the CLI router lightweight
  const { buildIndex } = await import('./index-builder.js');
  const cwd = process.cwd();

  const force = args.includes('--force');
  const verbose = args.includes('--verbose');
  const graph = parseGraphFlag(args);

  let scope: string | undefined;
  const scopeIdx = args.indexOf('--scope');
  if (scopeIdx !== -1 && scopeIdx + 1 < args.length) {
    scope = args[scopeIdx + 1];
  }

  if (graph) {
    // Build a specific graph
    await buildIndex(cwd, { force, verbose, scope, graph });
  } else {
    // Default: build project + codebase (framework is built via `aiwg use`)
    await buildIndex(cwd, { force, verbose, scope, graph: 'project' });
    await buildIndex(cwd, { force, verbose, graph: 'codebase' });
  }
}

/**
 * Handle 'index query' command
 *
 * Stub — full implementation in #416
 */
async function handleQuery(args: string[]): Promise<void> {
  const { queryIndex } = await import('./query-engine.js');
  const cwd = process.cwd();

  // Parse query text (positional args before any -- flags)
  const textParts: string[] = [];
  const flags: string[] = [];
  let inFlags = false;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      inFlags = true;
    }
    if (inFlags) {
      flags.push(arg);
    } else {
      textParts.push(arg);
    }
  }

  const text = textParts.join(' ') || undefined;
  const json = flags.includes('--json');

  // Parse filter flags
  let type: string | undefined;
  let phase: string | undefined;
  let tags: string | undefined;
  let updatedAfter: string | undefined;
  let limit: number | undefined;
  let pathPattern: string | undefined;

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--type' && i + 1 < flags.length) { type = flags[++i]; }
    else if (flags[i] === '--phase' && i + 1 < flags.length) { phase = flags[++i]; }
    else if (flags[i] === '--tags' && i + 1 < flags.length) { tags = flags[++i]; }
    else if (flags[i] === '--updated-after' && i + 1 < flags.length) { updatedAfter = flags[++i]; }
    else if (flags[i] === '--limit' && i + 1 < flags.length) { limit = parseInt(flags[++i], 10); }
    else if (flags[i] === '--path' && i + 1 < flags.length) { pathPattern = flags[++i]; }
  }

  const graph = parseGraphFlag(flags);

  await queryIndex(cwd, {
    text,
    type,
    phase,
    tags: tags?.split(','),
    updatedAfter,
    limit,
    path: pathPattern,
  }, { json, graph });
}

/**
 * Handle 'index deps' command
 *
 * Stub — full implementation in #417
 */
async function handleDeps(args: string[]): Promise<void> {
  const { showDeps } = await import('./dep-graph.js');
  const cwd = process.cwd();

  // First non-flag arg is the artifact path
  const artifactPath = args.find(a => !a.startsWith('--'));
  if (!artifactPath) {
    console.error('Error: Artifact path required');
    console.log('Usage: aiwg index deps <path> [--direction upstream|downstream|both] [--depth N] [--json]');
    process.exit(1);
  }

  const json = args.includes('--json');

  let direction: 'upstream' | 'downstream' | 'both' = 'both';
  const dirIdx = args.indexOf('--direction');
  if (dirIdx !== -1 && dirIdx + 1 < args.length) {
    const val = args[dirIdx + 1];
    if (val === 'upstream' || val === 'downstream' || val === 'both') {
      direction = val;
    }
  }

  let depth = 3;
  const depthIdx = args.indexOf('--depth');
  if (depthIdx !== -1 && depthIdx + 1 < args.length) {
    depth = parseInt(args[depthIdx + 1], 10);
  }

  const graph = parseGraphFlag(args);

  await showDeps(cwd, artifactPath, { direction, depth, json, graph });
}

/**
 * Handle 'index stats' command
 *
 * Stub — full implementation in #418
 */
async function handleStats(args: string[]): Promise<void> {
  const { showStats } = await import('./stats.js');
  const cwd = process.cwd();

  const json = args.includes('--json');

  const graph = parseGraphFlag(args);

  await showStats(cwd, { json, graph });
}
