# Documentation-Code Sync Audit Report

**Date**: {date}
**Direction**: {direction}
**Scope**: {scope}
**Mode**: {dry_run|incremental|full}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total drift items | {total_count} |
| Critical | {critical_count} |
| High | {high_count} |
| Medium | {medium_count} |
| Low | {low_count} |
| Auto-fixable | {auto_fix_count} |
| Template-fixable | {template_fix_count} |
| Human-required | {human_fix_count} |

**Estimated fix effort**: {effort_estimate}

---

## Per-Domain Findings

### CLI Reference ({cli_ref_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Extension Types ({ext_type_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Provider Documentation ({provider_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Skills Documentation ({skill_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Agent Documentation ({agent_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Configuration ({config_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### README ({readme_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

### Changelog ({changelog_count} items)

| ID | Severity | Description | Fix Type |
|----|----------|-------------|----------|
| DOC-DRIFT-{NNN} | {severity} | {description} | {auto/template/human} |

---

## Cross-Reference Issues

### Broken @-mentions

| File | Line | Mention | Issue |
|------|------|---------|-------|
| {file} | {line} | {mention} | {target not found/moved/renamed} |

### Numeric Claim Mismatches

| File | Claim | Documented | Actual | Delta |
|------|-------|------------|--------|-------|
| {file} | {claim_description} | {documented_value} | {actual_value} | {delta} |

### Broken Internal Links

| File | Link | Target | Issue |
|------|------|--------|-------|
| {file} | {link_text} | {target_path} | {not found/moved} |

---

## Sync Plan

### Auto-fixable Items ({auto_fix_count})

These will be applied automatically:

| ID | File | Fix Description |
|----|------|-----------------|
| DOC-DRIFT-{NNN} | {file} | {fix_description} |

### Template-fixable Items ({template_fix_count})

These require iterative generation via Ralph:

| ID | File | Template | Iterations |
|----|------|----------|------------|
| DOC-DRIFT-{NNN} | {file} | {template} | {estimated} |

### Human-required Items ({human_fix_count})

These need human judgment:

| ID | File | Reason |
|----|------|--------|
| DOC-DRIFT-{NNN} | {file} | {why_human_needed} |

---

## Changes Applied

{Populated after sync execution, empty in dry-run mode}

| File | Change | Drift Item |
|------|--------|------------|
| {file} | {change_description} | DOC-DRIFT-{NNN} |

---

## Validation Results

{Populated after Phase 8 validation}

| Check | Before | After | Status |
|-------|--------|-------|--------|
| @-mentions resolving | {before_pct}% | {after_pct}% | {pass/fail} |
| Numeric claims correct | {before_pct}% | {after_pct}% | {pass/fail} |
| Internal links valid | {before_pct}% | {after_pct}% | {pass/fail} |
| New drift introduced | — | {count} | {pass/fail} |

---

## References

- Previous sync: {last_sync_date}
- Sync state: `.aiwg/.last-doc-sync`
- Command: @agentic/code/frameworks/sdlc-complete/commands/doc-sync.md
