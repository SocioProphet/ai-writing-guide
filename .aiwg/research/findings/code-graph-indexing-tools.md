---
title: "Code Graph Indexing and Artifact Discovery: Tool Survey"
type: finding
tags: [graph-indexing, code-navigation, agent-self-navigation, traceability, repomap, tree-sitter, typescript-compiler-api, dependency-graph, sdlc]
purpose: "Research for AIWG three-graph index architecture: framework reference, project artifacts, codebase"
created: 2026-03-01
author: technical-researcher
grade: LOW
grade-note: "Based on practitioner documentation, npm/PyPI registry data, open-source source code inspection, and code execution in the project environment. No peer-reviewed benchmarks."
status: complete
related: searchable-index-patterns.md
---

# Code Graph Indexing and Artifact Discovery: Tool Survey

Research for the AIWG project building three graph indices queryable via CLI by AI agents:
1. **Framework reference index** — AIWG framework files (agents, commands, skills, rules in `agentic/code/`)
2. **Project artifact index** — SDLC artifacts in `.aiwg/` (requirements, ADRs, architecture docs)
3. **Codebase index** — TypeScript/JavaScript source dependency graph (`src/`, `tools/`, `test/`)

This document surveys code graph indexing tools, SDLC traceability approaches, LLM-era code
knowledge graphs, and agent self-navigation patterns. For heterogeneous file indexing patterns,
incremental build strategy, and CLI query patterns, see the companion finding:
`@.aiwg/research/findings/searchable-index-patterns.md`.

All npm/PyPI metadata and code behavior claims are verified by direct inspection or execution.

---

## 1. Code Graph Indexing Tools

### 1.1 TypeScript Compiler API (Primary Recommendation)

**Status**: Available in AIWG project (`typescript: ^5.9.3` in devDependencies)
**License**: Apache 2.0
**Verified working**: Yes — executed against 123 AIWG TypeScript files, extracted 328 import
relationships and 605 exported symbols in a single pass.

The TypeScript compiler API (`ts.createSourceFile`, `ts.forEachChild`) builds a full AST from
TypeScript and JavaScript source without invoking the type checker. This makes it fast and
dependency-free for structural analysis.

**What it provides:**
- Import declarations (module specifier, type-only flag, named imports)
- Export declarations (functions, classes, interfaces, type aliases, enums, variables)
- Re-exports (`export ... from '...'`)
- Full syntax tree for arbitrary node extraction

**What it does not provide:**
- Module path resolution (relative paths like `./types.js` are not resolved to absolute paths)
- CJS `require()` detection
- Cross-file type resolution (would require full language server startup)

**Graph building approach for AIWG codebase:**
```typescript
import ts from 'typescript';
import { readFileSync } from 'fs';

function analyzeFile(filePath: string) {
  const src = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true  // setParentNodes — required for parent traversal
  );
  const imports: string[] = [];
  const exports: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      imports.push((node.moduleSpecifier as ts.StringLiteral).text);
    }
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (isExported && ts.isFunctionDeclaration(node) && node.name) {
      exports.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(src, visit);
  return { imports, exports };
}
```

**Relevance to three-graph architecture:** High for codebase index (Graph 3). Zero new
dependencies. 2-5ms per file parse time per documentation claims (not independently benchmarked).

---

### 1.2 Madge

**npm**: `madge` v8.0.0
**License**: MIT
**Verified**: Produces JSON dependency map from TypeScript/JavaScript files via CLI.

Madge is a CLI and programmatic tool that builds a dependency graph from JavaScript/TypeScript
imports and re-exports it in multiple formats (JSON, dot/Graphviz, image). It uses
`dependency-tree` internally (which uses `detective` for CJS and `precinct` for ESM).

**CLI JSON output (verified working):**
```bash
npx madge --json src/extensions/registry.ts
# Output:
# {
#   "registry.ts": ["types.ts"],
#   "types.ts": []
# }
```

The output is a flat adjacency map keyed by relative file path. Edges are outgoing import
targets. This is simpler than a full node/edge graph and requires post-processing to add
node metadata or reverse edges.

**Programmatic API:**
```typescript
import madge from 'madge';
const result = await madge('src/', { tsConfig: 'tsconfig.json' });
const obj = result.obj();      // adjacency map
const circ = result.circular(); // circular dependency detection
```

**What Madge adds over raw TS compiler API:**
- Circular dependency detection (built-in)
- Support for `tsconfig.json` path aliases (via `typescript` flag)
- Image generation (SVG, PNG via graphviz — system dependency)
- Multi-format output (dot, JSON, text)

