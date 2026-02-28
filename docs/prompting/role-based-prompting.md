# Role-Based Prompting Strategies

**Audience**: Developers and technical users building prompts for AI agents
**Level**: Intermediate
**Related AIWG**: Agent system with specialized roles, multi-agent orchestration

---

## What Role-Based Prompting Is

A role prompt establishes the identity, expertise, and behavioral constraints of a model before it begins a task. It answers three questions: who is speaking, what do they know, and what do they care about?

A well-constructed role activates relevant domain knowledge, sets the appropriate register (formal vs. conversational, terse vs. thorough), and anchors the model's perspective when trade-offs must be made. Done poorly, role prompting produces a model that hedges more elaborately than it would without any role at all.

AIWG uses role-based prompting as the foundation of its entire agent system. Each specialized agent—Security Auditor, API Designer, Test Engineer, Architecture Designer—is a role definition with tools, constraints, few-shot examples, and thought protocols layered on top. This guide covers how to construct effective roles, how to compose them, and what to avoid.

---

## Beyond "Expert": A Taxonomy of Effective Roles

"You are an expert software engineer" is the most common and least effective role prompt. It tells the model almost nothing about perspective, priorities, or constraints.

Effective roles specify:

1. **Domain** — the field of knowledge
2. **Perspective** — the angle from which the domain is approached
3. **Priority hierarchy** — what matters most when there are trade-offs
4. **Communication style** — how to present findings
5. **Constraints** — what to avoid or flag

### Role Taxonomy

| Category | Examples | What they activate |
|---|---|---|
| **Specialist reviewer** | Security auditor, performance engineer, accessibility specialist | Domain-specific critique with prioritized findings |
| **Author/builder** | API designer, technical writer, test engineer | Production-quality output following conventions |
| **Advisor/strategist** | Principal engineer, staff architect, CTO | High-level trade-off analysis, long-term thinking |
| **Skeptic/challenger** | Devil's advocate, red team analyst, QA lead | Active search for problems, counter-arguments |
| **Translator** | Technical writer for non-technical audiences, documentation for junior devs | Adaptation of complexity to a specific reader level |
| **Domain expert** | Healthcare data architect, fintech compliance analyst, embedded systems engineer | Industry-specific vocabulary, constraints, and conventions |

The category determines what the role emphasizes. A "specialist reviewer" finds problems. An "author/builder" produces artifacts. An "advisor/strategist" gives recommendations. Match the category to the output you need.

---

## Constructing a High-Quality Role

A complete role prompt has five components:

```
You are a [title] with [years/context of experience] in [specific domain].

Your perspective: [what lens you bring to the task]

Your priorities (in order):
1. [Most important concern]
2. [Second concern]
3. [Third concern]

Your output style: [how you communicate — terse/verbose, formal/direct, etc.]

You do not: [specific behaviors to avoid]
```

### Worked Example: Generic vs. Specific

**Generic (ineffective):**

```
You are an expert software engineer. Review this code.
```

**Specific (effective):**

```
You are a senior backend engineer with 10 years of experience in
high-traffic distributed systems. You have been burned by outages
caused by unhandled edge cases and silent data corruption.

Your perspective: You look at code from the standpoint of what will
fail at 3am under unexpected load.

Your priorities (in order):
1. Correctness under all inputs, including malformed and adversarial ones
2. Failure modes: does the system fail safely and loudly?
3. Observability: will the on-call engineer know what broke and why?
4. Maintainability (important, but secondary to the above)

Your output style: Direct and prioritized. Lead with the most critical
issue. Skip praise unless something is genuinely noteworthy.

You do not: suggest style changes, add unnecessary caveats, or defer
critical findings with "this might be fine depending on context."
```

The second prompt produces a substantively different review—one focused on production failure modes rather than general best practices.

---

## Role-Task Alignment Matrix

Not every role works for every task. This matrix maps common task types to the roles that produce the best results:

| Task | Recommended Role | Why |
|---|---|---|
| Code review for correctness | Senior engineer who has debugged production incidents | Activates skepticism toward edge cases |
| Code review for security | Security engineer who does penetration testing | Activates adversarial thinking |
| API design | API designer who supports external developers | Activates perspective of the consumer, not the implementer |
| Technical documentation | Technical writer who knows the audience is a junior developer | Calibrates complexity appropriately |
| Architecture decision | Principal engineer who must justify decisions to a skeptical team | Activates trade-off articulation |
| Test case generation | QA engineer who writes tests to find bugs, not confirm success | Activates coverage of failure paths |
| Performance review | Performance engineer who has profiled production systems | Activates measurement-first thinking |
| Accessibility review | Accessibility specialist who uses assistive technology daily | Activates awareness of non-visual interaction patterns |
| Requirements analysis | Product engineer who has shipped to the stated user type | Activates empathy for actual user behavior |
| Security threat model | Red team analyst who thinks like an attacker | Activates adversarial perspective on trust boundaries |

---

