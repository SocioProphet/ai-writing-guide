# AI-Assisted Forensics

This guide describes how AI assistants integrate into the forensics-complete framework, what tasks they handle, where they are constrained, and how every AI-assisted finding is validated before it becomes part of the formal record.

## Overview

AI assistants are most valuable in forensics for tasks that involve pattern recognition across large volumes of structured data — log analysis, timeline correlation, and IOC enrichment. They are not appropriate as autonomous actors on evidence systems. Every command that touches evidence must be approved and executed by a human operator.

The framework uses a dual-path approach: every phase documents both the AI-assisted method and the equivalent traditional (command-line only) method. Investigators can choose either path, verify AI output against the traditional path, or run both and compare results.

## What AI Assistants Do Well

### Log Analysis at Scale

Modern incident logs are too large for purely manual review. A single Apache access log for a busy server can contain millions of entries. AI assistants can:

- Identify statistical anomalies (unusual request rates, uncommon user agents, outlier response sizes)
- Surface requests matching web shell invocation patterns
- Group log entries by behavioral cluster (reconnaissance phase, exploitation phase, post-compromise activity)
- Translate obfuscated payloads (base64, URL encoding, hex) to readable form

The assistant proposes candidate findings. The investigator verifies each candidate against the raw log with grep or direct file examination before including it in the report.

### Timeline Correlation

Multi-source timelines are difficult to reason about because events in different logs use different timestamps, different source identifiers, and different granularity. AI assistants help by:

- Joining events across auth.log, access.log, audit.log, and network captures by IP address and time window
- Identifying causal chains (failed logins from IP X at 03:14, successful login from IP X at 03:22, new cron job created at 03:24)
- Flagging temporal gaps that may indicate log tampering
- Proposing the most likely sequence when event ordering is ambiguous

All timeline reconstructions are presented as hypotheses with supporting evidence citations. The investigator confirms or rejects each step.

### IOC Enrichment

When an IP address, domain, or file hash is identified as suspicious, AI assistants can:

- Describe the context of known indicators (e.g., known Cobalt Strike C2 infrastructure patterns)
- Suggest related indicators to search for (if this IP is C2, these domains are commonly associated)
- Identify which ATT&CK techniques are associated with observed behavior
- Propose YARA or Sigma rules based on observed patterns

IOC enrichment from an AI assistant must be treated as a research starting point, not a confirmed finding. Verify against current threat intelligence sources (VirusTotal, Shodan, your organization's SIEM, external feeds) before including in the report.

### Report Generation

AI assistants accelerate the documentation phase:

- Drafting the technical narrative from structured notes and findings
- Formatting ATT&CK technique tables
- Writing executive summaries from technical content
- Generating IOC lists in structured formats (STIX, CSV, JSON)
- Populating report templates with findings

All AI-generated report content requires human review before finalization. The investigator is responsible for accuracy — AI-generated text can misstate technical details or draw incorrect inferences from ambiguous evidence.

### Hypothesis Generation

When investigation reaches a dead end, AI assistants can suggest unexplored avenues:

- "Given this initial access vector, common next steps include..."
- "These log gaps are consistent with what techniques?"
- "Which systems should be checked for lateral movement from this IP?"

Hypotheses are investigation prompts, not findings. Document which were explored, which were confirmed, and which were ruled out.

## Limitations and Constraints

### AI Cannot Execute Commands on Evidence Systems

The AI assistant proposes commands; the human operator executes them. This is non-negotiable. Command execution on an evidence system:

- Creates new process entries visible in memory and audit logs
- Modifies filesystem access times
- May trigger attacker-controlled tripwires
- Is legally attributed to the person running the session

Every command the assistant suggests must be reviewed by the investigator before execution. The investigator may modify commands, decline them, or choose an alternative approach.

### AI Output Requires Verification

AI-generated findings are not authoritative. Before any AI-identified finding appears in the case record:

1. The investigator must locate the supporting evidence independently
2. The investigator must confirm the evidence matches the finding
3. The investigator must confirm the finding's interpretation is correct

Pattern: the AI says "This log entry looks like a successful brute force." The investigator runs grep against the raw log, finds the matching entries, and confirms the pattern before writing "Brute force success from IP X.X.X.X at 03:22 UTC confirmed."

### AI Has No Persistent Access to the Evidence Environment

The assistant works with:
- Content the investigator explicitly shares (log excerpts, tool output, file contents)
- Context the investigator provides in the conversation

The assistant does not have direct access to the evidence filesystem, cannot run tools autonomously, and cannot query external services. All external lookups (VirusTotal, Shodan, threat intel platforms) are performed by the investigator and results shared with the assistant.

### AI-Generated Conclusions Require Human Validation

This applies with particular force to:
- Root cause determination
- Attacker attribution
- Scope assessments ("these are the only systems affected")
- Legal and regulatory conclusions

The assistant can propose a root cause narrative. The lead investigator signs off on it after independent review.

## Dual-Path Documentation

Each phase of investigation uses this structure:

```
## Finding: [descriptive title]

### AI-Assisted Path
1. Provided log excerpt to assistant
2. Assistant identified pattern: [description]
3. Suggested verification command: [command]
4. Investigator executed command, output: [output or reference to file]
5. Verified: Yes/No — [explanation if No]

### Traditional Path
1. Command: [command run directly]
2. Output: [output or reference to file]
3. Interpretation: [analyst interpretation]

### Finding Status
- Confirmed / Probable / Possible / Ruled Out
- Evidence references: [file names, line numbers, hashes]
```

When both paths reach the same conclusion, confidence in the finding is higher. When they diverge, investigate the discrepancy before recording any conclusion.

## Session Documentation

AI-assisted investigation sessions must be documented in the case record:

- Session start and end times
- AI assistant identifier (tool, model version where known)
- Major findings proposed by the assistant
- Which were verified and which were ruled out
- Commands the assistant suggested and what modifications the investigator made

This documentation ensures that a future reviewer can assess what role AI played in the investigation and replicate the traditional verification steps independently.