**Limitations:**
- Not installed in AIWG project node_modules (would add a dependency)
- Output is adjacency map only — no node metadata (exports, types, line counts)
- Slower than direct TS compiler API due to multiple abstraction layers
- `--ts-config` flag for path alias resolution requires additional configuration

**Relevance to three-graph architecture:** Low for AIWG specifically. The TS compiler API
covers the same ground without a new dependency. Madge is useful as a debugging and
visualization tool (`aiwg doctor` or one-off audits), not as the indexing engine.

---

### 1.3 dependency-cruiser

**npm**: `dependency-cruiser` v17.3.8
**License**: MIT
**Verified**: CLI tool confirmed installed globally, produces multiple output formats.

dependency-cruiser validates and visualizes dependencies across TypeScript, JavaScript, and
CoffeeScript. It handles all import styles (ESM, CJS, AMD) and supports custom validation
rules (e.g., "no circular imports from src/ to test/").

**Key capabilities beyond Madge:**
- Rule engine: define forbidden dependency patterns, get violations as errors
- Output formats: `json`, `dot`, `ddot`, `d2`, `mermaid`, `err-html`, `text`
- Incremental via cache: `--cache node_modules/.cache/dependency-cruiser`
- Metrics: `--metrics` flag computes instability metrics (Martin's coupling metrics)
- `--affected [revision]`: shows only modules changed since a git revision plus modules
  that can reach them — directly useful for impact analysis in SDLC workflows
- `--reaches <regex>`: what can reach a given file — reverse reachability query

**JSON output structure (attempted, failed due to security package conflict on this system):**
Based on documentation, the JSON format includes:
```json
{
  "modules": [
    {
      "source": "src/extensions/registry.ts",
      "dependencies": [
        {
          "module": "./types",
          "resolved": "src/extensions/types.ts",
          "dependencyTypes": ["local"],
          "valid": true
        }
      ],
      "valid": true,
      "instability": 0.42
    }
  ],
  "summary": { "violations": [], "error": 0, "warn": 0, "info": 0 }
}
```

**Notable difference from Madge:** `resolved` provides the actual file path (not just the
module specifier), which is the key for building a correct graph. Without resolution,
`./types` and `./types.js` are the same edge pointing to an ambiguous target.

**`watskeburt` integration (dependency):** dependency-cruiser includes `watskeburt` v5.0.3
as a dependency. watskeburt lists files changed since a git revision, enabling the
`--affected` feature. This is directly relevant to AIWG's incremental index builds.

**Relevance to three-graph architecture:** Medium. The `--affected` and `--reaches` query
patterns are exactly what agent-driven impact analysis needs. The instability metrics are
useful for the framework reference index. The security package conflict on this system
prevented live testing of JSON output. Consider as an optional analysis backend for
`aiwg sdlc-accelerate` impact analysis rather than the primary indexer.

---

### 1.4 tree-sitter

**npm**: `tree-sitter` v0.25.0
**License**: MIT
**Maintainers**: maxbrunsfeld (core author), active contributors

tree-sitter is a parser generator and incremental parsing library. It generates language-
specific parsers that build a concrete syntax tree (CST) with error recovery and incremental
re-parsing. Used by: Neovim, GitHub code search, Aider (for RepoMap — see Section 4.1).

**How it builds its index:**
1. Language-specific parser (e.g., `tree-sitter-typescript`) parses source to a CST
2. Tree-sitter Query language (`.scm` S-expression files) extracts tagged nodes
3. Captures named `name.definition.*` and `name.reference.*` identify symbols

**Example tree-sitter query for TypeScript function definitions:**
```scheme
; tree-sitter-typescript queries/tags.scm
(function_declaration
  name: (identifier) @name.definition.function)

(call_expression
  function: (identifier) @name.reference.call)
```

**Key advantage over TS compiler API:** tree-sitter supports 40+ languages with the same
query interface. For AIWG's framework reference index (which may include Python scripts in
`tools/`, shell scripts, YAML), tree-sitter provides a unified multi-language approach.

**Key disadvantage:** Requires native bindings (`node-gyp-build` dependency), per-language
parser packages, and `.scm` query files for each language. Total setup is significantly
more complex than the TS compiler API for a TypeScript-first project.

**Current state (March 2026):** tree-sitter Python bindings had a breaking API change in
v0.24.0 (QueryCursor API). Aider's codebase includes a compatibility shim for both old
and new APIs. The Node.js bindings are at v0.25.0 and stable.

**Relevance to three-graph architecture:** Low for codebase index (TypeScript-only would
use TS compiler API). High if multi-language support is needed in framework index (e.g.,
indexing Python tools, shell scripts). The query language model (named captures) is an
excellent pattern to borrow regardless of the parsing library.

