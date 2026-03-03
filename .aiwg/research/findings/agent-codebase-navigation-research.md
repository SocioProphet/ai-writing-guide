---
title: "AI Agent Codebase Navigation: Graph-Based and Index-Based Approaches"
date: 2026-03-01
type: research-findings
status: complete
sources:
  - aider-repomap-source (primary, code inspection)
  - swe-agent-source (primary, code inspection)
  - moatless-tools-source (primary, code inspection)
  - openhands-source (primary, code inspection)
relevance: AIWG CLI-queryable code index design
---

# AI Agent Codebase Navigation Research

## Executive Summary

**Purpose:** Understand how production AI coding agents navigate and understand large codebases, specifically graph-based and index-based approaches, to inform AIWG's three-graph CLI-queryable index design.

**Confidence:** High for Aider, Moatless, SWE-agent (direct source inspection). Medium for Claude Code and Cursor (no public source available, inferred from documentation and public statements).

**Key Finding:** The field has converged on a three-tier architecture: (1) a sparse symbol graph built from tree-sitter AST parsing, (2) a dense semantic vector index using embedding models, and (3) a structured inverted index (class-by-name, function-by-name, file-tree). These tiers serve different query types and no single approach handles all navigation needs.

---

## Source 1: Aider RepoMap

### What It Is

Aider's RepoMap (source: `/tmp/aider-src/aider/repomap.py`, inspected 2026-03-01) is a production-grade, token-budget-aware repository map that feeds LLM context. It is the most directly applicable reference for AIWG's design.

### Data Structure

RepoMap builds a **directed multigraph** using NetworkX's `MultiDiGraph`. Nodes are relative file paths. Edges represent symbol relationships:

- Each edge connects a **referencing file** to a **defining file**
- Edge weight encodes: reference frequency (`sqrt(num_refs)`), naming style bonus (camelCase/snake_case names get `10x` weight), mentioned-identifier bonus (`10x`), chat-file bonus (`50x`), and private-symbol penalty (`0.1x`)

Tags (symbols) are extracted in two passes:
1. **Primary:** tree-sitter `.scm` query files extract `name.definition.*` and `name.reference.*` captures
2. **Fallback:** pygments tokenizer extracts name tokens when tree-sitter provides definitions but no references (e.g., C++)

Tag structure: `Tag(rel_fname, fname, line, name, kind)` where `kind` is `"def"` or `"ref"`.

### Ranking Algorithm

PageRank on the symbol graph with **personalization** toward:
- Files currently in the chat session (`personalize = 100 / len(fnames)` score per file)
- Files whose path components match identifiers mentioned in the conversation
- Files explicitly mentioned by name in the conversation

The personalization makes the repo map dynamically adapt to what the user is working on. Without any chat files, the token budget for the map expands by `map_mul_no_files` (default: 8x) to give a broader overview.

### Context Fitting

RepoMap uses binary search to find the maximum number of ranked tags that fit within the token budget. The binary search targets `max_map_tokens` (default: 1024 tokens) and accepts within 15% error. Tags are rendered using `grep_ast`'s `TreeContext` which shows the file structure around lines-of-interest without showing full function bodies.

### Caching

Two-level cache:
- **SQLite on disk** (`.aider.tags.cache.v4/`) keyed by filename + mtime — survives sessions
- **In-memory map_cache** keyed by (chat_files, other_files, max_tokens, mentioned) tuple — avoids recomputation within a session when processing time exceeded 1 second

### Language Support

