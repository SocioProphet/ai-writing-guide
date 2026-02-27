# Doc-Sync Auto-Fix Patterns

Concrete fix patterns for each auto-fixable drift category. The doc-sync orchestrator uses these patterns during Phase 6 (Auto-fix) to apply corrections without human intervention.

## Auto-Fix Categories

### 1. Numeric Claims

**Detection**: A numeric value in documentation doesn't match the source-of-truth count.

**Sources of truth**:

| Claim Type | Source of Truth | Extraction Method |
|-----------|----------------|-------------------|
| Command count | `commandDefinitions` array length in `definitions.ts` | Count array entries |
| Agent count | `manifest.json` `agents` array length | Count array entries |
| Skill count | `skills/manifest.json` `skills` array length | Count array entries |
| Provider count | Provider table in CLAUDE.md | Count table rows |
| Extension type count | `ExtensionType` union in `types.ts` | Count union members |
| File/artifact counts | Glob pattern match | Count matching files |

**Fix pattern**:
```
Read source → extract count → find all claims in docs → replace with actual value
```

**Example**:
```markdown
# Before (DOC-DRIFT-001)
- docs/cli-reference.md:372 says "40 commands"
- definitions.ts has 42 entries

# Fix
Edit docs/cli-reference.md line 372: replace "40" with "42"
```

**Safety checks**:
- Only replace exact numeric matches within the expected context
- Don't replace numbers in version strings, dates, or code examples
- Verify the surrounding text confirms this is a count claim (e.g., "N commands", "N agents")

---

### 2. Table Entries

**Detection**: A table in documentation has missing rows, extra rows, or mismatched values compared to source.

**Fix patterns**:

#### Missing row
```
Identify insertion point → generate row from source metadata → insert
```

**Example**:
```markdown
# Before (DOC-DRIFT-015)
Command table in cli-reference.md missing "doc-sync" row

# Fix
Insert row: | **Documentation** | 1 | doc-sync |
```

#### Extra row (deleted artifact)
```
Identify orphaned row → verify artifact truly deleted → remove row
```

#### Mismatched value
```
Read source field → find table cell → replace value
```

**Safety checks**:
- Preserve table formatting (column widths, alignment)
- Verify table structure after edit (correct column count)
- Don't modify tables inside code blocks or examples

---

### 3. Argument Hints

**Detection**: A command's documented argument hint doesn't match its `argumentHint` field in `definitions.ts`.

**Fix pattern**:
```
Read argumentHint from definitions.ts → find docs section → replace argument hint text
```

**Example**:
```markdown
# Before (DOC-DRIFT-022)
cli-reference.md says: `aiwg doc-sync <direction>`
definitions.ts says: argumentHint: '<direction> [--dry-run --scope <path> --incremental]'

# Fix
Update cli-reference.md argument line to match definitions.ts
```

**Safety checks**:
- Only update the argument/usage line, not surrounding description
- Preserve any additional documentation around the hint
- Verify the hint is syntactically valid

---

### 4. Broken Internal Links

**Detection**: A markdown link `[text](path)` or `[text](path#anchor)` points to a non-existent target.

**Fix patterns**:

#### File moved/renamed
```
Search for file by name → if found at new path → update link
```

#### File deleted
```
If target was intentionally removed → remove link or replace with note
If accidental → flag as human-required
```

#### Anchor changed
```
Read target file → search for heading that matches → update anchor
```

**Example**:
```markdown
# Before (DOC-DRIFT-030)
docs/extensions/overview.md: [types reference](../types.md) → file not found

# Fix (file moved)
Found at src/extensions/types.ts
Update link: [types reference](../../src/extensions/types.ts)
```

**Safety checks**:
- Fuzzy-match file names to detect renames (Levenshtein distance < 3)
- For ambiguous matches, flag as human-required instead of guessing
- Don't modify links inside code blocks

---

### 5. Broken @-mentions

**Detection**: An `@path/to/file` mention doesn't resolve to an existing file.

**Fix patterns**:

#### File moved
```
Search for file by basename → if unique match → update mention path
```

#### Path changed
```
If parent directory renamed → update mention with new path
```

**Safety checks**:
- Only auto-fix when the match is unambiguous (exactly one candidate)
- Multiple candidates → flag as human-required

---

## Template-Fixable Patterns

These require content generation and Ralph refinement. They are NOT auto-fixed.

### Missing Documentation Section

A command or feature exists in code but has no documentation section at all.

**Approach**:
1. Extract metadata from code (description, arguments, tools, category)
2. Generate section using cli-reference format template
3. Ralph loop: validate → fix → validate until section is complete

### Outdated Description

A section exists but its description is substantially wrong (not just a count).

**Approach**:
1. Read current code behavior
2. Draft updated description
3. Ralph loop: validate consistency → fix → validate

### Missing Examples

Documentation exists but lacks usage examples.

**Approach**:
1. Infer examples from argumentHint and capabilities
2. Generate 2-3 examples following existing format
3. Validate examples reference valid commands and options

---

## Human-Required Patterns

These are flagged for review, never auto-fixed.

| Pattern | Reason |
|---------|--------|
| Architectural change | Code and docs describe fundamentally different designs |
| Ambiguous intent | Both code and docs changed, unclear which is correct |
| Breaking change | Fix would change documented API contract |
| Multiple candidates | File moved but multiple possible matches exist |
| Security-sensitive | Fix involves token paths, permissions, or auth logic |

---

## Validation Phase

After all auto-fixes and Ralph refinement, re-run Wave 2 checks:

1. **mention-validate**: All @-mentions still resolve (fixes didn't break others)
2. **claims-validator**: Numeric claims now match (auto-fixes applied correctly)
3. **internal-link-checker**: Links valid (broken link fixes worked)
4. **regression check**: No NEW drift items introduced by the fixes

If validation fails:
- Auto-fix regression → revert that specific fix, flag as human-required
- New drift introduced → add to findings, attempt fix in next Ralph iteration
- Max iterations reached → output remaining issues in report