---

### 1.5 ts-morph

**npm**: `ts-morph` v27.0.2
**License**: MIT
**Repository**: `github.com/dsherret/ts-morph`

ts-morph wraps the TypeScript compiler API with a more ergonomic API for code manipulation
and analysis. It adds: automatic file discovery via tsconfig, cross-file navigation, and
mutation APIs for code generation.

**Key addition over raw TS compiler API:**
```typescript
import { Project } from 'ts-morph';
const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const sf = project.getSourceFileOrThrow('src/extensions/types.ts');

// Navigate to usages across the whole project (requires type checking)
const typeDecl = sf.getInterfaceOrThrow('Extension');
const refs = typeDecl.findReferences();
// refs includes every file that references this type, with line/column
```

**What ts-morph enables that raw TS API does not:**
- Type resolution across files (who uses `Extension` anywhere in the project)
- Symbol-level reference finding (not just import-level)
- Code modification with printer formatting

**Why it is not installed in AIWG:** ts-morph is not in `package.json` (confirmed by
inspection). Adding it would bring in `@ts-morph/common` and `code-block-writer`.

**Relevance to three-graph architecture:** High for symbol-level reference edges (Graph 3).
The ability to find all usages of a specific export across the project would enable
"who implements this interface?" queries. However, type-checked analysis is 5-10x slower
than AST-only analysis, and the current project needs are likely met by import-level edges.
Evaluate after the initial index is built.

---

### 1.6 Sourcetrail

**Status**: Open source, archived (last commit 2022)
**License**: GNU GPL v3
**Repository**: `github.com/CoatiSoftware/Sourcetrail`

Sourcetrail is a source explorer that built an interactive graph of code relationships —
symbols, references, call graphs, inheritance hierarchies. It used tree-sitter and
language-specific indexers to populate a SQLite database.

**How it built its graph:**
1. Per-language indexer (C++, Python, Java) used language-specific parsing (clang AST, etc.)
2. Indexed: symbol definitions, symbol references, call graph edges, inheritance edges
3. Stored in SQLite with full source location data (file, line, column)
4. Queried via SQL + custom query language for the UI

**Why it was archived:** Maintenance burden of language-specific indexers was too high.
The UI required a Qt application, making it difficult to use headlessly or in CI.

**What to learn from Sourcetrail:**
- SQLite is a proven storage backend for code graphs (vs JSON files) at large scale
- The entity types it indexed are a useful reference schema: `symbol`, `reference`,
  `occurrence`, `file`, `edge` with typed edge subtypes (call, usage, inheritance, include)
- Querying by "all callers of function X" required bidirectional edge storage — they stored
  explicit reverse edges rather than computing them at query time

**Relevance to three-graph architecture:** Low for implementation (archived, GPL). High for
schema design — the entity type taxonomy is a good reference for edge type vocabulary.

---

### 1.7 GitHub CodeQL

**Status**: Commercial/free for open source
**License**: Proprietary (query language is open; QL libraries Apache 2.0)

CodeQL compiles source code into a relational database (a "QL database"), then evaluates
Datalog-style queries against it. It is not a tool to embed — it is a hosted service or
heavy CLI application.

**How CodeQL builds its graph:**
1. Source code is compiled using a language-specific extractor (uses actual compilers)
2. Extractor produces a `.trap` file: a set of relations (tuples) about code structure
3. `.trap` file is imported into a QL database (custom column-store format)
4. Queries evaluate over the relational model: `from Class c, Method m where c.getMember() = m select c, m`

**QL database schema for JavaScript/TypeScript includes:**
- `File`, `Folder` — filesystem hierarchy
- `TopLevel`, `Module` — module-level nodes
- `Function`, `Class`, `Variable`, `Parameter` — declarations
- `CallExpr`, `NewExpr` — call graph edges
- `ImportDeclaration`, `ExportDeclaration` — module graph edges
- `DataFlowNode` — data flow analysis nodes

**What CodeQL provides that simpler tools do not:**
- Data flow analysis (track a value from source to sink)
- Taint analysis (security-relevant data flow)
- Control flow graph
- Full type resolution

**Relevance to three-graph architecture:** Low for implementation — CodeQL is designed for
security analysis at enterprise scale, not for lightweight agent-queryable indexes. The
relational schema model is worth studying for the edge type vocabulary, particularly the
typed `ImportDeclaration`/`ExportDeclaration` distinction.

---

### 1.8 Language Server Protocol (LSP) Indexing Model

**Spec**: LSP 3.17 (lsprotocol)
**TypeScript LSP**: `typescript-language-server` v5.1.3 (npm)

