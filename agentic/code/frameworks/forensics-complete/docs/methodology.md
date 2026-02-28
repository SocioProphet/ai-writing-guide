# Forensics Methodology

This framework aligns with two complementary standards: NIST SP 800-86 for the technical forensic process and SANS PICERL for incident response lifecycle management. Understanding both and how this framework maps to each is essential for producing defensible, actionable investigations.

## NIST SP 800-86 Phases

NIST SP 800-86 defines four sequential phases for digital forensics. These phases describe how to handle evidence technically.

### Phase 1: Collection

Collection is the process of identifying, labeling, recording, and acquiring data from sources while preserving integrity.

Key requirements during collection:
- Document the state of the system before any action is taken
- Follow volatility order (see `rules/volatility-order.md`)
- Hash all evidence at point of collection (see `rules/evidence-integrity.md`)
- Record chain of custody from the moment evidence is touched
- Use write blockers for physical media
- Never modify the source — read-only acquisition only (see `rules/non-destructive.md`)

Sources to consider for collection:
- Live system memory
- Running process state (open files, network connections, loaded modules)
- Disk images (physical and logical)
- Log files (local and centralized)
- Network packet captures
- Cloud API audit logs (CloudTrail, Azure Monitor, GCP Audit Logs)
- Container runtime logs and layer artifacts
- Application logs and database transaction logs

### Phase 2: Examination

Examination involves processing and reducing the collected data to identify items relevant to the investigation. This is the filtering phase — not all collected data is evidence.

Examination activities:
- Decompress and parse archived logs
- Carve deleted files from unallocated disk space
- Reconstruct filesystem timelines (MAC times: Modified, Accessed, Changed)
- Identify file types by signature, not extension
- Recover partial or fragmented files
- Parse memory structures to extract processes, network artifacts, and strings
- Filter log data by relevant time windows and source systems

Tools for examination:
- Autopsy / Sleuth Kit (filesystem examination)
- Volatility 3 (memory examination)
- Plaso / log2timeline (log parsing and normalization)
- foremost / scalpel (file carving)

### Phase 3: Analysis

Analysis draws conclusions from the examined data. This is where MITRE ATT&CK mapping, timeline reconstruction, and root cause identification happen.

Analysis activities:
- Build a unified timeline from multiple data sources
- Map observed behaviors to ATT&CK techniques (see `docs/attack-mapping.md`)
- Identify the initial access vector
- Trace lateral movement paths
- Determine the full scope of compromise (which systems, which accounts, which data)
- Identify persistence mechanisms
- Assess attacker objectives and what may have been achieved
- Document what is known, what is suspected, and what remains unknown

Analysis output:
- Attack timeline with corroborating evidence for each event
- ATT&CK technique mapping with evidence references
- Scope assessment (confirmed compromised, possibly compromised, not affected)
- IOC list (IP addresses, file hashes, domain names, user agents)
- Root cause determination

### Phase 4: Reporting

Reporting translates technical findings into documentation appropriate for different audiences.

Report types:
- **Technical report**: Full evidence chain, tool outputs, analyst reasoning, ATT&CK mapping
- **Executive summary**: Business impact, scope, recommended actions (non-technical)
- **IOC report**: Machine-readable indicators for ingestion into security controls
- **Legal documentation**: Chain of custody records, evidence integrity verification

Report requirements:
- Every finding must cite the evidence that supports it
- All evidence references must include hash values verified at report time
- Uncertainty must be stated explicitly ("confirmed", "probable", "possible", "unknown")
- Analysis limitations must be noted (what could not be examined and why)

## SANS PICERL

PICERL defines the incident response lifecycle from detection through recovery. Where NIST 800-86 focuses on the forensic process, PICERL focuses on the response actions taken in parallel.

### Preparation

Establish capabilities before an incident occurs:
- Deploy log aggregation (SIEM)
- Configure endpoint detection (EDR)
- Set up centralized collection infrastructure
- Define escalation paths and on-call procedures
- Build and maintain tool kits (statically-linked binaries, acquisition tools)
- Practice with tabletop exercises

