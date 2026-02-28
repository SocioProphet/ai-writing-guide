# Forensic Investigation Report

**Case ID:** `{{case_id}}`
**Classification:** `{{classification}}`
**Report Version:** `{{report_version}}`
**Report Date:** `{{report_date}}`
**Prepared By:** `{{investigator_name}}`
**Reviewed By:** `{{reviewer_name}}`

---

## Executive Summary

**Incident:** `{{incident_description}}`

**Target System:** `{{hostname}}` (`{{target_ip}}`)

**Investigation Period:** `{{investigation_start}}` to `{{investigation_end}}`

**Overall Severity:** `{{overall_severity}}` (CRITICAL / HIGH / MEDIUM / LOW)

### Key Findings

`{{executive_summary_narrative}}`

*(2-4 paragraphs. Describe what happened, what was compromised, what the impact was, and what immediate actions were taken. Write for a non-technical executive audience. Avoid jargon. State conclusions directly.)*

### Summary of Actions Taken

| Action | Status |
|--------|--------|
| System isolated from network | `{{isolation_status}}` |
| Evidence preserved | `{{evidence_status}}` |
| Credentials rotated | `{{credentials_status}}` |
| Affected accounts disabled | `{{accounts_status}}` |
| Incident reported to `{{authority}}` | `{{reporting_status}}` |

---

## Investigation Scope and Methodology

### Scope

**In scope:**
- `{{in_scope_1}}`
- `{{in_scope_2}}`

**Out of scope:**
- `{{out_of_scope_1}}`
- `{{out_of_scope_2}}`

### Methodology

This investigation followed a structured forensic methodology:

1. **Triage** — Volatile data captured first (process list, open connections, active sessions) before any system changes.
2. **Authentication Analysis** — Login records, SSH keys, and privilege escalation paths examined.
3. **Process and Service Audit** — Running processes compared to expected baseline; anomalous processes analyzed.
4. **Persistence Sweep** — Cron jobs, systemd units, shell startup files, SUID binaries, and LD_PRELOAD inspected.
5. **Filesystem Analysis** — Recently modified files, hidden files, executable artifacts in world-writable directories.
6. **Network Forensics** — Active connections, routing, firewall rules, and DNS configuration reviewed.
7. **Log Analysis** — System journal, authentication logs, and application logs correlated to build timeline.
8. **Container Audit** — Docker containers compared to baseline; privileged containers and volume mounts inspected.
9. **Evidence Preservation** — All artifacts hashed and stored in `{{evidence_storage_path}}/{{case_id}}/`.

### Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| `{{tool_1}}` | `{{version_1}}` | `{{purpose_1}}` |
| `{{tool_2}}` | `{{version_2}}` | `{{purpose_2}}` |
| `{{tool_3}}` | `{{version_3}}` | `{{purpose_3}}` |

---

## System Profile

| Field | Value |
|-------|-------|
| Hostname | `{{hostname}}` |
| Operating System | `{{os_name}} {{os_version}}` |
| Kernel | `{{kernel_version}}` |
| Architecture | `{{arch}}` |
| Environment | `{{environment}}` |
| Uptime at Investigation Start | `{{uptime}}` |
| System Owner | `{{system_owner}}` |

Detailed system baseline is documented in: `{{target_profile_path}}`

---

## Timeline of Events

> All timestamps are in `{{timezone}}` unless otherwise noted.

| Timestamp | Source | Event | Significance |
|-----------|--------|-------|-------------|
| `{{ts_1}}` | `{{source_1}}` | `{{event_1}}` | `{{significance_1}}` |
| `{{ts_2}}` | `{{source_2}}` | `{{event_2}}` | `{{significance_2}}` |
| `{{ts_3}}` | `{{source_3}}` | `{{event_3}}` | `{{significance_3}}` |

*See `incident-timeline.md` for the complete event timeline.*

---

## Findings

### Findings Summary

| ID | Severity | Finding | Evidence Reference | ATT&CK Technique |
|----|----------|---------|-------------------|-----------------|
| F-001 | `{{severity_1}}` | `{{finding_title_1}}` | `{{evidence_ref_1}}` | `{{attack_technique_1}}` |
| F-002 | `{{severity_2}}` | `{{finding_title_2}}` | `{{evidence_ref_2}}` | `{{attack_technique_2}}` |
| F-003 | `{{severity_3}}` | `{{finding_title_3}}` | `{{evidence_ref_3}}` | `{{attack_technique_3}}` |

### Severity Definitions