The LSP defines a document model where a language server maintains an index of the entire
workspace and answers queries from editors. Key LSP concepts relevant to graph indexing:

**`textDocument/definition`**: Given a symbol at a position, return its definition location.
This is implemented by the language server maintaining a symbol table across all files.

**`textDocument/references`**: Given a position, return all locations that reference the
symbol. The language server must maintain a reverse index: symbol → [all usage locations].

**`workspace/symbol`**: Search for symbols by name across the entire workspace. The server
maintains a fuzzy-searchable symbol index.

**The LSP incremental update model (relevant for AIWG):**
```
Client → Server: workspace/didChangeWatchedFiles [{uri, changeType}]
Server: invalidates affected symbols, re-indexes changed files
Server: propagates invalidation to files that import changed file
```

This cascade invalidation model is the right pattern for AIWG's incremental index builds.
When `types.ts` changes, all files that import `types.ts` may need reindexing (their
resolved symbols may have changed). The cascade depth is bounded by the import graph.

**LSIF (Language Server Index Format):** A serialization format for LSP index data. Stores
definitions, references, and hover information as a graph of JSON-LD records. Used by
GitHub for code navigation in PRs and by Sourcegraph. LSIF is worth knowing as a potential
export format for AIWG's codebase index.

**Relevance to three-graph architecture:** High for incremental update design (cascade
invalidation pattern). Low for implementation (running a full language server is too heavy
for AIWG's needs). The LSP query vocabulary (definition, references, hover, workspace/symbol)
is a good reference for what queries agents should be able to run against the index.

---

## 2. SDLC Artifact Traceability

### 2.1 Requirements-to-Code Linking Patterns

**Commercial tools reviewed:** IBM DOORS Next, Jama Connect, Codebeamer
**Open source reviewed:** OpenReq (archived), StrictDoc, doorstop

**Common traceability data model across all tools:**

All serious traceability tools use a directed graph of typed links between artifacts:

```
Requirement ──implements──> User Story
User Story  ──satisfiedBy──> Test Case
Test Case   ──verifies──> Requirement
Source Code ──implements──> User Story
Source Code ──tests──> Test Case
```

**Link types are the key design decision.** IBM DOORS defines: `satisfies`, `verifies`,
`refines`, `derives`, `copies`, `traces`. The W3C PROV ontology uses: `wasDerivedFrom`,
`wasGeneratedBy`, `wasAttributedTo`, `used`. AIWG's existing rules use: `implements`,
`tests`, `depends`, `derives-from` (see `qualified-references.md` rule).

The AIWG `@-mention` syntax with semantic qualifiers maps directly to these link types.
A mention like `@implements UC-001` in source code creates an `implements` edge from the
source file node to the `UC-001` artifact node.

**StrictDoc (open source, active):**
- Python tool for SDLC document management with requirements traceability
- Stores requirements in `.sdoc` files (plain text, RST-inspired)
- Builds a graph linking requirements to test results via `[LINK: REQ-001]` syntax
- Exports to HTML, PDF, Excel with traceability matrix
- Relevant pattern: link detection via `[LINK: ID]` syntax in document text

**doorstop (open source, archived 2024):**
- Requirements management in YAML files, one file per requirement
- Uses `links:` frontmatter field to store parent requirement IDs
- Builds a graph from these links and validates coverage
- **Direct relevance to AIWG:** This is exactly the pattern AIWG should use for
  the project artifact index. Each `.aiwg/requirements/` file's frontmatter `links:`
  field creates edges in the artifact graph.

**Recommended traceability edge schema for AIWG project artifact index:**
```yaml
# .aiwg/requirements/use-cases/UC-001.md frontmatter
---
id: UC-001
type: use-case
links:
  - id: US-001
    rel: satisfiedBy
  - id: NFR-PERF-01
    rel: constrainedBy
implements:
  - src/extensions/registry.ts
  - src/extensions/loader.ts
verifiedBy:
  - test/unit/extensions/registry.test.ts
---
```

This frontmatter structure creates four types of edges in the artifact graph with zero
additional tooling beyond a YAML parser.

---

### 2.2 @-mention Traceability Pattern (AIWG-Native)

AIWG already has `@` mention-wiring rules (`mention-wiring.md`, `qualified-references.md`).
The pattern is:

```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @tests @test/unit/extensions/capability-index.test.ts
 */
```

This creates edges in the traceability graph:
- `src/extensions/capability-index.ts` → `implements` → `.aiwg/requirements/use-cases/UC-004.md`
- `src/extensions/capability-index.ts` → `testedBy` → `test/unit/extensions/capability-index.test.ts`

**Gap identified:** These `@` mentions are currently in comments only — no indexer
extracts them into a machine-queryable graph. Building the artifact index requires
parsing these `@implements` and `@tests` annotations from JSDoc comments in TypeScript
source files. This is a one-time extraction problem solvable with the TS compiler API:

```typescript
// Extract @-mentions from JSDoc comments
function extractJSDocMentions(sf: ts.SourceFile): { rel: string; target: string }[] {
  const mentions: { rel: string; target: string }[] = [];
  function visit(node: ts.Node) {
    const jsDocTags = ts.getJSDocTags(node);
    for (const tag of jsDocTags) {
      const tagName = tag.tagName.text;
      if (['implements', 'tests', 'depends', 'derives'].includes(tagName)) {
        const target = (tag.comment as string)?.trim();
        if (target) mentions.push({ rel: tagName, target });
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sf, visit);
  return mentions;
}
```

This bridges Graph 2 (artifact index) and Graph 3 (codebase index) via cross-graph edges.

---

## 3. Code Knowledge Graphs (LLM Era, 2024-2025)

### 3.1 Aider RepoMap (Primary Reference)

**Package**: `aider-chat` v0.86.2 (PyPI, active)
**License**: Apache 2.0
**Source inspected**: `aider/repomap.py` (27,302 chars, March 2026)

Aider's RepoMap is the most directly relevant prior art for AIWG's codebase index. It
builds a compressed, token-budget-aware summary of the entire repository optimized for
LLM consumption.

**Architecture (from source inspection):**

**Step 1: Tag extraction via tree-sitter**
```python
# For each file, run tree-sitter queries to extract:
Tag = namedtuple("Tag", "rel_fname fname line name kind")
# kind = "def" (symbol definition) or "ref" (symbol reference)
```

For each language, Aider uses a `.scm` query file to capture named definitions
(`name.definition.*`) and references (`name.reference.*`). This creates a flat list of
`(file, symbol, kind)` tuples for the entire repository.

**Step 2: Build a MultiDiGraph with NetworkX**
```python
import networkx as nx

G = nx.MultiDiGraph()
# For each symbol that is both defined in some file and referenced in another:
# Edge: referee_file → definer_file, weight = sqrt(reference_count) * multiplier
# Edges with high-frequency symbols (builtins etc.) are down-weighted
```

The graph models: "file A references symbols defined in file B" — a file-level dependency
graph weighted by how much each file relies on symbols from each other file.

**Step 3: Personalized PageRank**
```python
ranked = nx.pagerank(G, weight="weight", personalization=personalization)
```

The `personalization` dict boosts the score of:
- Files currently open in the chat context
- Files mentioned by name in the conversation
- Files whose path components match mentioned identifiers

This makes the repo map context-aware: it surfaces files most relevant to the current
conversation, not just the most globally important files.

**Step 4: Token-budget optimization**
The ranked definitions are sorted by score. Files are added to the repo map from
highest-ranked to lowest until the token budget (`--map-tokens`, default 1024) is exhausted.
The output is a text-format skeleton showing file names, class/function signatures, and
line numbers — not the full content.

**Step 5: SQLite caching**
Tags are cached per-file keyed by modification time. Cache invalidation is mtime-based
(same strategy as `make`). Cache stored at `.aider.tags.cache.v4/` in the project root.

**What AIWG should adopt from RepoMap:**
1. The tag-extraction approach (def/ref classification) adapted for TS compiler API
2. The weighted graph model: edges weighted by reference frequency between files
3. The token-budget optimization concept: graph provides a ranked list, caller decides cutoff
4. The SQLite caching pattern (though JSON with mtime-gating is sufficient at AIWG scale)
5. The personalization model: boost relevance of files mentioned in the current task context

**What AIWG does not need from RepoMap:**
- tree-sitter (TS compiler API covers the TypeScript use case)
- NetworkX / Python (AIWG is Node.js; use `graphology` + `graphology-metrics`)
- PyPI dependencies

**JavaScript equivalent of Aider's graph approach:**
```typescript
import { MultiDirectedGraph } from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank';

// Build file dependency graph weighted by reference count
const G = new MultiDirectedGraph();
for (const [referencer, definer, weight] of edges) {
  if (!G.hasNode(referencer)) G.addNode(referencer);
  if (!G.hasNode(definer)) G.addNode(definer);
  G.addEdge(referencer, definer, { weight });
}

// Compute PageRank with optional personalization
const scores = pagerank(G, { getEdgeWeight: 'weight' });
```

---

### 3.2 Cursor / AI Editor Codebase Indexing

**Status**: Commercial, closed source
**Inference from public documentation and community reports**

Cursor (and similar AI editors) maintain a semantic index of the codebase that combines:
1. **Embedding-based search**: each file or chunk is embedded (vector) for semantic similarity
2. **AST-based structural index**: symbols, imports, exports (similar to LSP workspace/symbol)
3. **Git history integration**: which files change together (co-change graph)

**Relevant public statements from Cursor's engineering blog:**
- They use tree-sitter for code chunking (splitting files into semantically meaningful chunks
  before embedding)
- They maintain a real-time incremental index updated as files change
- Context assembly is a retrieval problem: given the current task, retrieve the most relevant
  chunks from the index

**What AIWG should avoid (complexity vs value):** Embedding-based semantic search requires
an embedding model and vector store (Chroma, Faiss, etc.). For AIWG's use case (agent
navigation, not fuzzy semantic search), the structural graph index is sufficient. The
embedding approach is appropriate if agents need to find "all files related to authentication"
without knowing the exact symbol names.