### Identification

Determine whether an incident is occurring and its initial scope:
- Alert triage (true positive vs. false positive)
- Initial scoping (how many systems, how long)
- Severity classification
- Activate incident response team
- Open case record and begin documentation

### Containment

Limit the damage. Two sub-phases:
- **Short-term containment**: Immediate actions to stop active damage (network isolation, account lockout). Must not destroy evidence.
- **Long-term containment**: Controlled environment for continued investigation while preventing re-compromise.

Containment decisions require operator authorization per `rules/non-destructive.md`. Collection (NIST phases 1-2) should be complete before containment actions modify the environment.

### Eradication

Remove attacker artifacts and close the initial access vector:
- Remove malware and persistence mechanisms
- Patch or mitigate the exploited vulnerability
- Reset compromised credentials
- Rebuild compromised systems from known-good images where appropriate

### Recovery

Restore systems to operational status and verify clean operation:
- Restore from backup or rebuild
- Confirm no persistence mechanisms remain
- Monitor for re-compromise during and after recovery
- Phased return to production

### Lessons Learned

Document what happened and improve defenses:
- Post-incident review meeting (within 2 weeks)
- Update detection rules based on observed attacker behavior
- Fix process gaps identified during response
- Share IOCs with industry partners (ISAC, FS-ISAC, etc.)
- Update incident response playbooks

## How This Framework Maps to Both Standards

| Framework Stage | NIST SP 800-86 Phase | SANS PICERL Phase |
|----------------|---------------------|-------------------|
| Research (target profiling) | Collection (pre-collection) | Preparation / Identification |
| Triage (live system) | Collection | Identification |
| Memory acquisition | Collection | Identification / Containment |
| Disk acquisition | Collection | Containment |
| Network capture | Collection | Identification |
| Log aggregation | Collection / Examination | Identification |
| Timeline reconstruction | Examination / Analysis | Identification |
| ATT&CK mapping | Analysis | Identification / Containment |
| IOC extraction | Analysis | Containment |
| Red flag escalation | Analysis | Identification (escalate to human) |
| Root cause | Analysis | Eradication (inform fix) |
| Report generation | Reporting | Lessons Learned |
| IOC dissemination | Reporting | Lessons Learned |

## Evidence Handling Principles

These principles apply throughout all phases:

**Integrity**: Evidence must be demonstrably unmodified. Cryptographic hashes provide that demonstration. See `rules/evidence-integrity.md`.

**Authenticity**: Evidence must be traceable to its source. Chain of custody documentation establishes authenticity.

**Completeness**: Document what was collected and what was not. An investigation that explicitly states "database transaction logs were not available because the RDS instance was terminated before response" is more credible than one that omits the gap.

**Reliability**: Methods used must be repeatable and defensible. Prefer documented, widely-accepted tools over one-off scripts for primary evidence collection. Document tool versions.

**Proportionality**: Collect what is needed. Avoid unnecessary access to data that is out of scope for the incident (e.g., HR files, attorney-client communications).

## Legal Considerations

**Before investigation begins, determine**:
- Jurisdiction (which country's laws apply — affects data handling, mandatory reporting, privacy)
- Whether law enforcement is involved or may become involved
- Whether the system owner has authorized the investigation (ensure written authorization exists)
- Whether any data collected may be subject to legal privilege
- Privacy law applicability (GDPR, HIPAA, CCPA) for any personal data that may be encountered

**During investigation**:
- Document everything in contemporaneous notes, not from memory after the fact
- Never alter, withhold, or destroy evidence that may be relevant to legal proceedings
- Consult legal counsel before sharing investigation findings outside the organization

**Evidence handling for legal proceedings**:
- The chain of custody must be unbroken from collection to presentation
- Expert witness qualification may require documenting investigator credentials and methodology
- Defense discovery may require production of all notes, tool outputs, and working files
