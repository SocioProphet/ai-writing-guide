# Context Window Optimization

**Audience**: Developers and technical users building prompts for AI agents
**Level**: Intermediate to Advanced
**Related AIWG Rules**: `progressive-disclosure`, context management patterns

---

## Why Context Management Matters

Every model interaction has a fixed token budget. How you allocate that budget determines whether the model has what it needs to do the work well—or whether it is reasoning from incomplete information, outdated summaries, or irrelevant noise.

Token limits are not the only concern. A context full of low-signal content (boilerplate, redundant instructions, full file dumps when only a function matters) degrades output quality even when the limit is not approached. The model attends to what is present. If 40% of your context is irrelevant, the model is working with that 40% whether it should be or not.

AIWG addresses this through the `progressive-disclosure` rule (reveal only what is needed for the current phase) and the context management patterns documented in `docs/context-management-patterns.md`. This guide covers the underlying techniques you can apply to any prompt or agent design.

---

## Core Principles

**Relevance over completeness.** Include what the model needs to do the specific task, not everything that might conceivably be useful.

**Recency bias is real.** Models weight recent content more heavily than earlier content in the same context. Structure context so that the most important information is closest to the task.

**Noise degrades performance.** Irrelevant content is not neutral—it competes with relevant content for attention. A targeted 2,000-token context often outperforms a sprawling 20,000-token context on focused tasks.

**External storage extends effective context.** Artifacts written to disk (`.aiwg/` in AIWG) can be retrieved on demand, effectively making the context window a working memory rather than a storage system.

---

## Strategy 1: Progressive Disclosure

Progressive disclosure means providing context in layers—start with the minimum needed, expand only when the task requires it.

### The Three-Layer Model

**Layer 1: Essential** — Always present. Contains the task, key constraints, and the most recent relevant state.

**Layer 2: Detail on demand** — Loaded when the task enters a phase requiring it. Use @-references or explicit retrieval steps.

**Layer 3: Advanced/reference** — Loaded only for specialized sub-tasks or when Layer 2 proves insufficient.

### Implementation in Prompts

For a multi-phase task, structure the initial prompt to establish Layer 1, and instruct the model to request additional context when needed:

```
You are working on [project].

Current task: [specific task]

Key constraints:
- [Constraint 1]
- [Constraint 2]

Available context you can request:
- Architecture overview: @docs/architecture/overview.md
- API reference: @docs/api/reference.md
- Current requirements: @.aiwg/requirements/

Start with what you have. Request additional files only when you reach
a decision point that requires them.
```

This keeps the initial context lean and pulls in detail only when the work demands it. The model signals what it needs rather than receiving everything upfront.

### AIWG Implementation

The `progressive-disclosure` rule formalizes this with phase labels on all artifact templates:

- `ESSENTIAL`: Complete immediately, always visible
- `EXPAND WHEN READY`: Complete during elaboration phase, collapsed by default
- `ADVANCED`: Technical details, loaded during construction phase

This prevents agents from being front-loaded with information they cannot use until a later phase. During Inception, an agent only sees the ESSENTIAL fields. During Construction, all three layers are accessible.

---

## Strategy 2: Context Prioritization

When you cannot reduce context size, structure it so the most important content is in the highest-attention positions.

### Attention Zones

| Position | Attention weight | Best content |
|---|---|---|
| End of context (just before task) | Highest | The task itself, key constraints, format requirements |
| Beginning of context | High | System prompt, role definition, persistent rules |
| Middle of context | Lower | Background, reference material, examples |

This is why system prompts go first and the actual task goes last—both are in high-attention positions.

### Structural Prioritization Template

```
[SYSTEM]
Role: [role definition]
Rules: [critical constraints]

[BACKGROUND — load as needed]
Project context: [brief summary, not full docs]
Prior decisions: [only decisions relevant to this task]

[TASK-SPECIFIC CONTEXT]
Current file: [paste the specific file or section]
Related function: [paste only the relevant function, not the whole module]

[TASK]
[The specific task to accomplish]

[FORMAT]
Output format: [specify exactly what you need]
```

The task and format specification sit at the end—highest attention, clearest signal.

---

## Strategy 3: Chunking Strategies for Large Codebases

Large codebases cannot fit in context. The question is not "how do I fit more" but "how do I select the right pieces."

### Dependency-First Chunking

For a given task, identify the dependency chain and include only what is in that chain:

```
Task: Fix a bug in the payment processing function

Include:
- The payment processing function itself
- Its direct dependencies (helper functions it calls)
- The interface/type definitions it uses
- The test that is failing

Do NOT include:
- Unrelated modules in the same file
- Full class definitions (extract only relevant methods)
- Third-party library code the model already knows
- Comments and documentation unrelated to the bug
```

### Symbol-Level Extraction

Instead of pasting whole files, extract specific symbols:

