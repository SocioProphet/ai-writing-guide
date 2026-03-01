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