## Role Composition: Combining Multiple Roles

Single roles work well for focused tasks. Complex artifacts (architecture decisions, thorough reviews) benefit from multiple roles applied in sequence or in parallel.

### Sequential Composition

Apply roles one after another, each building on the previous output:

```
Step 1 — Author Role:
"You are an API designer creating the initial endpoint specification
for a payment processing API. Design the endpoints, request/response
shapes, and error codes."

[Model produces initial design]

Step 2 — Critic Role:
"You are a security engineer reviewing an API design for vulnerabilities.
The designer prioritized developer experience over security constraints.
Your job is to find what they missed."

[Pass Step 1 output to Step 2]

Step 3 — Synthesizer Role:
"You are a principal engineer reconciling an API design with security
findings. Produce a revised design that addresses the security issues
without unnecessarily degrading the developer experience."
```

Sequential composition works when each stage has a distinct job and produces output the next stage needs.

### Parallel Composition

Apply multiple roles to the same input and synthesize the results:

```
"Review this architecture proposal from three perspectives, clearly
labeled:

SECURITY PERSPECTIVE (as a security engineer):
[findings]

PERFORMANCE PERSPECTIVE (as a performance engineer):
[findings]

OPERATIONS PERSPECTIVE (as a site reliability engineer):
[findings]

SYNTHESIS:
Which issues are highest priority when accounting for all three perspectives?
```

Parallel composition is efficient for multi-angle reviews and produces a richer set of findings than any single role alone.

AIWG uses this pattern in its ensemble review system, where criticality-panel-sizing determines how many reviewer agents examine an artifact simultaneously. The synthesizer agent then consolidates findings by priority.

---

## Reusable Role Prompt Templates

### Template 1: Security Reviewer

```
You are a security engineer with 8 years of experience in application
security and penetration testing. You approach code as an attacker
looking for exploitable weaknesses, not as a developer looking for
correctness.

Your perspective: You assume the worst about inputs, trust boundaries,
and error handling. You have personally exploited SQL injection,
authentication bypasses, and insecure deserialization vulnerabilities
in production systems.

Your priorities (in order):
1. Authentication and authorization flaws
2. Injection vulnerabilities (SQL, command, template)
3. Sensitive data exposure (credentials in logs, over-exposed APIs)
4. Broken session management
5. Denial-of-service vectors

Your output format: List issues by severity (Critical / High / Medium / Low).
For each issue: state the vulnerability type, where it occurs, the attack
scenario, and the specific fix.

You do not: approve code as "probably fine." If you cannot confirm a
control is in place, flag the absence.

Review: [paste code or design]
```

---

### Template 2: API Designer (Consumer-First)

```
You are a senior API designer who has spent 6 years building and
maintaining public APIs used by thousands of external developers.
You have personally handled developer support tickets and know which
design decisions cause the most confusion and frustration.

Your perspective: You design for the developer who will read the
documentation at midnight trying to meet a deadline. Clarity, predictability,
and forgiveness are your core principles.

Your priorities (in order):
1. Consistency: same patterns for similar operations across the entire API
2. Discoverability: names and structures that match developer intuition
3. Forgiveness: helpful error messages, not cryptic status codes
4. Performance: design that enables efficient client implementations

Your output style: Provide the endpoint design with full request/response
schemas, error codes, and a brief rationale for each significant decision.
Call out where you made a trade-off.

You do not: design for the internal implementation. If the implementation
is awkward, note it, but keep the API surface clean.

Design task: [describe what the API needs to do]
```

---

### Template 3: Principal Engineer (Decision Advisor)

```
You are a principal engineer at a mid-sized software company who has
been through 3 major platform migrations and 2 significant production
outages. You advise on architectural decisions that affect multiple teams.

Your perspective: You think in 18-month horizons. You have seen "pragmatic"
shortcuts become 3-year maintenance burdens. You have also seen
overengineered systems that teams abandoned because they were too complex
to change.

Your priorities (in order):
1. Team capability: can the current team build, operate, and change this?
2. Operational simplicity: how hard is this to run at 2am when something breaks?
3. Reversibility: how difficult would it be to change this decision later?
4. Performance and scale: does this meet requirements with headroom?

Your output style: Structured recommendation with clear rationale. State
your recommendation first, then the reasoning. Acknowledge the strongest
counter-argument to your position.

You do not: recommend the most technically sophisticated option by default.
Sophistication is a cost, not a feature.

Decision to advise on: [describe the architectural decision]
```

---

### Template 4: Technical Writer (Audience-Calibrated)

```
You are a technical writer who has spent 5 years writing developer
documentation for a developer tools company. You specialize in writing
for an audience of intermediate developers who are competent in their
primary language but unfamiliar with your product.

Your perspective: You measure documentation success by whether a new
user can complete their first integration without opening a support ticket.
You know that developers skip prose and scan for code examples first.

Your priorities (in order):
1. Completeness: every required step is present with no assumed knowledge
2. Scannability: code examples and headers before prose
3. Accuracy: examples that actually work against the current API version
4. Concision: no padding, no unnecessary preamble

Your output style: Lead with a working code example. Follow with explanation
of what it does and why. End with error scenarios the developer is likely
to encounter.

You do not: write introductory paragraphs that describe what the reader
is about to learn. Show, then explain.

Document this: [describe the feature or endpoint to document]
```

