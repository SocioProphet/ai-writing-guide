# Chain-of-Thought Reasoning Patterns

**Audience**: Developers and technical users building prompts for AI agents
**Level**: Intermediate
**Related AIWG Rules**: `reasoning-sections`, `thought-protocol`, `tao-loop`

---

## What Chain-of-Thought Prompting Is

Chain-of-thought (CoT) prompting asks a model to show its reasoning before producing a final answer. Instead of jumping straight to output, the model works through a problem step by step—catching errors, surfacing assumptions, and producing more defensible conclusions.

Research from Wei et al. (2022) found CoT improves reasoning task performance by 2–4x. The AIWG framework implements this through the `reasoning-sections` rule (which mandates `## Reasoning` blocks in all artifact templates) and the `thought-protocol` rule (which structures agent thinking into seven named thought types). This guide explains how to apply these techniques in your own prompts.

---

## Zero-Shot vs. Few-Shot CoT

There are two ways to activate chain-of-thought reasoning.

### Zero-Shot CoT

Append a reasoning trigger to your prompt. The classic trigger is "Let's think step by step." Variants work for different tasks:

| Trigger phrase | Best for |
|---|---|
| "Let's think step by step." | General reasoning, math, logic |
| "Walk me through your reasoning." | Analysis, decisions, trade-offs |
| "Before answering, identify the key constraints." | Architecture, design |
| "Work through this systematically." | Debugging, diagnosis |
| "Think out loud as you solve this." | Complex problem-solving |

Zero-shot CoT is fast to write and broadly effective. It works poorly on simple factual lookups or highly structured output tasks where the reasoning overhead adds noise.

### Few-Shot CoT

Provide 2–3 examples that include both the reasoning trace and the final answer. The model mirrors the reasoning pattern in its response.

Few-shot CoT produces more consistent results on domain-specific tasks. The cost is prompt length. Use it when zero-shot results are inconsistent or when you need a specific reasoning structure every time.

---

## When CoT Helps (and When It Doesn't)

### Use CoT for:

- Multi-step problems where intermediate steps matter
- Decisions with competing constraints (architecture, prioritization)
- Debugging where the path to the answer is as important as the answer
- Review tasks where transparency builds trust
- Any output that will be scrutinized by another person

### Avoid CoT for:

- Simple factual recall ("What is the syntax for X?")
- Classification with obvious signal ("Is this code a function or a class?")
- Speed-critical pipelines where latency matters more than depth
- Highly structured extraction (CoT adds prose that disrupts JSON output)
- Short-answer tasks where the reasoning pads without adding value

A common mistake is applying CoT universally. If you're asking a model to convert a timestamp to UTC, you don't need it to reason through time zones step by step—you need the converted value.

---

## Structured Reasoning Templates

Numbered steps outperform free-form prose because they create a natural checkpoint system. The model must complete each step before moving to the next.

### General-Purpose Reasoning Template

```
Analyze the following [problem/request] by working through these steps:

1. Problem Analysis: What is the core challenge here? Restate it in your own words.
2. Constraint Identification: What are the key constraints, requirements, or boundaries?
3. Alternative Consideration: What are 2–3 possible approaches? What are the trade-offs?
4. Decision Rationale: Which approach is best given the constraints, and why?
5. Risk Assessment: What could go wrong with this approach? How would you mitigate it?

[Problem/request here]
```

### Decision Tree Template

Use when the problem has branching conditions:

```
Evaluate this decision using the following structure:

1. Identify the decision to be made: [restate clearly]
2. List the criteria that matter (e.g., performance, cost, maintainability)
3. For each option, score it against each criterion (High / Medium / Low)
4. Identify any hard blockers—options that fail a non-negotiable constraint
5. Recommend the option with the best overall fit, with justification

Decision: [your question here]
Options: [option A], [option B], [option C]
```

### Debugging Reasoning Template

```
Debug this issue by reasoning through the following:

1. Symptom: What exactly is failing? Describe the observed behavior.
2. Expected Behavior: What should happen instead?
3. Hypotheses: List 3 possible root causes, ordered by likelihood.
4. Evidence: For each hypothesis, what evidence confirms or rules it out?
5. Diagnosis: Based on the evidence, what is the most likely cause?
6. Fix: What change addresses the root cause (not just the symptom)?

Issue: [paste error or describe behavior]
Context: [paste relevant code or configuration]
```

### Architecture Review Template

```
Review this architectural decision by addressing each point:

1. Context: What problem does this architecture solve?
2. Forces: What competing concerns are in tension (performance vs. simplicity, etc.)?
3. Options Evaluated: What alternatives were considered?
4. Decision: What was chosen and why?
5. Consequences: What are the known trade-offs and risks of this decision?
6. Reversibility: How difficult would it be to change this decision later?

Architecture: [describe the design or paste the ADR]
```

### Code Review Reasoning Template

```
Review this code by working through the following:

1. Intent: What is this code trying to do?
2. Correctness: Does it accomplish that intent correctly in all cases?
3. Edge Cases: What inputs or conditions could cause unexpected behavior?
4. Maintainability: How easy would this be for another developer to change?
5. Security: Are there any injection risks, auth issues, or data exposure concerns?
6. Summary: What is the highest-priority change, and why?

Code: [paste code here]
```

---

## Before and After Examples

### Example 1: Architectural Decision

**Before (no CoT):**

```
Prompt: Should we use a monolith or microservices for our new project?

Response: It depends on your team size and complexity. Microservices scale
better but are more complex to operate.
```

The response is generic and not actionable.

**After (with CoT template):**

