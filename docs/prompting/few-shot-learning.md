# Few-Shot Learning Examples

**Audience**: Developers and technical users building prompts for AI agents
**Level**: Intermediate
**Related AIWG Rules**: `few-shot-examples`

---

## What Few-Shot Prompting Is

Few-shot prompting means placing 2–3 worked examples inside the prompt itself before the actual task. The model uses these examples to infer the expected format, tone, level of detail, and domain conventions—without requiring fine-tuning or additional training.

The AIWG `few-shot-examples` rule mandates this for every agent definition, citing Schick et al. (2023): 2–5 examples are sufficient for most tasks, diverse examples outperform similar ones, and outputs should be complete rather than truncated. This guide translates those principles into reusable prompt templates for your own work.

---

## How Many Examples to Include

### The 2–3 Rule

Two to three examples is the practical sweet spot for most tasks:

- **1 example** establishes format but leaves room for drift on complexity
- **2–3 examples** establishes format, complexity range, and domain conventions
- **4+ examples** adds token cost with diminishing returns, and can overfit to example style

For highly structured outputs (test generation, code scaffolding, specific document formats), 3 examples that span simple through complex scenarios provide the best consistency.

For open-ended tasks (summarization, analysis, explanation), 2 examples are usually sufficient—the format is less rigid and the model has more latitude.

For zero-shot-capable tasks where consistency is the primary goal, a single high-quality example often beats three mediocre ones.

### When to Use More

Increase example count when:

- The output format is unusually strict or domain-specific
- Early results are inconsistent despite 2–3 examples
- The task involves specialized vocabulary the model may not know well
- You are selecting examples dynamically (see Dynamic Few-Shot Selection below)

---

## Diversity Requirements

Examples must span the complexity range your task will encounter in production. Three levels cover most scenarios:

| Level | Description | Purpose |
|---|---|---|
| Simple | Minimal inputs, happy path, no edge cases | Establishes baseline format |
| Moderate | Realistic production scenario, some complexity | Sets standard expectations |
| Complex | Edge cases, error handling, integrations, exceptions | Tests robustness |

Examples that cluster at the same complexity level teach the model one thing well and leave it unprepared for variation. A common mistake is writing three "moderate" examples because they are the easiest to construct.

**What diversity means in practice:**

- For code review examples: a trivial bug, a logic error with side effects, a security issue that requires architectural context
- For documentation examples: a simple function, a class with multiple methods, an API endpoint with authentication and error states
- For test generation: a pure function, a function with side effects, an integration point with mocks needed

---

## Format Consistency

Every example must use identical structure. If your first example uses a `## Summary` header, all examples must. If the first example has bold labels for input fields, all examples must.

Models are pattern matchers. Inconsistency in example format produces inconsistency in output format.

**Checklist for format consistency across examples:**

- Same section headers in same order
- Same label style (bold, colon-separated, etc.)
- Same code block language tags
- Same level of detail in equivalent sections
- Same handling of optional fields (either always include or always omit)

---

## Reusable Prompt Templates

### Template 1: Code Review

```
Review each code snippet following this format:

---
EXAMPLE 1

Code:
```python
def add(a, b):
    return a + b
```

Review:
- Intent: Add two values and return the result.
- Correctness: Works for numeric inputs. No type validation.
- Edge Cases: Will concatenate strings rather than add them; no guard
  for non-numeric types.
- Maintainability: Clear, but no docstring or type hints.
- Security: No concerns.
- Priority Change: Add type annotations (`def add(a: float, b: float)
  -> float`) to surface misuse at development time.

---
EXAMPLE 2

Code:
```python
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
```

Review:
- Intent: Fetch a user record by ID.
- Correctness: Returns results but exposes all columns including
  sensitive fields.
- Edge Cases: Non-integer user_id will cause a SQL error rather than
  a clean exception.
- Maintainability: String formatting in queries is an anti-pattern
  that makes intent hard to verify.
- Security: CRITICAL — SQL injection vulnerability. user_id is
  interpolated directly into the query string.
- Priority Change: Replace with parameterized query:
  `db.execute("SELECT * FROM users WHERE id = ?", (user_id,))`
  This is a blocking issue before any deployment.

---
EXAMPLE 3

Code:
```python
def process_payments(orders):
    results = []
    for order in orders:
        try:
            charge = stripe.charge(order.amount, order.card_token)
            results.append({"order_id": order.id, "status": "charged",
                            "charge_id": charge.id})
        except stripe.error.CardError as e:
            results.append({"order_id": order.id, "status": "failed",
                            "error": str(e)})
    return results