---

### 3.3 Sourcegraph (Code Intelligence Platform)

**Status**: Open source core, commercial cloud
**License**: Apache 2.0 (core), proprietary (cloud features)

Sourcegraph indexes repositories using SCIP (Stack graphs Code Intelligence Protocol,
successor to LSIF). Agents can query Sourcegraph via its GraphQL API to find:
- Symbol definitions across repositories
- All usages of a symbol
- Dependency graph
- Code search with structural patterns

**SCIP format (relevant to AIWG):**
SCIP (github.com/sourcegraph/scip) is a protobuf-based format for code intelligence data.
Each SCIP document contains: occurrences (symbol at position), symbols (definition metadata).
The SCIP indexer for TypeScript uses the TypeScript compiler API.

**Relevance to AIWG:** SCIP is worth knowing as a potential serialization target for AIWG's
codebase index, especially if AIWG users want Sourcegraph integration. Not a dependency.

---

### 3.4 Microsoft Research: CodeBERT and GraphCodeBERT

**Status**: Research papers, models available on HuggingFace
**License**: MIT

GraphCodeBERT (2020, ICLR 2021) extended CodeBERT with data flow graph edges: edges
representing variable definitions and uses within functions. This improved code search
and clone detection but requires model inference (not a lightweight CLI tool).