| Severity | Definition |
|----------|-----------|
| CRITICAL | Active compromise with ongoing attacker access or data exfiltration |
| HIGH | Confirmed compromise with significant impact; attacker access terminated |
| MEDIUM | Evidence of attempted compromise or policy violation with limited impact |
| LOW | Misconfiguration or anomaly with no confirmed malicious activity |

---

## Detailed Findings

### F-001: `{{finding_title_1}}`

**Severity:** `{{severity_1}}`
**ATT&CK Technique:** `{{attack_technique_1}}`
**Affected Systems:** `{{affected_systems_1}}`

**Description:**

`{{finding_description_1}}`

**Evidence:**

```
{{evidence_content_1}}
```

**Evidence Location:** `{{evidence_path_1}}`
**Evidence Hash (SHA-256):** `{{evidence_hash_1}}`

**Analysis:**

`{{finding_analysis_1}}`

**Impact:**

`{{finding_impact_1}}`

**Remediation:** See Remediation Plan, Action `{{remediation_ref_1}}`.

---

### F-002: `{{finding_title_2}}`

**Severity:** `{{severity_2}}`
**ATT&CK Technique:** `{{attack_technique_2}}`
**Affected Systems:** `{{affected_systems_2}}`

**Description:**

`{{finding_description_2}}`

**Evidence:**

```
{{evidence_content_2}}
```

**Evidence Location:** `{{evidence_path_2}}`
**Evidence Hash (SHA-256):** `{{evidence_hash_2}}`

**Analysis:**

`{{finding_analysis_2}}`

**Impact:**

`{{finding_impact_2}}`

**Remediation:** See Remediation Plan, Action `{{remediation_ref_2}}`.

---

*(Add additional finding sections following the F-001 / F-002 pattern above.)*

---

## Indicators of Compromise

All IOCs are also recorded in `ioc-register.md` for this case.

| Type | Value | Context | Confidence | ATT&CK Technique |
|------|-------|---------|-----------|-----------------|
| `{{ioc_type_1}}` | `{{ioc_value_1}}` | `{{ioc_context_1}}` | `{{ioc_confidence_1}}` | `{{ioc_technique_1}}` |
| `{{ioc_type_2}}` | `{{ioc_value_2}}` | `{{ioc_context_2}}` | `{{ioc_confidence_2}}` | `{{ioc_technique_2}}` |
| `{{ioc_type_3}}` | `{{ioc_value_3}}` | `{{ioc_context_3}}` | `{{ioc_confidence_3}}` | `{{ioc_technique_3}}` |

---

## Remediation Recommendations

Full remediation steps are documented in `remediation-plan.md` for this case.

### Priority Matrix

| Priority | Action | Owner | Target Date |
|----------|--------|-------|-------------|
| P1 — Immediate | `{{immediate_action_1}}` | `{{owner_1}}` | `{{target_date_1}}` |
| P1 — Immediate | `{{immediate_action_2}}` | `{{owner_2}}` | `{{target_date_2}}` |
| P2 — Short-term | `{{short_term_action_1}}` | `{{owner_3}}` | `{{target_date_3}}` |
| P3 — Medium-term | `{{medium_term_action_1}}` | `{{owner_4}}` | `{{target_date_4}}` |

---

## Evidence Chain Documentation

All evidence collected during this investigation is recorded in `chain-of-custody.md` for this case.

### Evidence Storage

| Location | Access Control | Backup |
|----------|---------------|--------|
| `{{evidence_primary_path}}` | `{{access_control}}` | `{{backup_location}}` |

### Hash Manifest

SHA-256 checksums for all collected evidence files are stored at:
`{{evidence_storage_path}}/{{case_id}}/evidence_hashes.sha256`

To verify integrity:

```bash
sha256sum -c /{{evidence_storage_path}}/{{case_id}}/evidence_hashes.sha256
```

---

## Appendices

### Appendix A: Raw Command Output

`{{appendix_a_content}}`

### Appendix B: Full Log Excerpts

`{{appendix_b_content}}`

### Appendix C: References

| Reference | URL / Location |
|-----------|---------------|
| MITRE ATT&CK Framework | https://attack.mitre.org/ |
| `{{reference_1}}` | `{{reference_1_url}}` |
| `{{reference_2}}` | `{{reference_2_url}}` |

### Appendix D: Glossary

| Term | Definition |
|------|-----------|
| IOC | Indicator of Compromise — artifact observed on a network or system indicating intrusion |
| TTPs | Tactics, Techniques, and Procedures — the behavior patterns of a threat actor |
| ATT&CK | MITRE Adversarial Tactics, Techniques, and Common Knowledge framework |
| SUID | Set User ID — Unix file permission that allows execution with file owner's privileges |
| C2 | Command and Control — infrastructure used by an attacker to communicate with compromised systems |