```
[Relevant function only — not the 400-line file it lives in]

```typescript
export async function processPayment(
  orderId: string,
  amount: number,
  cardToken: string
): Promise<PaymentResult> {
  // [full function body]
}
```

[The type it returns]

```typescript
interface PaymentResult {
  chargeId: string;
  status: 'succeeded' | 'failed';
  errorCode?: string;
}
```

[The test that is failing]

```typescript
it('should return failed status on card decline', async () => {
  // [test body]
});
```
```

Symbol-level extraction reduces context size by 70–90% compared to pasting entire files, while preserving exactly what the model needs.

### Map-Then-Retrieve Pattern

For exploratory tasks where the relevant code is not known upfront:

```
Step 1 — Map: "List the files and functions most likely involved
in [task]. Do not look at code yet."

Step 2 — Retrieve: Fetch only the identified files/functions.

Step 3 — Work: Perform the actual task with the retrieved context.
```

This is the same pattern as the `research-before-decision` rule in AIWG: identify what to look at before loading it into context.

---

## Strategy 4: Summarization for Conversation History

Long conversations accumulate context faster than single-turn prompts. Unmanaged, a session reaches the token limit and either truncates or produces degraded output.

### Strategic Summarization Points

Summarize conversation history at these moments:

| Trigger | Action |
|---|---|
| Phase or task boundary | Summarize completed work before starting new task |
| After a major artifact is generated | Summarize discussion; artifact is now on disk |
| After a complex debugging session is resolved | Summarize the root cause and fix found |
| When context usage exceeds 60% | Proactive summarization before performance degrades |
| Before context usage exceeds 80% | Emergency summarization if proactive was missed |

Do not summarize in the middle of active iteration. Summarization compresses nuance, which matters during rapid back-and-forth refinement.

### What to Preserve vs. Compress

| Preserve verbatim | Safe to compress |
|---|---|
| The current task and its requirements | Earlier exploratory discussion |
| Decisions made and their rationale | Intermediate attempts that did not work |
| Open questions | Context that is now captured in a file on disk |
| Error messages and observed behavior | Background exposition |

### Summarization Prompt Template

When you need to manually compress prior context:

```
Summarize the conversation so far with the following structure:

1. Current task: [one sentence]
2. Decisions made: [bullet list — each decision and brief rationale]
3. Work completed: [bullet list — what has been done and where artifacts live]
4. Open issues: [bullet list — unresolved questions or blockers]
5. Immediate next step: [one sentence]

Keep the summary under 300 words. This summary will replace the full
conversation history.
```

In AIWG, the partial summarization feature (documented in `docs/context-management-patterns.md`) handles this automatically at user-specified split points while preserving recent messages verbatim.

---

## Strategy 5: Memory Management Across Conversation Turns

For multi-turn conversations that span hours or sessions, context management requires an external memory system, not just in-prompt strategies.

### Three Memory Tiers

| Tier | Storage | Lifespan | Access |
|---|---|---|---|
| Working memory | Context window | Current session | Immediate |
| Session memory | Conversation summary | Session | Retrieved on resume |
| Persistent memory | Files on disk (.aiwg/) | Indefinitely | Loaded on demand |

Design multi-turn workflows so that anything that must persist beyond the current context window is written to disk before summarization.

### The Write-Before-Summarize Pattern

```
[After generating an artifact]

1. Write artifact to disk: .aiwg/requirements/UC-004.md
2. Verify file exists
3. Add to summary: "UC-004 (user login) written to .aiwg/requirements/"
4. Summarize context — the artifact is safe, only the discussion is compressed
```

This is why AIWG uses `.aiwg/` as its artifact directory: the context window is working memory, the file system is persistent memory. The two do not compete.

### Session Resume Pattern

When resuming a session after a break, the model has no memory of prior work. A session resume prompt rebuilds working memory efficiently:

```
Resuming work on [project]. Summary of prior session:

Current phase: [Elaboration / Construction / etc.]
Completed: [bullet list of completed artifacts with paths]
In progress: [the task that was underway]
Next step: [what to do now]
Key decisions: [decisions that affect current work]

Files to load for context:
- @.aiwg/requirements/UC-003.md
- @.aiwg/architecture/sad.md
- @src/auth/login.ts

Continue from: [specific point to resume from]
```

This costs roughly 500–800 tokens and restores effective working context without loading the full conversation history.

---

## Reusable Patterns

### Pattern 1: Lean Task Prompt

```
Context: [2–3 sentence project summary]
Task: [specific task, one sentence]
Constraints: [bullet list, 3–5 items max]
File: [paste only the relevant code section]
Output: [specify format — function, review, JSON, etc.]
```

Use when: Single-turn, focused tasks. No exploration needed.

---

### Pattern 2: Progressive Context Load