---

### Template 5: Red Team Analyst

```
You are a red team analyst who tests software systems by assuming the
role of an adversary trying to break them. Your job is to find failure
modes before attackers or users do.

Your perspective: You do not assume good faith from inputs, integrations,
or users. You ask "what happens if someone deliberately tries to break
this?" and "what happens if the dependency I rely on behaves unexpectedly?"

Your priorities (in order):
1. Trust boundary violations: where does the system assume inputs are
   safe that they are not?
2. Failure cascade: where does one component's failure cause others to fail?
3. Observability gaps: where would a failure go undetected?
4. Assumption violations: where is the system brittle to changes in
   upstream behavior?

Your output style: Enumerate attack scenarios concretely. For each: describe
the scenario, the impact, and whether it is exploitable by an external actor
or requires internal access.

You do not: soften findings. A critical vulnerability is a critical
vulnerability regardless of how unlikely the attack scenario seems.

System to red-team: [describe the system or paste a design document]
```

---

## Anti-Patterns

### Anti-pattern 1: Generic expertise claims

"You are an expert in [domain]" activates broad knowledge but no perspective or priority. An expert security engineer and an expert developer experience engineer have opposite priorities when reviewing the same code. Specify the perspective, not just the credential.

### Anti-pattern 2: Role confusion

Assigning contradictory role priorities in a single prompt produces hedged, uncommitted output:

```
# Bad: Contradictory priorities
You are a developer who prioritizes speed and an architect who
prioritizes maintainability. Review this code for both.
```

The model will produce a response that acknowledges trade-offs without recommending anything. Use sequential or parallel composition instead—keep each role internally consistent.

### Anti-pattern 3: Overloaded personas

Adding too many responsibilities to a single role dilutes focus:

```
# Bad: Overloaded
You are a security expert, performance engineer, accessibility specialist,
and technical writer. Review this feature from all angles.
```

Break this into separate role invocations. Each review will be deeper.

### Anti-pattern 4: Roleplaying without constraints

Roles that describe experience without specifying constraints or behaviors produce variable output:

```
# Underspecified
You are a 10-year veteran software engineer.
```

What do they care about? How do they communicate? What do they avoid? Without these, the role adds little beyond a vague tone calibration.

### Anti-pattern 5: Mismatched role and task

Using an author role for a critique task or a critic role for an authoring task produces off-target output. A "technical writer" role asked to identify security vulnerabilities will produce security findings written in a friendly, explanatory style rather than a prioritized risk list.

---

## AIWG Agent System

AIWG's agent catalog implements role-based prompting at scale. Each agent definition includes:

- A role description with specific domain experience and perspective
- A priority hierarchy that governs trade-off decisions
- Explicit output format requirements
- Constraints on what the agent should not do
- Two to three few-shot examples that demonstrate the role in action

The SDLC framework uses role specialization to match the right agent to each artifact type. Architecture decisions go to the Architecture Designer (with advisor/strategist role). Security findings go to the Security Auditor (specialist reviewer with attacker perspective). Test generation goes to the Test Engineer (author role focused on failure path coverage).

When multiple agents review the same artifact, the `criticality-panel-sizing` rule determines how many reviewers are engaged based on artifact risk level. A synthesizer agent consolidates findings using the parallel composition pattern described above.

To build a custom agent for AIWG, start with `agent-template.md` and fill in the five role components described in this guide before adding tools and examples.

---

## Quick Reference

**Role construction checklist:**

- [ ] Title with specific domain (not just "expert")
- [ ] Perspective: what lens does this role bring?
- [ ] Priority hierarchy (ordered, not a flat list)
- [ ] Output style specification
- [ ] Explicit "you do not" constraints

**Role categories by task:**

| Need to... | Use role category |
|---|---|
| Find problems | Specialist reviewer or skeptic/challenger |
| Create artifacts | Author/builder |
| Make recommendations | Advisor/strategist |
| Translate complexity | Translator |
| Think like an attacker | Red team/adversarial |

**Composition patterns:**

- **Sequential**: author → critic → synthesizer (builds on previous output)
- **Parallel**: multiple roles on same input, then synthesize findings

**Related AIWG documentation:**

- `@agentic/code/frameworks/sdlc-complete/agents/agent-template.md`
- `@agentic/code/frameworks/sdlc-complete/agents/security-auditor.md`
- `@agentic/code/frameworks/sdlc-complete/agents/api-designer.md`
- `@agentic/code/frameworks/sdlc-complete/rules/criticality-panel-sizing.md`
- `@agentic/code/frameworks/sdlc-complete/rules/few-shot-examples.md`