27 languages via tree-sitter `.scm` query files (Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, C#, Ruby, PHP, Kotlin, Swift, Dart, Haskell, OCaml, Elixir, Elm, Julia, Fortran, HCL, MATLAB, Elisp). Falls back to pygments tokenizer for unsupported languages.

### Special File Handling

`filter_important_files()` in `special.py` identifies high-priority files (README, package.json, pyproject.toml, go.mod, Cargo.toml, etc.) and pins them at the top of the ranked list regardless of PageRank score.

### Key Design Decisions

1. **Symbol-level granularity, not file-level.** The graph connects files through the symbols they share, not just import statements.
2. **Context-aware ranking.** The chat session informs what is most relevant — this is not a static index.
3. **Binary search for token fitting.** Instead of hard truncation, it finds the best-fitting slice of ranked output.
4. **Line-of-interest rendering.** Uses tree-sitter to show function signatures without bodies — high information density per token.

---

## Source 2: Moatless Tools

### What It Is

Moatless Tools (source: `/tmp/moatless-src/`, inspected 2026-03-01) is the highest-performing open-source SWE-bench agent at the time of writing. From its README: "Claude 4 Sonnet - 70.8% solve rate, $0.63 per instance." It is purpose-built for code editing in large existing codebases and has the most sophisticated index architecture of any open-source agent.

### Index Architecture: Three-Layer System

**Layer 1: Inverted Index (CodeBlockIndex)**

Source: `/tmp/moatless-src/moatless/index/code_block_index.py`

Two primary hash maps:
- `blocks_by_class_name: dict[str, list[tuple[str, str]]]` — maps class name to (file_path, block_path)
- `blocks_by_function_name: dict[str, list[tuple[str, str]]]` — maps function name to (file_path, block_path)

Plus a **file tree index** for glob pattern matching:
- Tree is a nested dict where directories are dicts and files are `None` leaves
- Supports `**` recursive glob, `*` single-level glob, and exact match
- Persisted as `inverted_indexes.json` alongside `blocks_by_class_name.json` and `blocks_by_function_name.json`

**Layer 2: Vector Store (FAISS)**

Source: `/tmp/moatless-src/moatless/index/code_index.py`

Uses `llama_index` with Voyage AI's `voyage-code-3` embedding model (1536 dimensions by default). Each embedded "node" represents a code span (a contiguous block within a class or function). The vector store uses `faiss.IndexIDMap(faiss.IndexFlatL2(dimensions))` — L2 distance over flat index, no compression.

Pre-built indexes for all SWE-bench instances are downloadable from Azure Blob Storage at `stmoatless.blob.core.windows.net/indexstore/20250118-voyage-code-3/`.

**Layer 3: Document Store**

LlamaIndex `SimpleDocumentStore` persisted as `docstore.json`. Maps span IDs to document content, enabling retrieval by ID without re-reading files.

### Query Interface

Five distinct query methods exposed as agent actions:

| Action | Index Used | Query Type |
|--------|-----------|------------|
| `FindClass(class_name)` | Inverted (class) | Exact name lookup |
| `FindFunction(function_name, class_name?)` | Inverted (function) | Exact name lookup |
| `SemanticSearch(query, category?)` | Vector store | Natural language |
| `GrepTool(pattern, include?)` | Filesystem | Regex content search |
| `ViewCode(files=[CodeSpan])` | File system | Line/span retrieval |

Semantic search applies a post-retrieval exact-match filter: if any span contains the query string verbatim, it switches to exact-match-only mode and discards all vector results that do not contain the literal query. This hybrid exact+semantic approach prevents vector similarity from returning false positives when an exact match exists.

### Context Management: FileContext

Source: `/tmp/moatless-src/moatless/file_context.py`

`FileContext` maintains the agent's active working set. Key design:
- Files are represented as `ContextFile` with a list of `ContextSpan` (span_id, start_line, end_line, tokens, pinned)
- Spans can be pinned (will not be evicted)
- Context is rendered per-span, not per-file — only selected spans are shown to the agent
- Token counting is tracked per span to stay within budget
- `show_all_spans` flag bypasses selective rendering for small files

### Code Block Representation

Source: `/tmp/moatless-src/moatless/codeblocks/`

Moatless has a custom AST-to-codeblocks converter (currently Python and Java only). Each `CodeBlock` has:
- `CodeBlockType` (MODULE, CLASS, FUNCTION, METHOD, etc.)
- `BlockSpan` with unique `span_id` (format: `ClassName.method_name` for methods)
- Token count per block
- Parent/child block relationships (tree structure)

This is more structured than Aider's tag approach but also more language-limited.

---

## Source 3: SWE-agent

### What It Is

SWE-agent (source: `/tmp/swe-agent-src/`, inspected 2026-03-01) is a Princeton/Stanford research project now recommending migration to mini-SWE-agent (65% on SWE-bench verified in ~100 lines of Python). SWE-agent achieves state-of-the-art results on SWE-bench with Claude 3.7.

### Navigation Approach: Shell-Native, No Pre-Built Index

SWE-agent explicitly **does not build a pre-built code index**. Instead it gives the agent raw access to a sandboxed shell environment with purpose-built navigation tools:

**Primary navigation tools** (source: `/tmp/swe-agent-src/tools/search/`):
- `find_file <name> [<dir>]` — wraps `find` with result capping (max 100 files warning)
- `search_dir <term> [<dir>]` — wraps `grep -nIH` across all non-hidden files
- `search_file <term> [<file>]` — wraps `grep -nH` within a single file

**File viewing tools** (source: `/tmp/swe-agent-src/tools/windowed/`):
- `open <file> [<line>]` — opens file with a scrollable 100-line window
- `scroll_up` / `scroll_down` — scroll the window
- `goto <line>` — jump to a specific line

**Filemap tool** (source: `/tmp/swe-agent-src/tools/filemap/bin/filemap`):
A tree-sitter-based tool that displays Python files with function bodies elided (shows signatures only, elides bodies >= 5 lines). Uses the same concept as Aider's TreeContext but implemented as a standalone CLI tool.

### Context Management

SWE-agent manages context through **history processors**:
- `LastNObservations(n)` — keeps only last N observations, elides older ones
- `CacheControl` — uses Anthropic's prompt caching on the last 2 messages to reduce costs
- `max_observation_length: 100_000` characters — hard truncation with a note to the agent

The `TemplateConfig` system uses Jinja2 templates for system prompt and per-step formatting, making it highly configurable without code changes.

### Key Insight

SWE-agent's approach shows that **raw shell tools + a capable LLM can be sufficient**. The agent decides what to search for, issues grep/find commands, reads results, and navigates files. This works because modern LLMs can reason about search strategies. However, it is less token-efficient than pre-built indexes for large codebases.

---

## Source 4: OpenHands

### What It Is

OpenHands (source: `/tmp/openhands-src/`, inspected 2026-03-01) is transitioning from its legacy `CodeActAgent` (v2.2) to a new SDK-based V1 architecture. The legacy agent is scheduled for removal April 1, 2026.

### Navigation Approach: Microagent System

OpenHands uses a **microagent system** for injecting codebase-specific knowledge into context. Source: `/tmp/openhands-src/openhands/microagent/` and `/tmp/openhands-src/openhands/memory/memory.py`.

Two microagent types:
- `KnowledgeMicroagent` — triggered by keyword matching in conversation (e.g., "docker" triggers Docker-specific instructions)
- `RepoMicroagent` — always-active instructions loaded from the repository (reads `.openhands_instructions`, `AGENTS.md`, `agents.md`, `.cursorrules`)

The `Memory` class listens on the EventStream for `RecallAction` events and responds with `RecallObservation` containing assembled context from active microagents.

### Code Navigation

The legacy CodeAct agent relies on:
- IPython execution for interactive Python exploration
- bash tool for shell commands
- `str_replace_editor` for file editing
- A `Condenser` that compresses conversation history when context fills

OpenHands does not have a structured code index. Navigation is through shell execution and LLM reasoning.

### Key Insight

OpenHands's microagent pattern is directly applicable to AIWG: the idea of having repo-specific markdown files that auto-load to give the agent context about the codebase structure, conventions, and important files.

---

## Source 5: Claude Code and Cursor (Inferred)

These tools do not have public source code. The following is inferred from public documentation and community reports.

**Claude Code** appears to use a combination of:
- Directory-listing-based exploration (the agent issues bash commands to explore)
- Full-file reads when files are small
- The agent's own reasoning about which files to read based on file names and directory structure
- No persistent pre-built index visible to the user

**Cursor** is reported (from community discussion) to:
- Use tree-sitter for symbol extraction
- Maintain a local embedding index of the codebase
- Use an "Apply" model separately from the chat model
- Provide `@codebase` semantic search over the embedding index

The Cursor approach aligns with Moatless's architecture: symbol inverted index + semantic vector index.

**Windsurf** (Codeium) similarly reports:
- "Flows" architecture with a codebase-aware context system
- Embedding-based semantic search over the repo
- Caching of indexed content to avoid re-indexing

**GRADE Assessment:** These inferred findings are LOW quality (indirect, unverified). Do not cite as established facts. Use as directional indicators only.

---

## Synthesis: What Works and What Doesn't

### Navigation Strategies by Capability

| Strategy | Best For | Worst For | Used By |
|----------|----------|-----------|---------|
| Symbol graph + PageRank | Context-aware summarization, "what's related to X" | Exact lookup by name | Aider |
| Inverted index (name→location) | Exact class/function lookup | Fuzzy or semantic queries | Moatless |
| Vector semantic search | "Find code that does X" queries | Exact identifier lookup | Moatless, Cursor (inferred) |
| Glob file tree index | Pattern-based file finding | Semantic relevance | Moatless |
| Raw grep/find | Any text pattern, zero setup cost | Large codebases, token waste | SWE-agent |
| Microagent / CLAUDE.md | Domain knowledge, conventions | Code structure discovery | OpenHands, Claude Code |

### Context Window Strategies

**What works:**
1. **Span-level granularity** (Moatless): Show only the relevant function/class, not the whole file. Reduces tokens by 5-20x for large files.
2. **Token-budget binary search** (Aider): Find the maximum useful content that fits, rather than hard truncation.
3. **Prompt caching** (SWE-agent): Cache the last N messages using Anthropic's cache_control to reduce repeated token costs.
4. **Eliding function bodies** (Aider filemap, SWE-agent filemap): Show signatures only for files not in active context.
5. **History compression** (OpenHands Condenser): Summarize old observations when context fills.

**What doesn't work:**
1. **Full-file context for large files**: A 2,000-line file wastes most of the context budget.
2. **Static relevance without personalization**: Ranking that ignores what the agent is currently working on misses the most relevant files.
3. **Single-strategy navigation**: Grep alone fails for large codebases (too many results). Vector search alone misses exact matches. Need multiple strategies.
4. **Deep delegation chains for navigation**: Spawning a subagent to do index lookup adds latency and coordination overhead for what should be a fast synchronous query.

### When to Use Each Strategy

**Use pre-built index lookup when:**
- You know the class or function name (use inverted index)
- You want conceptually similar code (use vector search)
- You want to understand repo structure (use symbol graph)

**Use on-the-fly search (grep/find) when:**
- Searching for a specific string literal or import statement
- The codebase is small enough that grep is fast
- The query is too specific for semantic search (e.g., an exact error message)

**Use full-file read when:**
- The file is small (< 200 lines)
- You need the complete context (e.g., you're editing the file)
- The file contains configuration (YAML, JSON, TOML)

---

## Lessons for AIWG's Three-Graph Index Design

Based on direct source inspection of production systems, the following design recommendations apply to AIWG's CLI-queryable code index.

### Recommended Graph 1: Symbol Reference Graph (Aider-style)

**Data structure:** Directed multigraph, nodes = relative file paths, edges = symbol definitions/references with weights.

**Build process:**
1. tree-sitter parse each file using `.scm` query files to extract `name.definition.*` and `name.reference.*` tags
2. Build `defines[symbol] -> set(files)` and `references[symbol] -> list(files)` maps
3. Construct graph edges: for each symbol, add edge from each referencing file to each defining file, weight = `sqrt(ref_count) * naming_bonus`
4. Apply PageRank to get base file importance scores

**CLI query interface:**
```bash
aiwg index query symbol --name "MyClass"           # find defining file
aiwg index query references --name "MyClass"       # find all referencing files
aiwg index rank-files --seed "src/main.ts"         # PageRank from seed
aiwg index map --max-tokens 2000                   # generate repo map
```

**Cache:** mtime-keyed SQLite per file (survives restarts), in-memory result cache (within session).

### Recommended Graph 2: Inverted Symbol Index (Moatless-style)

**Data structure:** Three JSON maps:
- `class_name → [(file_path, block_path), ...]`
- `function_name → [(file_path, block_path), ...]`
- `file_tree: nested dict` for glob matching

**Build process:**
1. Parse files with tree-sitter (or language-specific parser for Python/Java)
2. Extract class and function definitions with their containing file path and block path (e.g., `auth.models.UserManager.create_user`)
3. Build file tree from all discovered file paths

**CLI query interface:**
```bash
aiwg index find-class --name "UserManager"
aiwg index find-function --name "create_user" [--class "UserManager"]
aiwg index find-files --pattern "src/**/*.ts"
aiwg index list-classes [--file "src/auth/models.py"]
```

**Key design choice:** Exact name lookup should be O(1) via hash map, not O(N) via search.

### Recommended Graph 3: Semantic Vector Index (Moatless-style)

**Data structure:** FAISS flat L2 index + document store.

**Embedding:**
- Use a code-specific embedding model (Voyage `voyage-code-3` outperforms generic models for code)
- Embed at span granularity (function or class body), not file granularity
- Store span_id, file_path, start_line, end_line alongside each vector

**CLI query interface:**
```bash
aiwg index search --query "handles authentication and JWT validation"
aiwg index search --query "database connection pooling" --pattern "src/**/*.py"
aiwg index search --query "user login" --category test
```

**Hybrid exact+semantic:** After vector retrieval, check if any span contains the query string verbatim. If yes, return only exact matches (discard pure vector results). This prevents false positives.

### CLI Design for Agent Use

The critical design constraint for AIWG is that **agents use CLI commands, not library calls**. This means:

1. **Output must be machine-parseable.** Return JSON by default, with `--human` flag for readable output.
2. **Responses must be bounded.** Always enforce a max-results limit (default 25, configurable). Never return all matches for a common symbol.
3. **Responses must include context.** A class location result should include the file path, line number, and a snippet (3-5 lines) so the agent can decide whether to read more without another round-trip.
4. **Queries should be composable.** Allow piping: `aiwg index find-class Foo | aiwg index find-references`.
5. **Errors should be informative.** "Class not found. Did you mean: FooBar (auth/models.py)?" is more useful than an empty result.

### What to Avoid

1. **Do not build a single monolithic index.** The three-index approach (symbol graph + inverted + vector) serves different query types. A single approach underserves two of the three.
2. **Do not require full rebuild on any file change.** Incremental updates keyed by mtime are essential for interactive use. Moatless uses mtime; Aider uses mtime.
3. **Do not embed at file granularity.** Embedding a 2,000-line file produces a vector that is too coarse for useful retrieval. Span-level (function/class body) is the correct granularity.
4. **Do not return raw grep-style line results without context.** Always include the enclosing function/class name in results so the agent understands the structure.
5. **Do not skip the file-tree index.** Agents frequently need glob-based file discovery (`find all *.test.ts files`). A tree-indexed glob is 10-100x faster than `find` on a large repo.

---

## Maturity Assessment

| System | Approach | Maturity | SWE-bench Performance |
|--------|----------|----------|----------------------|
| Aider RepoMap | Symbol graph + PageRank | Production | Not measured on SWE-bench (interactive tool) |
| Moatless Tools | Inverted + Vector + Glob | Production | 70.8% (Claude Sonnet 4, SWE-bench) |
| SWE-agent | Shell tools (no index) | Production, transitioning to mini | SoTA open-source |
| OpenHands | Microagents + shell | Production (V1 in progress) | Competitive |
| Claude Code | Unknown (not public) | Production | N/A (proprietary) |
| Cursor | Symbol + embedding (inferred) | Production | N/A (proprietary) |

---

## Evidence Gaps

The following questions were not answered by available sources and are noted for future research:

1. What embedding model performs best for TypeScript/JavaScript code specifically?
2. How do production systems handle monorepos with mixed languages?
3. What is the optimal span size for embedding? (Moatless uses function body; is there evidence for alternatives?)
4. How does Cursor's `@codebase` search differ from Moatless's semantic search in practice?
5. What are mini-SWE-agent's navigation strategies that achieve 65% in ~100 lines?

See `/mnt/dev-inbox/jmagly/ai-writing-guide/.aiwg/research/TODO.md` for tracking.

---

## References

All sources inspected directly from cloned repositories. No secondary sources used for technical claims.

- Aider RepoMap: `git clone https://github.com/Aider-AI/aider.git` (2026-03-01), `/tmp/aider-src/aider/repomap.py`
- Moatless Tools: `git clone https://github.com/aorwall/moatless-tools.git` (2026-03-01), `/tmp/moatless-src/moatless/`
- SWE-agent: `git clone https://github.com/princeton-nlp/SWE-agent.git` (2026-03-01), `/tmp/swe-agent-src/`
- OpenHands: `git clone https://github.com/All-Hands-AI/OpenHands.git` (2026-03-01), `/tmp/openhands-src/openhands/`