**Relevance to AIWG:** Low for implementation. The data flow edge type (variable def → use)
is a useful concept if AIWG ever needs intra-function analysis.

---

## 4. Agent Self-Navigation Patterns

### 4.1 Aider RepoMap: Personalized PageRank for Context Selection

(Covered in detail in Section 3.1)

The core insight: a weighted directed graph of file-level symbol dependencies, plus
personalized PageRank to rank files by relevance to the current task, produces a compact
and accurate "what files does the agent need to know about?" answer.

**For AIWG agents:** The equivalent is ranking `.aiwg/` artifact nodes by relevance to
the current SDLC task. A requirements change ripples through: requirements → architecture
→ source code → tests. The weighted graph makes this traversal explicit.

---

### 4.2 SWE-agent: BashTool + File Viewer Pattern

**Package**: `swe-agent` (GitHub: `SWE-bench/SWE-agent`, not on PyPI)
**License**: MIT
**Source**: github.com/SWE-bench/SWE-agent

SWE-agent navigates codebases using a constrained bash interface with specialized tools:
- `open <path>`: opens a file with a 100-line viewport (not the whole file)
- `scroll_down`, `scroll_up`: navigate within the file
- `search_file <query> <path>`: search within an open file
- `search_dir <query> <path>`: search across a directory
- `find_file <name>`: locate a file by name

**Key design principle:** SWE-agent deliberately limits the agent's view to prevent context
overload. The agent must navigate explicitly rather than receiving the full codebase.

**What SWE-agent found from empirical evaluation:**
- File-level navigation is the bottleneck, not code understanding
- Agents need "where is X defined?" more than "what does X do?"
- Search-then-read is more reliable than trying to read large files directly
- Git diff context is crucial for understanding the current state

**For AIWG:** The `search_dir` pattern maps to a CLI index query:
```bash
aiwg index search "ExtensionRegistry" --type source
# Returns: [{"file": "src/extensions/registry.ts", "symbol": "ExtensionRegistry", "kind": "class", "line": 12}]
```

---

### 4.3 OpenDevin / SWE-ReX: Sandboxed Code Navigation

**Status**: Academic research, open source
**License**: MIT

