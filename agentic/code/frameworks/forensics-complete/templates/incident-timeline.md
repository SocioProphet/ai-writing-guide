# Incident Timeline

> This document reconstructs the chronological sequence of events for the investigation.
> All timestamps must specify timezone. Sources must be traceable to evidence items in the
> chain-of-custody log. Conflicting timestamps between sources must be documented in the
> Temporal Anomalies section.

---

## Timeline Overview

| Field | Value |
|-------|-------|
| Case ID | `{{case_id}}` |
| Target System | `{{hostname}}` |
| Investigator | `{{investigator_name}}` |
| Incident Start (Earliest Known) | `{{incident_start}}` |
| Incident End (Containment / Last Activity) | `{{incident_end}}` |
| Timeline Duration | `{{timeline_duration}}` |
| Primary Timezone | `{{timezone}}` |
| Investigation Date | `{{investigation_date}}` |
| Timeline Version | `{{timeline_version}}` |

### Log Sources Used to Build Timeline

| Source | Log File / Location | Time Range Available | Evidence Item ID |
|--------|--------------------|--------------------|-----------------|
| `{{source_1}}` | `{{log_path_1}}` | `{{time_range_1}}` | `{{evidence_id_1}}` |
| `{{source_2}}` | `{{log_path_2}}` | `{{time_range_2}}` | `{{evidence_id_2}}` |
| `{{source_3}}` | `{{log_path_3}}` | `{{time_range_3}}` | `{{evidence_id_3}}` |

### Time Source Reliability Assessment

```
{{time_source_assessment}}
```

*(Describe whether system clocks were synchronized via NTP at the time of the incident.
Document any clock skew detected between sources. Note if log timestamps were modified.)*

---

## Event Classification Key

| Code | Event Type | Description |
|------|-----------|-------------|
| ACC | Access | Authentication event, session start/end, remote login |
| EXE | Execution | Process launch, script execution, binary run |
| PER | Persistence | Cron job, service, startup file, authorized key modification |
| LAT | Lateral Movement | Authentication to other systems, network pivoting |
| ESC | Privilege Escalation | sudo use, SUID execution, capability exploitation |
| COL | Collection | File access, data aggregation, credential dumping |
| EXF | Exfiltration | Data transfer to external destination |
| COM | Command and Control | C2 connection, DNS beaconing, tunneling |
| DEF | Defense Evasion | Log deletion, binary masquerading, process injection |
| DIS | Discovery | Enumeration, scanning, reconnaissance activity |
| IMP | Impact | Data destruction, encryption, service disruption |
| SYS | System Event | System boot, shutdown, kernel event |
| CFG | Configuration Change | File modification, permission change, package install |

---

## Timeline

All timestamps in `{{timezone}}`. Events are ordered chronologically. Use the Classification Key above for the Type column.

| Timestamp | Type | Source | Description | Actor | IOC Reference | ATT&CK Technique | Evidence Item |
|-----------|------|--------|-------------|-------|--------------|-----------------|---------------|
| `{{ts_1}}` | `{{type_1}}` | `{{src_1}}` | `{{desc_1}}` | `{{actor_1}}` | `{{ioc_ref_1}}` | `{{technique_1}}` | `{{evidence_1}}` |
| `{{ts_2}}` | `{{type_2}}` | `{{src_2}}` | `{{desc_2}}` | `{{actor_2}}` | `{{ioc_ref_2}}` | `{{technique_2}}` | `{{evidence_2}}` |
| `{{ts_3}}` | `{{type_3}}` | `{{src_3}}` | `{{desc_3}}` | `{{actor_3}}` | `{{ioc_ref_3}}` | `{{technique_3}}` | `{{evidence_3}}` |
| `{{ts_4}}` | `{{type_4}}` | `{{src_4}}` | `{{desc_4}}` | `{{actor_4}}` | `{{ioc_ref_4}}` | `{{technique_4}}` | `{{evidence_4}}` |
| `{{ts_5}}` | `{{type_5}}` | `{{src_5}}` | `{{desc_5}}` | `{{actor_5}}` | `{{ioc_ref_5}}` | `{{technique_5}}` | `{{evidence_5}}` |

