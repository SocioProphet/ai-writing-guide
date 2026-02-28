# Team Composition Patterns

Pre-configured agent team compositions for common development scenarios. Deploy a coordinated team instead of selecting agents individually.

## Quick Start

```bash
# Deploy a pre-configured team
aiwg use sdlc --team api-development

# Or use natural language
"set up an API development team"
"I need a security review team"
"assemble a migration team"
```

## Available Teams

| Team | Agents | Best For |
|------|--------|----------|
| [API Development](api-development.json) | API Designer, Test Engineer, Security Auditor, Technical Writer | Building REST/GraphQL APIs |
| [Full-Stack](full-stack.json) | Frontend Specialist, API Designer, Database Optimizer, DevOps Engineer | End-to-end web applications |
| [Security Review](security-review.json) | Security Auditor, Code Reviewer, Security Architect | Pre-release security audits |
| [Migration](migration.json) | Architecture Designer, Database Optimizer, Test Engineer, DevOps Engineer | Technology migrations |
| [Greenfield](greenfield.json) | Requirements Analyst, Architecture Designer, API Designer, DevOps Engineer | New projects from scratch |
| [Maintenance](maintenance.json) | Code Reviewer, Test Engineer, Performance Engineer, Debugger | Sustaining existing systems |

## Team Structure

Each team config defines:

- **Agents** with roles (`lead`, `contributor`, `reviewer`, `advisor`)
- **Handoffs** with quality gates between agents
- **Overlap resolution** when capabilities intersect
- **Context budget** (`max_context_agents`) to avoid overloading

### Agent Roles

| Role | Description |
|------|-------------|
| `lead` | Primary decision-maker; sets direction and resolves conflicts |
| `contributor` | Produces artifacts; implements solutions |
| `reviewer` | Validates quality; provides feedback without direct implementation |
| `advisor` | Provides domain expertise on demand; not active in every cycle |

### Handoff Protocol

Every handoff between agents includes:

1. **Artifact**: What gets passed (e.g., "OpenAPI specification")
2. **Quality Gate**: What must pass before handoff (e.g., "Schema validates with no errors")
3. **Direction**: Explicit from/to flow

```
Requirements Analyst ──[requirements]──> Architecture Designer
    gate: "Requirements validated; NFRs quantified"

Architecture Designer ──[system design]──> API Designer
    gate: "ADRs approved; technology stack selected"
```

## Dynamic Team Assembly

For scenarios not covered by pre-configured teams, compose custom teams using these guidelines.

### Decision Matrix

| Project Characteristic | Recommended Agents |
|-----------------------|-------------------|
| User-facing UI | Frontend Specialist + UX Lead |
| API-heavy | API Designer + Test Engineer |
| Data-intensive | Database Optimizer + Data Engineer |
| Security-critical | Security Auditor + Security Architect |
| Legacy codebase | Code Reviewer + Debugger + Legacy Modernizer |
| Cloud infrastructure | Cloud Architect + DevOps Engineer |
| ML/AI features | AI/ML Engineer + Data Engineer |
| Mobile app | Mobile Developer + API Designer |
| Compliance required | Compliance Checker + Security Auditor |
| Performance-critical | Performance Engineer + Database Optimizer |

### Team Size Guidelines

| Team Size | When to Use | Tradeoff |
|-----------|-------------|----------|
| 2 agents | Focused tasks (bug fix, single feature) | Fast, minimal coordination |
| 3 agents | Standard features (most common) | Good balance of coverage and speed |
| 4 agents | Complex features or cross-cutting concerns | Thorough but more coordination overhead |
| 5+ agents | Major initiatives (architecture overhaul, migration) | Full coverage but watch context budget |

### Context Budget

Loading too many agents simultaneously degrades performance. The `max_context_agents` field limits how many are active at once.

**Rule of thumb**: Keep 2-3 agents in context. Load others on-demand when their phase of work begins.

```
Phase 1: Requirements Analyst (lead) + Architecture Designer
Phase 2: Architecture Designer (lead) + API Designer
Phase 3: API Designer (lead) + Test Engineer + DevOps Engineer
```

### Overlap Resolution

When two agents cover similar ground:

1. Check the team's `overlap_resolution` field for explicit rules
2. The `lead` role agent takes priority for their domain
3. For shared areas, the agent whose primary expertise is closer wins
4. When in doubt, the agent that produces the artifact owns it

**Common overlaps**:

| Overlap Area | Resolution |
|-------------|-----------|
| API documentation | API Designer owns spec; Technical Writer owns prose |
| Data validation | API Designer owns server-side; Frontend Specialist owns client-side |
| Security review | Security Auditor owns application; Security Architect owns infrastructure |
| Performance | Performance Engineer owns profiling; Database Optimizer owns query tuning |
| Deployment | DevOps Engineer owns pipeline; Cloud Architect owns infrastructure design |

## Schema

Team configs follow the JSON schema defined in [schema.json](schema.json). Validate with:

```bash
# Using ajv-cli
npx ajv validate -s schema.json -d api-development.json
```

## Creating Custom Teams

1. Copy an existing team config as a starting point
2. Adjust agents, roles, and responsibilities
3. Define handoffs with quality gates
4. Set `max_context_agents` based on team size
5. Add overlap resolution rules for shared capabilities
6. Validate against the schema

```json
{
  "name": "My Custom Team",
  "slug": "my-custom",
  "description": "Purpose of this team composition",
  "agents": [
    { "agent": "agent-name", "role": "lead", "responsibilities": ["..."] },
    { "agent": "agent-name", "role": "contributor", "responsibilities": ["..."] }
  ],
  "use_cases": ["When to use this team"],
  "handoffs": [
    { "from": "agent-a", "to": "agent-b", "artifact": "what", "gate": "quality check" }
  ],
  "sdlc_phases": ["construction"],
  "max_context_agents": 3
}
```
