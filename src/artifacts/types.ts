/**
 * Artifact Index Types
 *
 * Shared TypeScript types for the artifact indexing system.
 * Used by index-builder, query-engine, dep-graph, and stats modules.
 *
 * @implements #420
 * @source @src/artifacts/cli.ts
 * @tests @test/unit/artifacts/index-builder.test.ts
 */

/**
 * A single indexed artifact entry
 */
export interface MetadataEntry {
  /** Relative path from project root */
  path: string;

  /** Artifact type (use-case, adr, test-plan, nfr, threat-model, etc.) */
  type: string;

  /** SDLC phase (requirements, architecture, testing, security, deployment, etc.) */
  phase: string;

  /** Title from frontmatter or first heading */
  title: string;

  /** Tags from frontmatter */
  tags: string[];

  /** ISO timestamp — file creation or frontmatter date */
  created: string;

  /** ISO timestamp — file modification */
  updated: string;

  /** Truncated SHA-256 hex (16 chars) for change detection */
  checksum: string;

  /** Brief content summary (max 500 chars) */
  summary: string;

  /** Outbound @-mention references (paths this artifact depends on) */
  dependencies: string[];

  /** Computed: paths that reference this artifact */
  dependents: string[];
}

/**
 * The master artifact index stored at .aiwg/.index/metadata.json
 */
export interface ArtifactIndex {
  /** Index format version */
  version: string;

  /** ISO timestamp of last build */
  builtAt: string;

  /** Build duration in milliseconds */
  buildTimeMs: number;

  /** All indexed entries keyed by path */
  entries: Record<string, MetadataEntry>;
}

/**
 * Tag reverse index stored at .aiwg/.index/tags.json
 */
export interface TagIndex {
  /** Tag name -> array of artifact paths */
  [tag: string]: string[];
}

/**
 * Dependency graph stored at .aiwg/.index/dependencies.json
 */
export interface DependencyGraph {
  /** Path -> upstream and downstream relationships */
  [path: string]: {
    /** Artifacts this one depends on */
    upstream: string[];
    /** Artifacts that depend on this one */
    downstream: string[];
  };
}

/**
 * Index statistics stored at .aiwg/.index/stats.json
 */
export interface IndexStats {
  /** Index format version */
  version: string;

  /** ISO timestamp of last build */
  builtAt: string;

  /** Build duration in milliseconds */
  buildTimeMs: number;

  /** Total artifact count */
  totalArtifacts: number;

  /** Counts by SDLC phase */
  byPhase: Record<string, number>;

  /** Counts by artifact type */
  byType: Record<string, number>;

  /** Tag name -> count */
  tagDistribution: Record<string, number>;

  /** Dependency graph metrics */
  graphMetrics: {
    totalEdges: number;
    orphanedArtifacts: number;
    mostReferenced: { path: string; count: number } | null;
  };
}

/**
 * Result from a query operation
 */
export interface QueryResult {
  /** The matching entry */
  entry: MetadataEntry;

  /** Relevance score (0-1) */
  score: number;
}

/**
 * Query parameters for artifact search
 */
export interface QueryParams {
  /** Keyword search term */
  text?: string;

  /** Filter by path glob pattern */
  path?: string;

  /** Filter by artifact type */
  type?: string;

  /** Filter by SDLC phase */
  phase?: string;

  /** Filter by tags (AND logic) */
  tags?: string[];

  /** Filter by modification date */
  updatedAfter?: string;

  /** Maximum results */
  limit?: number;
}

/**
 * Phase name to directory mapping
 */
export const PHASE_DIRECTORIES: Record<string, string> = {
  requirements: '.aiwg/requirements',
  architecture: '.aiwg/architecture',
  testing: '.aiwg/testing',
  security: '.aiwg/security',
  deployment: '.aiwg/deployment',
  risks: '.aiwg/risks',
  planning: '.aiwg/planning',
  intake: '.aiwg/intake',
  reports: '.aiwg/reports',
};

/**
 * Default index output directory
 */
export const INDEX_DIR = '.aiwg/.index';

/**
 * Current index format version
 */
export const INDEX_VERSION = '1.0.0';

/**
 * Graph types for multi-graph index architecture
 *
 * @implements #421
 */
export type GraphType = 'framework' | 'project' | 'codebase';

/**
 * Graph configuration — defines what each graph indexes
 */
export interface GraphConfig {
  /** Graph type identifier */
  type: GraphType;

  /** Directories to scan (relative to project/framework root) */
  scanDirs: string[];

  /** File extensions to index */
  extensions: string[];

  /** Whether this graph is shared across projects */
  shared: boolean;
}

/**
 * Graph definitions
 */
export const GRAPH_CONFIGS: Record<GraphType, GraphConfig> = {
  framework: {
    type: 'framework',
    scanDirs: ['agentic/code/frameworks', 'agentic/code/addons', 'agentic/code/agents', 'docs'],
    extensions: ['.md', '.yaml', '.json'],
    shared: true,
  },
  project: {
    type: 'project',
    scanDirs: ['.aiwg'],
    extensions: ['.md', '.yaml', '.json'],
    shared: false,
  },
  codebase: {
    type: 'codebase',
    scanDirs: ['src', 'test', 'tools'],
    extensions: ['.ts', '.mts', '.js', '.mjs', '.json', '.yaml'],
    shared: false,
  },
};

/**
 * Get the index output directory for a given graph type
 *
 * @param cwd - Project root
 * @param graphType - Graph type
 * @returns Absolute path to the graph's index directory
 */
export function getGraphIndexDir(cwd: string, graphType: GraphType): string {
  if (graphType === 'framework') {
    // Shared across projects — XDG data directory
    const xdgData = process.env.XDG_DATA_HOME ?? `${process.env.HOME}/.local/share`;
    return `${xdgData}/aiwg/index/framework`;
  }
  return `${cwd}/.aiwg/.index/${graphType}`;
}

/**
 * Framework graph version tracking
 */
export interface FrameworkGraphVersion {
  /** AIWG version when graph was built */
  aiwg_version: string;

  /** Frameworks included in the graph */
  frameworks_installed: string[];

  /** Build timestamp */
  built_at: string;
}