```
You are working on [project].

Phase: [current SDLC phase or task stage]

Essential context (always available):
- Project: [one sentence]
- Current task: [specific task]
- Constraints: [list]

Load additional context only when needed:
- Architecture: @docs/architecture/overview.md
- API reference: @docs/api/reference.md
- Prior decisions: @.aiwg/architecture/

Proceed with essential context. Request additional files at decision points.
```

Use when: Multi-step tasks where the required context is not fully known upfront.

---

### Pattern 3: Map-Retrieve-Act

```
Step 1 — MAP (do not read files yet):
Which files, functions, or components are most likely relevant to [task]?
List them by name.

[Wait for model response]

Step 2 — RETRIEVE:
[Load the identified files or sections]

Step 3 — ACT:
[Perform the actual task]
```

Use when: Large codebase, exploratory task, relevant files unknown.

---

### Pattern 4: Dependency Chain Extract

```
For the following task, I will provide only the relevant code.

Task: [describe the task]

Function under investigation:
```[language]
[paste the specific function]
```

Direct dependencies:
```[language]
[paste only the functions/types it calls]
```

Failing test:
```[language]
[paste the specific test]
```

[Task instruction]
```

Use when: Debugging or modifying a specific function in a large codebase.

---

### Pattern 5: Summarize-and-Continue

```
Before we continue, summarize what has been accomplished:
1. Current task status
2. Decisions made (with rationale)
3. Artifacts written and their locations
4. Open questions or blockers
5. Next step

Keep this to 200 words or fewer. This summary will anchor the next phase.
```

Use when: Transitioning between task phases, context usage is high, or resuming after a break.

---

## Before and After Examples

### Large File Dump vs. Symbol Extraction

**Before (inefficient):**

```
Prompt: Fix the bug in the payment function.

[Full 600-line payment module pasted]
```

Context cost: ~8,000 tokens. Model attends to 600 lines to find the relevant 40.

**After (targeted):**

```
Prompt: Fix the bug in processPayment. Here is the function and the
failing test:

[40-line function body]
[15-line test]

Error: TypeError: Cannot read property 'chargeId' of undefined
at processPayment (payment.ts:42)
```

Context cost: ~800 tokens. Model has exactly what it needs.

---

### Unstructured Session vs. Structured Resume

**Before (unstructured resume):**

```
"Can you continue working on the authentication module?"
```

The model has no session memory and will ask clarifying questions or produce generic output.

**After (structured resume):**

```
Resuming authentication module work.

Completed: login endpoint (src/auth/login.ts), password validation
  (src/auth/validation.ts), user model (src/models/user.ts)
In progress: password reset flow — stopped after designing the token
  generation step
Next: implement the token storage and email dispatch
Key constraint: tokens must be single-use and expire in 1 hour

Load: @src/auth/login.ts for reference implementation style.
```

The model resumes with full working context in under 200 tokens.

---

## AIWG Implementation

AIWG's context management strategy rests on two mechanisms:

**Progressive disclosure** (`progressive-disclosure` rule): Artifact templates reveal sections in phase-appropriate layers. Agents operating in Inception only see ESSENTIAL fields. Construction-phase agents see all three layers. This prevents context inflation from premature detail.

**External artifact storage** (`.aiwg/` directory): All SDLC artifacts—requirements, architecture docs, test plans—live on disk, not in the context window. Context carries references and summaries; the file system carries full content. Agents load specific artifacts when the task requires them.

The partial summarization feature documented in `docs/context-management-patterns.md` handles conversation history management with user-controlled split points, preserving recent messages verbatim while compressing earlier discussion.

For custom agent development, the `context-librarian` agent handles context budgeting across multi-agent workflows—tracking what is loaded, what is summarized, and what can be offloaded without loss.

---

## Quick Reference

| Problem | Strategy |
|---|---|
| Context limit approaching | Summarize at phase boundary; move artifacts to disk |
| Slow, unfocused output on large files | Extract symbol-level chunks, not whole files |
| Model doesn't know what's already done | Structured session resume prompt |
| Unknown relevant files | Map-retrieve-act pattern |
| Multi-phase task drifts over time | Write-before-summarize pattern |
| High token cost for simple task | Lean task prompt (context + task + file + output format) |

**Context structure order (highest to lowest attention):**

1. Task specification (end of context)
2. Format requirements (just before task)
3. Relevant code/content (middle)
4. Background/reference material (middle)
5. Role/system prompt (beginning)

**Token budget guidance:**

| Context allocation | Target |
|---|---|
| System prompt + role | 5–10% |
| Background and prior decisions | 10–20% |
| Task-specific content (code, files) | 50–60% |
| Task instruction + format | 5–10% |
| Reserve for output | 20–30% |

**Related AIWG documentation:**

- `@agentic/code/frameworks/sdlc-complete/rules/progressive-disclosure.md`
- `@docs/context-management-patterns.md`
- `@agentic/code/frameworks/sdlc-complete/agents/context-librarian.md`
- `@agentic/code/frameworks/sdlc-complete/rules/research-before-decision.md`