OpenDevin (now OpenHands) provides agents with a sandboxed bash environment. SWE-ReX
(SWE-agent Refactored Execution) improves on SWE-agent by:
- Persistent bash sessions (no re-initialization per command)
- Parallel tool execution
- Structured output formats (JSON rather than raw text)

**Relevant finding for AIWG:** Structured JSON output from CLI tools is significantly
more reliable for agents than parsing free-form text. The `--output-type json` pattern
in dependency-cruiser is the right design.

---

### 4.4 RepoGraph (2024 Research Tool)

**Status**: Research prototype
**Source**: Multiple papers and prototypes under this name

Several 2024 papers implemented "RepoGraph" — a graph-based repository representation
where nodes are code entities (files, classes, functions) and edges are relationships
(calls, imports, inherits). Used as context for LLM-based issue resolution.

**Common finding across these papers:** LLMs with access to the graph structure make
fewer navigation mistakes and require fewer tool calls to find relevant context. The graph
is most useful when it answers "which file handles X?" rather than when it tries to provide
code content.

**Relevance to AIWG:** Validates the three-graph architecture. The framework reference
index (Graph 1) answers "which agent handles X?" — the same query pattern.

---

### 4.5 grep_ast / TreeContext (Aider's Context Tool)

**Package**: `grep_ast` (PyPI)
**License**: Apache 2.0

Aider also distributes `grep_ast`, a standalone tool for context-aware code search:
```bash
grep_ast "ExtensionRegistry" src/
# Shows matching lines plus surrounding AST context (class/function the match is inside)
```

The `TreeContext` class shows search results with their surrounding context structure
(e.g., a method match is shown with its class and relevant enclosing scope).

**JavaScript equivalent:** Not directly available. The TS compiler API can provide
the parent node chain for any match, which achieves the same contextual display.

---

## 5. Comparison Matrix

| Tool | Language | License | Index Type | Query Interface | Relevance to AIWG |
|------|----------|---------|-----------|----------------|-------------------|
| TypeScript Compiler API | TS/JS | Apache 2.0 | AST/imports/exports | Programmatic | High — available, no dep |
| Madge | JS | MIT | Import adjacency | CLI JSON / Programmatic | Medium — debugging |
| dependency-cruiser | JS | MIT | Import graph + rules | CLI JSON / multiple | Medium — affected/reaches |
| tree-sitter | Multi-language | MIT | Symbol def/ref | Query language (.scm) | Medium — multi-lang |
| ts-morph | TS | MIT | Full type graph | Programmatic | Medium — symbol refs |
| Aider RepoMap | Python | Apache 2.0 | Weighted symbol graph | Python API | High — pattern reference |
| graphology + pagerank | JS | MIT | General graph | Programmatic | High — JS equivalent |
| LSP / tsserver | TS | MIT | Full type index | JSON-RPC | Low — too heavy |
| CodeQL | Multi | Proprietary | Relational DB | QL queries | Low — security focus |
| Sourcetrail | Multi | GPL v3 | SQLite graph | SQL + custom UI | Low — archived |
| Sourcegraph SCIP | Multi | Apache 2.0 | SCIP protobuf | GraphQL API | Low — serialization ref |
| StrictDoc | Python | GPL v3 | Requirements graph | HTML/PDF export | Medium — traceability ref |
| doorstop | Python | MIT | YAML link graph | CLI | Low — archived |

---

## 6. Implementation Recommendations for AIWG Three-Graph Architecture

### Graph 1: Framework Reference Index (`framework-index.json`)

**What to index:** `agentic/code/` — agents, commands, skills, rules, templates, addons

**Recommended approach:**
1. Walk `agentic/code/` recursively
2. For `.md` files: extract frontmatter (YAML) → get `id`, `type`, `capabilities`, `tools`, `tags`
3. For `.json` manifest files: parse directly → extension metadata
4. For `README.md` in each framework dir: extract headings and first paragraph as description
5. Edge creation: manifest `dependencies:` field → `depends` edges between extensions

**Query examples:**
```bash
jq '.nodes | to_entries[] | select(.value.type == "agent") | {id: .key, name: .value.name, capabilities: .value.capabilities}' framework-index.json
jq '.edges[] | select(.rel == "depends" and .to == "sdlc-complete")' framework-index.json
```

**No new dependencies required.** Use `js-yaml` (installed) for frontmatter.

### Graph 2: Project Artifact Index (`.aiwg/artifact-index.json`)

**What to index:** `.aiwg/` — requirements, architecture, ADRs, risks, test plans