### Commands Used to Extract Timeline Events

```bash
# SSH authentication events
journalctl _SYSTEMD_UNIT=sshd.service --since "{{log_start_date}}" -o short-iso \
  | grep -E 'Accepted|Failed|Invalid|session' \
  | awk '{print $1, $2, $3, $NF}' \
  | sort

# Sudo usage timeline
grep 'sudo' /var/log/auth.log | grep -v '#pam_unix' \
  | awk '{print $1, $2, $3, $0}' | sort

# File system modification timeline (sorted by mtime)
find / -newer /tmp/{{case_id}}_reference_marker \
  -not -path '/proc/*' -not -path '/sys/*' -not -path '/dev/*' \
  -type f -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' 2>/dev/null \
  | sort

# Combined system journal export
journalctl --since "{{log_start_date}}" --until "{{log_end_date}}" -o short-iso \
  | sort > /tmp/{{case_id}}_full_timeline.txt
```

---

## Attack Chain Summary

A narrative description of the attack progression from initial access to impact, synthesized from the timeline above.

### Phase 1: Initial Access

```
{{initial_access_narrative}}
```

**ATT&CK Techniques:** `{{initial_access_techniques}}`

### Phase 2: Establishment and Persistence

```
{{persistence_narrative}}
```

**ATT&CK Techniques:** `{{persistence_techniques}}`

### Phase 3: Privilege Escalation / Lateral Movement

```
{{escalation_lateral_narrative}}
```

**ATT&CK Techniques:** `{{escalation_lateral_techniques}}`

### Phase 4: Collection and Exfiltration

```
{{collection_exfiltration_narrative}}
```

**ATT&CK Techniques:** `{{collection_exfiltration_techniques}}`

### Phase 5: Impact

```
{{impact_narrative}}
```

**ATT&CK Techniques:** `{{impact_techniques}}`

---

## Patient Zero Analysis

> Patient zero is the first system or account confirmed to have been compromised.

| Field | Value |
|-------|-------|
| Patient Zero System | `{{patient_zero_system}}` |
| Patient Zero Account | `{{patient_zero_account}}` |
| First Confirmed Compromise Timestamp | `{{patient_zero_timestamp}}` |
| Initial Access Vector | `{{initial_access_vector}}` |
| Evidence Supporting Determination | `{{patient_zero_evidence}}` |
| Confidence in Determination | `{{patient_zero_confidence}}` |

```
{{patient_zero_analysis_narrative}}
```

---

## Temporal Anomalies

Document any cases where:
- Log timestamps conflict between sources
- Timestamps appear manipulated or jump backward
- Log gaps exist that cannot be explained by log rotation
- Clock skew was detected between systems

| Anomaly ID | Timestamp Range | Source(s) Affected | Discrepancy | Assessment | Impact on Timeline |
|------------|----------------|-------------------|-------------|------------|-------------------|
| TA-001 | `{{anomaly_range_1}}` | `{{anomaly_sources_1}}` | `{{discrepancy_1}}` | `{{assessment_1}}` | `{{impact_1}}` |
| TA-002 | `{{anomaly_range_2}}` | `{{anomaly_sources_2}}` | `{{discrepancy_2}}` | `{{assessment_2}}` | `{{impact_2}}` |

### Log Gap Analysis

| Gap ID | Start | End | Duration | Source | Possible Explanation |
|--------|-------|-----|----------|--------|---------------------|
| GAP-001 | `{{gap_start_1}}` | `{{gap_end_1}}` | `{{gap_duration_1}}` | `{{gap_source_1}}` | `{{gap_explanation_1}}` |
| GAP-002 | `{{gap_start_2}}` | `{{gap_end_2}}` | `{{gap_duration_2}}` | `{{gap_source_2}}` | `{{gap_explanation_2}}` |