```

Review:
- Intent: Process a batch of payment charges and return results.
- Correctness: Handles CardError but not StripeError (network issues,
  rate limits) or generic exceptions. A network failure will raise
  and stop the entire batch.
- Edge Cases: No idempotency key on charge, so a retry could double-
  charge. Empty orders list returns empty list correctly.
- Maintainability: Good structure. Error messages expose raw Stripe
  error strings to callers—consider normalizing.
- Security: card_token should not appear in logs; confirm logging
  config before deploying.
- Priority Change: Add idempotency key (`idempotency_key=order.id`)
  and catch `stripe.error.StripeError` to prevent batch failure on
  transient errors.

---
NOW REVIEW:

Code:
[paste code here]
```

---

### Template 2: API Documentation

```
Document each API endpoint using this format:

---
EXAMPLE 1

Endpoint: GET /users/{id}

Documentation:
## GET /users/{id}

Retrieve a single user by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | UUID of the user |

### Response (200)
```json
{
  "id": "usr_01HXYZ",
  "email": "user@example.com",
  "created_at": "2026-01-15T09:00:00Z"
}
```

### Error Responses
| Status | Description |
|---|---|
| 401 | Missing or invalid API key |
| 404 | User not found |

---
EXAMPLE 2

Endpoint: POST /payments/charge

Documentation:
## POST /payments/charge

Create a new payment charge. This endpoint is idempotent when the
same `idempotency_key` is provided.

### Request Body
```json
{
  "amount": 4999,
  "currency": "usd",
  "card_token": "tok_visa",
  "idempotency_key": "order_12345"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| amount | integer | Yes | Amount in smallest currency unit (cents) |
| currency | string | Yes | ISO 4217 currency code |
| card_token | string | Yes | Payment method token |
| idempotency_key | string | Recommended | Prevents duplicate charges on retry |

### Response (200)
```json
{
  "charge_id": "ch_01HABC",
  "status": "succeeded",
  "amount": 4999,
  "currency": "usd"
}
```

### Error Responses
| Status | Description |
|---|---|
| 400 | Invalid request body or missing required field |
| 402 | Card declined |
| 409 | Duplicate request with different parameters for same idempotency key |
| 429 | Rate limit exceeded |

### Notes
- Amounts must be in the smallest currency unit. $49.99 = `4999`.
- Store `charge_id` for refund and dispute operations.

---
NOW DOCUMENT:

Endpoint: [your endpoint here]
```

---

### Template 3: Test Generation

```
Generate tests for each function using this structure:
- Unit tests for pure logic
- Edge cases for boundary values and error conditions
- Follow the Arrange-Act-Assert pattern

---
EXAMPLE 1

Function: `clamp(value, min, max)` — returns value clamped between min and max

Tests:
```typescript
describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value is below range', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('returns max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles value equal to min boundary', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('handles value equal to max boundary', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
  });
});
```

---
EXAMPLE 2

Function: `parseUserInput(raw)` — parses a JSON string, returns null on invalid input

Tests:
```typescript
describe('parseUserInput', () => {
  describe('valid input', () => {
    it('parses a valid JSON object', () => {
      const result = parseUserInput('{"name": "Alice"}');
      expect(result).toEqual({ name: 'Alice' });
    });

    it('parses a valid JSON array', () => {
      const result = parseUserInput('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('invalid input', () => {
    it('returns null for malformed JSON', () => {
      expect(parseUserInput('{bad json')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseUserInput('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseUserInput(null)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(parseUserInput(42 as any)).toBeNull();
    });
  });
});
```

---
NOW GENERATE TESTS FOR:

Function: [describe the function signature and behavior]
```

---

### Template 4: Technical Writing (Changelog Entries)

```
Write changelog entries in this format:

---
EXAMPLE 1 (patch — bug fix)

Change: Fixed an off-by-one error in pagination that caused the last
item on each page to be omitted.

Entry:
### Fixed
- **Pagination**: Corrected off-by-one error in `paginate()` that dropped
  the final item from each result page. Affected all list endpoints using
  the default page size of 25. Upgrade recommended for all users.

---
EXAMPLE 2 (minor — new feature)

Change: Added support for webhook signature verification using HMAC-SHA256.

Entry:
### Added
- **Webhooks**: Signature verification using HMAC-SHA256. Set `WEBHOOK_SECRET`
  in your environment and pass the `X-Signature-256` header value to
  `verifyWebhook(payload, signature)`. Unsigned webhooks are still accepted
  by default; set `REQUIRE_WEBHOOK_SIGNATURE=true` to enforce verification.

---
EXAMPLE 3 (breaking change)

Change: Removed the deprecated `user.profile` field. It was replaced by
`user.metadata` in v2024.3.0.

Entry:
### Removed
- **BREAKING**: `user.profile` field removed after deprecation in v2024.3.0.
  Migrate to `user.metadata`, which provides the same fields with a
  validated schema. Use `user.metadata` for the same fields with validation.

---
NOW WRITE AN ENTRY FOR:

Change: [describe what changed]
```

---

### Template 5: Security Review

```
Review each component for security issues using this structure:

---
EXAMPLE 1

Component: Password reset flow

Review:
**Risk Level**: HIGH

**Issues Found**:
1. Reset tokens are not invalidated after use. A stolen token can be
   replayed indefinitely.
2. Token expiry is not enforced server-side (only checked client-side).
3. Reset emails do not notify the user if they did not request the reset.

**Required Fixes**:
- Mark tokens as used on first consumption; reject subsequent use.
- Move expiry validation to server-side middleware.
- Send a notification email to the address on file when a reset is requested.

**Acceptable**:
- Token length (32 bytes, cryptographically random) is appropriate.
- HTTPS enforced throughout the flow.

---
NOW REVIEW:

Component: [describe the component]
Code or design: [paste relevant details]
```

---

## Dynamic Few-Shot Selection

Static examples work well for consistent task types. For high-volume applications where task inputs vary widely, dynamic example selection retrieves the most relevant examples from a library at inference time.

### Similarity-Based Retrieval Pattern

```
# Pseudocode for dynamic few-shot selection

1. Maintain a library of (input, output) example pairs
2. Embed the incoming task input
3. Compute cosine similarity to all example embeddings
4. Select the top 2–3 examples by similarity score
5. Insert selected examples into the prompt before the task

# Benefits:
# - Examples are always relevant to the specific input
# - Library can grow without increasing average prompt size
# - Works well when task inputs span many domains or complexity levels
```

### When to Use Dynamic Selection

- High-volume pipelines where a single static example set cannot cover all input types
- Multi-domain applications (one example library for technical, another for marketing copy)
- Tasks where input complexity varies significantly (simple queries alongside complex multi-part requests)

Dynamic selection requires upfront infrastructure (embedding model, vector store) but pays off at scale. For most teams, static 2–3 examples get you most of the benefit without the infrastructure cost.

---

## Before and After Examples

### Documentation Task

**Before (no examples):**

```
Prompt: Write documentation for the `retry` function.
```

Output: Generic docstring, no format specified, inconsistent with existing docs.

**After (with two examples matching existing doc style):**

```
Prompt: Document this function using the project's format, as shown in
these examples:

[Example 1: documented `timeout` function]
[Example 2: documented `backoff` function]

Now document: `retry(fn, maxAttempts, delayMs)`
```

Output: Follows the exact section structure, label style, and code example format of the existing documentation.

---

## AIWG Implementation

The `few-shot-examples` rule enforces this for every AIWG agent definition. Key requirements:

- Every agent system prompt must include 2–3 examples
- Examples must cover simple, moderate, and complex scenarios
- Outputs must be complete—no truncated examples with `[... rest of document]`
- Examples must use realistic domain scenarios, not trivial placeholders
- Format of example outputs must match the agent's actual deliverable format

When writing custom agents for AIWG, use the agent-template.md as the base and populate the `## Examples` section before deploying. Agents without examples fail the validation checklist.

---

## Quick Reference

| Decision | Guideline |
|---|---|
| How many examples | 2–3 for most tasks; 1 if output format is simple; 4+ only for strict formats |
| Example diversity | Always span simple / moderate / complex |
| Format | All examples must use identical structure |
| Content | Use realistic domain scenarios, not "foo" or "test" |
| Truncation | Never — all outputs must be complete |
| Dynamic vs. static | Static for consistent tasks; dynamic for high-volume, variable-input pipelines |

**Prompt skeleton:**

```
[Task description]

---
EXAMPLE 1: [Simple scenario]
Input: [...]
Output: [Complete output]

---
EXAMPLE 2: [Moderate scenario]
Input: [...]
Output: [Complete output]

---
EXAMPLE 3: [Complex scenario]
Input: [...]
Output: [Complete output]

---
NOW:
Input: [Your actual task]
```

**Related AIWG documentation:**

- `@agentic/code/frameworks/sdlc-complete/rules/few-shot-examples.md`
- `@agentic/code/frameworks/sdlc-complete/agents/agent-template.md`
