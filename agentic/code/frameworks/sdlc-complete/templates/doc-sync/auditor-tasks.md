# Doc-Sync Auditor Task Templates

Task definitions for the 8 Wave 1 domain auditors and 4 Wave 2 cross-reference checks dispatched by `parallel-dispatch` during doc-sync execution.

Each auditor reads its docs scope and code scope, identifies mismatches, and outputs structured `DOC-DRIFT-NNN` findings.

## Finding Format

All auditors output findings in this format:

```markdown
### DOC-DRIFT-{NNN}: {title}

- **Severity**: critical | high | medium | low
- **Domain**: {auditor-name}
- **Category**: auto-fixable | template-fixable | human-required
- **Docs file**: {path}:{line}
- **Code file**: {path}:{line}
- **Expected** (from source of truth): {value}
- **Actual** (in target): {value}
- **Fix**: {description of required change}
```

---

## Wave 1: Domain Auditors

### cli-ref-auditor

**Docs scope**: `docs/cli-reference.md`, `CLAUDE.md` (command sections)
**Code scope**: `src/extensions/commands/definitions.ts`, `.claude/commands/`

**Checks**:
1. Command count matches `commandDefinitions` array length
2. Every command in `definitions.ts` has a corresponding section in cli-reference.md
3. Every command section in cli-reference.md corresponds to a command in `definitions.ts`
4. Argument hints in docs match `argumentHint` fields in code
5. Command descriptions in docs match `description` fields in code
6. Category assignments match between docs table and code
7. Tool lists match between docs and code `allowedTools`
8. CLAUDE.md command count references are consistent

**Severity guide**:
- Missing command section: critical
- Wrong command count: high
- Mismatched argument hint: medium
- Description drift: low

---

### extension-type-auditor

**Docs scope**: `docs/extensions/overview.md`, `docs/extensions/extension-types.md`, `docs/extensions/creating-extensions.md`
**Code scope**: `src/extensions/types.ts`, `src/extensions/registry.ts`

**Checks**:
1. Extension types listed in docs match TypeScript type definitions
2. Type fields documented match interface properties
3. Registry capabilities documented match implementation
4. Examples in docs use valid type structures
5. Validation rules documented match code enforcement

**Severity guide**:
- Missing extension type: high
- Wrong field documentation: medium
- Stale example: low

---

### provider-auditor

**Docs scope**: `docs/integrations/`, `CLAUDE.md` (provider table)
**Code scope**: `tools/agents/providers/*.mjs`, `src/smiths/platform-paths.ts`

**Checks**:
1. Provider table entries match provider implementation files
2. Artifact deployment paths match `platform-paths.ts` definitions
3. Support levels (native/conventional/aggregated) documented correctly
4. Model mappings documented match `models.json` entries
5. Provider-specific notes (Codex home dir, Copilot YAML, Warp aggregation) are accurate

**Severity guide**:
- Missing provider: critical
- Wrong deployment path: high
- Stale model mapping: medium
- Minor description drift: low

---

### skill-auditor

**Docs scope**: `docs/development/skill-inventory.md`
**Code scope**: `.claude/skills/`, `agentic/code/frameworks/*/skills/`, `agentic/code/frameworks/*/skills/manifest.json`

**Checks**:
1. Skill count in inventory matches actual skill files
2. Every SKILL.md file has an entry in the inventory
3. Every inventory entry corresponds to an existing SKILL.md
4. Manifest.json entries match SKILL.md files
5. Trigger phrases in manifest match SKILL.md trigger lists

**Severity guide**:
- Missing skill from inventory: high
- Orphaned inventory entry: medium
- Trigger phrase mismatch: low

---

### agent-auditor

**Docs scope**: Agent catalog documentation, `agentic/code/frameworks/*/agents/manifest.json`
**Code scope**: `agentic/code/frameworks/*/agents/*.md`, `.claude/agents/`

**Checks**:
1. Agent count in manifests matches actual agent files
2. Agent descriptions in manifests match agent file frontmatter
3. Model assignments are valid (opus/sonnet/haiku)
4. Tool lists in manifests match agent file `tools:` frontmatter
5. No orphaned agent files without manifest entries
6. No manifest entries pointing to missing files

**Severity guide**:
- Missing agent from manifest: high
- Wrong model assignment: medium
- Description drift: low

---

### config-auditor

**Docs scope**: Configuration guides, `docs/development/aiwg-development-guide.md`
**Code scope**: `src/`, `agentic/code/frameworks/*/config/`

**Checks**:
1. Configuration file schemas documented match actual structures
2. Default values documented match code defaults
3. Environment variable references documented exist in code
4. Config file paths documented match actual paths

**Severity guide**:
- Wrong default value: high
- Missing config option: medium
- Path mismatch: low

---

### readme-auditor

**Docs scope**: `README.md`
**Code scope**: `package.json`, `src/`

**Checks**:
1. Version in README matches `package.json` version
2. Installation instructions reference correct package name
3. Quick start examples use valid commands
4. Feature list matches implemented capabilities
5. Links to documentation are valid

**Severity guide**:
- Wrong version: high
- Broken install instructions: high
- Stale feature list: medium
- Broken link: medium

---

### changelog-auditor

**Docs scope**: `CHANGELOG.md`, `docs/releases/`
**Code scope**: git tags, `package.json`

**Checks**:
1. Latest version in CHANGELOG matches `package.json` version
2. Latest version in CHANGELOG matches latest git tag
3. Every git tag has a corresponding CHANGELOG section
4. Release announcement files exist for each version
5. Dates in CHANGELOG are plausible (not future, not ancient)

**Severity guide**:
- Missing version section: critical
- Version mismatch: high
- Missing release announcement: medium
- Date inconsistency: low

---

## Wave 2: Cross-Reference Checks

Wave 2 tasks run after all Wave 1 auditors complete. They operate on the full corpus including any Wave 1 findings.

### mention-validate

**Scope**: All `*.md` files in scope
**Tool**: `mention-validate` skill

**Checks**:
1. Every `@path/to/file` mention resolves to an existing file
2. No references to deleted or renamed files
3. Report unresolvable mentions with suggested corrections

### claims-validator

**Scope**: All documentation files
**Tool**: `claims-validator` skill

**Checks**:
1. Numeric claims match actuals (e.g., "42 commands" matches `commandDefinitions.length`)
2. Count claims in tables are consistent with row counts
3. "X agents" claims match manifest counts

### check-traceability

**Scope**: `.aiwg/` artifacts, `agentic/` framework files
**Tool**: `check-traceability` skill

**Checks**:
1. Bidirectional references are consistent (A references B and B references A)
2. Implements/tested-by chains are complete
3. No orphaned references

### internal-link-checker

**Scope**: All `*.md` files in scope

**Checks**:
1. All `[text](path)` links resolve to existing files
2. All `#anchor` links resolve to existing headings
3. No broken relative paths
4. Report broken links with location and suggested fix

---

## Dispatch Configuration

```yaml
wave1:
  parallel: true
  max_concurrent: 4
  timeout_per_auditor: 120s
  agents:
    - cli-ref-auditor
    - extension-type-auditor
    - provider-auditor
    - skill-auditor
    - agent-auditor
    - config-auditor
    - readme-auditor
    - changelog-auditor

wave2:
  parallel: true
  depends_on: wave1
  max_concurrent: 4
  timeout_per_check: 60s
  checks:
    - mention-validate
    - claims-validator
    - check-traceability
    - internal-link-checker
```
