# Construction Ready Brief

**Project**: {project_name}
**Date**: {date}
**Pipeline Duration**: {start_date} → {end_date}

---

## Executive Summary

{1-3 sentence summary of project readiness for construction phase}

---

## Gate Decision Log

| Phase | Gate | Result | Decision | Date |
|-------|------|--------|----------|------|
| Inception | LOM | {PASS/CONDITIONAL/FAIL} | {proceed/waiver/remediated} | {date} |
| Elaboration | ABM | {PASS/CONDITIONAL/FAIL} | {proceed/waiver/remediated} | {date} |

### Waivers

{List any waivers granted, with justification}

| Waiver | Gate | Criterion | Justification |
|--------|------|-----------|---------------|
| {waiver_id} | {gate} | {criterion} | {justification} |

---

## Artifacts Produced

### Requirements

| Artifact | Status | Location |
|----------|--------|----------|
| Vision Document | {draft/approved/baselined} | `.aiwg/requirements/vision.md` |
| Use Cases | {count} items, {status} | `.aiwg/requirements/use-cases/` |
| Supplementary Specification | {status} | `.aiwg/requirements/supplementary-spec.md` |

### Architecture

| Artifact | Status | Location |
|----------|--------|----------|
| Software Architecture Document | {status} | `.aiwg/architecture/sad.md` |
| Architecture Decision Records | {count} ADRs | `.aiwg/architecture/adr-*.md` |
| Architecture Sketch | {status} | `.aiwg/architecture/architecture-sketch.md` |

### Testing

| Artifact | Status | Location |
|----------|--------|----------|
| Test Strategy | {status} | `.aiwg/testing/test-strategy.md` |
| Test Plan | {status} | `.aiwg/testing/test-plan.md` |

### Security

| Artifact | Status | Location |
|----------|--------|----------|
| Threat Model | {status} | `.aiwg/security/threat-model.md` |
| Data Classification | {status} | `.aiwg/security/data-classification.md` |

### Management

| Artifact | Status | Location |
|----------|--------|----------|
| Risk Register | {count} risks, {retired_pct}% retired | `.aiwg/risks/risk-register.md` |
| Stakeholder Agreement | {status} | `.aiwg/management/stakeholder-agreement.md` |

---

## Architecture Summary

### Key Decisions

{Summary of top 3-5 ADRs with their decisions}

1. **ADR-001: {title}** — {decision summary}
2. **ADR-002: {title}** — {decision summary}
3. **ADR-003: {title}** — {decision summary}

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| {layer} | {technology} | {rationale} |

---

## Iteration Plans

### Iteration 1: {theme}

**Duration**: {duration}
**Goal**: {iteration_goal}

| Story | Priority | Estimate |
|-------|----------|----------|
| {story_title} | {P1/P2/P3} | {estimate} |

### Iteration 2: {theme}

**Duration**: {duration}
**Goal**: {iteration_goal}

| Story | Priority | Estimate |
|-------|----------|----------|
| {story_title} | {P1/P2/P3} | {estimate} |

---

## Open Items

| Item | Severity | Owner | Due |
|------|----------|-------|-----|
| {description} | {high/medium/low} | {owner} | {due_date} |

---

## Risk Summary

| Risk | Severity | Status | Mitigation |
|------|----------|--------|------------|
| {risk_description} | {critical/high/medium/low} | {open/mitigated/retired} | {mitigation_summary} |

---

## Next Steps

1. {Immediate action 1}
2. {Immediate action 2}
3. {Immediate action 3}

**Ready to begin construction**: Run `/flow-guided-implementation` or start coding against Iteration 1 stories.

---

## References

- State file: `.aiwg/reports/accelerate-state.json`
- Gate reports: `.aiwg/gates/`
- All artifacts: `.aiwg/`