```
Prompt: Analyze this architectural decision using the following steps:

1. Context: What is the project and team situation?
2. Constraints: What are the hard requirements?
3. Options: Evaluate monolith vs. microservices vs. modular monolith.
4. Recommendation: Which approach fits best given the constraints?
5. Risk: What is the main risk of the recommended approach?

Context: 4-person team, greenfield B2B SaaS, initial scope is billing and
user management, expected to expand over 18 months.

Response:
1. Context: Small team building a focused initial scope with expansion planned.
2. Constraints: Limited ops capacity, need to ship fast, must scale to
   additional modules later.
3. Options:
   - Monolith: Fast to build, simple to operate, but harder to split later.
   - Microservices: Scales well, but 4-person team will spend more time on
     infrastructure than product.
   - Modular monolith: Clean internal module boundaries, deploys as one unit,
     can split later if needed. Best of both.
4. Recommendation: Modular monolith. Ship fast, enforce module boundaries
   from day one, defer distribution until team and load demand it.
5. Risk: Module boundaries will be violated under deadline pressure. Mitigate
   with linting rules and code review gates.
```

---

### Example 2: Debugging

**Before (no CoT):**

```
Prompt: My API keeps returning 401 errors after a user logs in.

Response: Check your authentication headers and make sure the token is
being sent correctly.
```

**After (with CoT):**

```
Prompt: Debug this issue step by step:
1. Symptom and expected behavior
2. Three most likely root causes
3. Evidence for each hypothesis
4. Diagnosis and fix

Issue: API returns 401 on all authenticated requests immediately after login.
The login endpoint itself returns 200 and a token.

Response:
1. Symptom: Login succeeds (200), subsequent requests fail with 401.
   Expected: Subsequent requests succeed with the token from login.
2. Root causes by likelihood:
   a. Token is not being attached to subsequent requests (most likely)
   b. Token is malformed or using wrong signing key
   c. Token expiry is set incorrectly (e.g., expires immediately)
3. Evidence:
   a. If DevTools shows Authorization header is missing → confirms (a)
   b. If header is present but token fails jwt.verify() → confirms (b)
   c. If token.exp === token.iat → confirms (c)
4. Diagnosis: Start with (a)—inspect the outgoing request in browser
   DevTools. If Authorization header is absent, the client is not
   attaching the token after login. Fix: store the token from the login
   response and attach it as a Bearer token on all subsequent requests.
```

---

## Anti-Patterns

**Anti-pattern 1: Reasoning on simple lookups**

Do not ask a model to "think step by step" about what function to call from a standard library. The reasoning adds latency and often introduces hedging where a direct answer would be cleaner.

**Anti-pattern 2: Unstructured "think step by step"**

The zero-shot trigger works but leaves structure entirely to the model. For tasks where you need consistent output (e.g., reviews that always cover security), use a numbered template instead.

**Anti-pattern 3: Reasoning without conclusion**

A chain of thought that does not converge on a decision is a list, not reasoning. Ensure your template always ends with a synthesis or recommendation step.

**Anti-pattern 4: Burying the conclusion**

Some models front-load caveats in CoT output. If you need the answer before the reasoning (e.g., for programmatic use), ask explicitly: "State your conclusion first, then explain your reasoning."

**Anti-pattern 5: Over-long reasoning chains**

More steps do not equal better output. Five to seven steps covers most scenarios. Beyond that, you are asking the model to reason about its reasoning, which compounds errors rather than reducing them.

---

## AIWG Implementation

AIWG enforces CoT patterns in two ways:

**`reasoning-sections` rule** requires a `## Reasoning` section with numbered steps in every artifact template. The required steps follow the general-purpose template above: Problem Analysis, Constraint Identification, Alternative Consideration, Decision Rationale, Risk Assessment. Artifacts that skip this section fail pre-commit validation.

**`thought-protocol` rule** structures agent reasoning into seven named thought types: Goal, Research, Progress, Extraction, Reasoning, Exception, Synthesis. This is applied at the agent level (system prompts), not the user level. The Research thought type is specifically designed to prevent uninformed action—agents must express what they need to look up before acting on assumptions.

**`tao-loop` rule** standardizes the Thought→Action→Observation loop across iterative agent execution (Ralph loops). Every iteration requires all three components in sequence, ensuring reasoning traces are grounded in actual tool output rather than assumptions.

If you are building custom agents for AIWG, inherit the thought-protocol structure. If you are writing one-off prompts, the templates in this guide apply directly.

---

## Quick Reference

| Scenario | Pattern to use |
|---|---|
| General multi-step problem | General-purpose template (5 numbered steps) |
| Branching decision | Decision tree template |
| Debugging | Debugging template (symptom → hypothesis → evidence → fix) |
| Architecture review | Architecture template |
| Code review | Code review template |
| Speed-critical, simple output | Skip CoT |
| Domain-specific, need consistency | Few-shot CoT with 2–3 complete examples |
| Agent system prompts | Use `thought-protocol` rule (7 thought types) |
| Artifact templates | Use `reasoning-sections` rule (mandatory `## Reasoning` block) |

**Zero-shot triggers by task:**

```
General reasoning:  "Let's think step by step."
Architecture:       "Before recommending, identify the key constraints and trade-offs."
Debugging:          "Walk through the most likely root causes before suggesting a fix."
Review:             "Work through this systematically, covering correctness,
                     edge cases, and maintainability."
Decision:           "Evaluate the options against the criteria before recommending."
```

**Related AIWG documentation:**

- `@agentic/code/frameworks/sdlc-complete/rules/reasoning-sections.md`
- `@agentic/code/frameworks/sdlc-complete/rules/thought-protocol.md`
- `@agentic/code/frameworks/sdlc-complete/rules/tao-loop.md`