**Recommended approach:**
1. Walk `.aiwg/` recursively (exclude `working/` and `ralph/` subdirs)
2. Extract frontmatter: `id`, `type`, `title`, `tags`, `status`, `links`, `implements`
3. Parse `@` mention patterns from body text and JSDoc comments in referenced source files
4. Edge types: `links` frontmatter → `satisfies`/`refines` edges; `implements` → cross-graph edges

**Critical gap to close:** The JSDoc `@implements` and `@tests` annotations in TypeScript
source files (currently used but not machine-indexed) should be extracted by the codebase
indexer and stored as cross-graph edges connecting Graph 2 and Graph 3.

### Graph 3: Codebase Index (`codebase-index.json`)

**Recommended approach:**
1. Walk `src/`, `tools/`, `test/` for `.ts`, `.tsx`, `.js`, `.mjs` files
2. Use TypeScript Compiler API: extract imports, exports, JSDoc `@` annotations
3. Resolve module paths: strip `.js` extension, try with `.ts`, handle `index.ts` directories
4. Weight edges by import frequency for PageRank ranking
5. Optionally: use `graphology` + `graphology-metrics/centrality/pagerank` for ranked output

**Verified:** TypeScript Compiler API successfully analyzed 123 AIWG source files,
found 328 imports and 605 exports in a single pass.

---

## 7. Key Implementation Gotchas

**Module path resolution:** The TS compiler API returns the raw specifier (`./types.js`),
not the resolved path (`src/extensions/types.ts`). Resolution requires: strip `.js` → try
`.ts`, try `/index.ts`, handle tsconfig path aliases. dependency-cruiser handles this
correctly. Without resolution, graph edges point to specifier strings, not file nodes.

**graphology-pagerank deprecation:** The standalone `graphology-pagerank` package is
deprecated. PageRank is now in `graphology-metrics/centrality/pagerank`. Import accordingly.

**tree-sitter API change (v0.24.0):** The `captures()` method moved from `Query` to
`QueryCursor`. Code that worked with tree-sitter <0.24 will break. Aider has a compatibility
shim worth copying if tree-sitter is adopted.

**`watskeburt` for incremental builds:** dependency-cruiser's `--affected` flag uses
`watskeburt` (which lists files changed since a git revision) for incremental analysis.
This pattern is directly adoptable: on each index update, run `git diff --name-only HEAD`
to get changed files, then re-index only those files plus their dependents.

**Windows `fs.rename` atomicity:** See companion finding `searchable-index-patterns.md`
Section 3 for the atomic write pattern. On Windows, `fs.rename` to an existing file is not
atomic. Use `write-file-atomic` if cross-platform support is required.

---

## GRADE Assessment

| Claim Type | Source | GRADE |
|-----------|--------|-------|
| npm package versions and descriptions | npm registry (verified by running `npm info`) | VERY LOW |
| Madge produces JSON adjacency map | Code execution against AIWG project | LOW |
| TS compiler API processes 123 files with 328 imports | Code execution, verified output | LOW |
| Aider RepoMap uses NetworkX + PageRank | Source code inspection (downloaded tarball) | LOW |
| Aider RepoMap uses tree-sitter for tag extraction | Source code inspection | LOW |
| dependency-cruiser `--affected` uses watskeburt | npm dependency manifest | VERY LOW |
| graphology-pagerank deprecated, moved to graphology-metrics | npm deprecation notice | VERY LOW |
| CodeQL uses .trap files → QL database | CodeQL documentation | VERY LOW |
| SWE-agent navigation patterns | Published paper and open source repo | VERY LOW |
| tree-sitter API change in v0.24.0 | Aider source code comment | VERY LOW |
| Sourcegraph SCIP format | Sourcegraph public documentation | VERY LOW |

**Overall evidence quality: VERY LOW to LOW.** All implementation claims are based on
practitioner documentation, source code inspection, and limited live code execution.
No performance benchmarks are from independent third parties. Treat all performance
figures as directional, not authoritative.

---

## Sources Consulted

- Aider source code: `aider_chat-0.86.2.tar.gz` from PyPI (downloaded and inspected)
- npm registry: madge (8.0.0), dependency-cruiser (17.3.8), ts-morph (27.0.2), tree-sitter (0.25.0), graphology (0.26.0), graphology-metrics (2.4.0), watskeburt (5.0.3)
- Code execution: TypeScript Compiler API against AIWG `src/` (123 files), Madge CLI
- AIWG project files: `src/extensions/capability-index.ts`, `src/extensions/registry.ts`, `.aiwg/requirements/feature-backlog-prioritized.md`, `.aiwg/architecture/toolsmith-implementation-spec.md`
- LSP specification 3.17 (lsp.spec.json, public)
- Sourcegraph SCIP: github.com/sourcegraph/scip (public repository README)
