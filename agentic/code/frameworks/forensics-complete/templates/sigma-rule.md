# Sigma Rule Template

> Use this template to create custom Sigma detection rules from IOCs and TTPs identified
> during an investigation. Each rule should cover one specific detection scenario.
> Rules generated from investigations must be reviewed and tested before deployment to production.
>
> Reference: https://github.com/SigmaHQ/sigma/wiki/Rule-Creation-Guide
> ATT&CK Techniques: https://attack.mitre.org/techniques/

---

## Rule Documentation

Before writing the rule, answer these questions to ensure clarity and testability:

**What activity does this rule detect?**
```
{{detection_description}}
```

**What is the false positive risk?**
```
{{false_positive_assessment}}
```

**What log source is required?**
```
{{log_source_description}}
```

**Has this rule been tested against real log data?**
```
{{test_status}}
```

---

## Sigma Rule

```yaml
title: {{rule_title}}
# Human-readable title describing what the rule detects.
# Be specific: "SSH Login from Known Malicious IP" not "Suspicious SSH"

id: {{rule_uuid}}
# Unique identifier in UUID format (generate with: python3 -c "import uuid; print(uuid.uuid4())")
# Once assigned, never change the ID. Create a new rule instead.

status: {{status}}
# One of: stable | test | experimental | deprecated | unsupported
# Use 'experimental' for new rules; promote to 'test' after validation; 'stable' after production use

description: |
  {{rule_description}}
  # Detailed description of what the rule detects, why it is significant,
  # and the context in which malicious activity would trigger it.
  # Reference the investigation case if this rule was derived from a specific incident.

references:
  - {{reference_url_1}}
  - {{reference_url_2}}
  # Links to relevant documentation, CVEs, blog posts, or threat intelligence reports.
  # At minimum, link to the relevant ATT&CK technique page.

author: {{author_name}}
# Name of the person or team that authored this rule.

date: {{creation_date}}
# Date the rule was created, format YYYY/MM/DD

modified: {{modified_date}}
# Date the rule was last modified, format YYYY/MM/DD

tags:
  - attack.{{tactic_name}}
  # ATT&CK tactic in lowercase with underscores, e.g.: attack.initial_access
  # Full list: https://attack.mitre.org/tactics/
  - attack.{{technique_id}}
  # ATT&CK technique ID, e.g.: attack.t1078 (Valid Accounts)
  # Sub-technique format: attack.t1078.001
  - attack.{{sub_technique_id}}
  # Include sub-technique if applicable
  - {{case_id}}
  # Optional: tag with case ID to trace rule back to investigation

logsource:
  product: {{product}}
  # The product generating the logs. Common values:
  # linux, windows, macos, aws, azure, gcp, kubernetes, nginx, apache, zeek
  category: {{category}}
  # Log category within the product. Common values:
  # process_creation, network_connection, file_event, registry_event,
  # authentication, dns, webserver, firewall
  service: {{service}}
  # Specific service or log file. Examples:
  # sshd, sudo, audit, syslog, security (Windows Event Log)
  # Leave blank if category is sufficient

detection:
  selection:
    # Define what to match. Use field: value pairs.
    # Field names depend on the log source and your SIEM normalization.
    # Examples shown below — replace with actual fields for your environment.
    {{field_1}}: {{value_1}}
    # Example: CommandLine|contains: '/bin/bash -i'
    # Example: dst_ip|cidr: '185.220.0.0/16'
    # Example: User: 'root'

    # For multiple values matching any (OR logic within a field):
    # {{field_2}}|contains:
    #   - '{{value_2a}}'
    #   - '{{value_2b}}'

    # For substring matching:
    # {{field_3}}|contains: '{{substring}}'
    # {{field_3}}|startswith: '{{prefix}}'
    # {{field_3}}|endswith: '{{suffix}}'

    # For regex matching:
    # {{field_4}}|re: '{{regex_pattern}}'

  filter_main_{{filter_name}}:
    # Define legitimate activity to exclude (reduce false positives).
    # Use specific, narrow filters — overly broad filters create detection gaps.
    {{filter_field_1}}: {{filter_value_1}}
    # Example: ParentImage|endswith: '/cron'
    # Example: User: 'deploy-bot'

  condition: selection and not filter_main_{{filter_name}}
  # Condition language:
  # 'selection' — match the selection block
  # 'not filter_main_*' — exclude items matching any filter block
  # '1 of selection*' — match any selection block starting with 'selection'
  # 'all of them' — all defined blocks must match
  # 'selection | count(field) > 5' — aggregate: more than 5 unique values

  timeframe: {{timeframe}}
  # Optional. Use for aggregate conditions only.
  # Format: 30s, 5m, 1h, 1d
  # Example: 5m (useful for brute force: count(src_ip) > 10 within 5 minutes)

falsepositives:
  - {{false_positive_1}}
  # Describe specific, realistic scenarios where legitimate activity triggers this rule.
  # Be concrete: "Automated deployment scripts running as root" not "legitimate admin activity"
  - {{false_positive_2}}

level: {{level}}
# Severity level of alerts generated by this rule. One of:
# informational — contextual data, low signal
# low — suspicious but commonly benign
# medium — suspicious with moderate confidence of malicious activity
# high — strong indicator of malicious activity
# critical — confirmed malicious activity or active compromise
```

---

## Usage Notes

### Testing the Rule

Before deploying this rule to production, verify it against:

1. **Known-good logs** — Confirm the rule does not trigger on normal system activity from your environment.
2. **Synthetic malicious activity** — Replay the original IOCs or TTPs in a test environment and confirm the rule fires.
3. **False positive scenarios** — Confirm documented false positives are handled by the filter blocks.

```bash
# Sigma CLI rule validation (requires sigma-cli installed)
sigma check {{rule_file_path}}

# Convert to target SIEM query (example: Splunk)
sigma convert -t splunk {{rule_file_path}}

# Convert to Elasticsearch/OpenSearch
sigma convert -t es-ql {{rule_file_path}}

# Convert to syslog-ng pattern
sigma convert -t syslog-ng {{rule_file_path}}
```

### Investigation Reference

| Field | Value |
|-------|-------|
| Source Case ID | `{{case_id}}` |
| IOC References | `{{ioc_references}}` |
| Finding References | `{{finding_references}}` |
| Reviewed By | `{{reviewed_by}}` |
| Approved for Production | `{{approved}}` |
| Deployed To | `{{deployed_to}}` |
| Deployment Date | `{{deployment_date}}` |

### ATT&CK Coverage Map

This rule covers the following ATT&CK matrix positions:

| Tactic | Technique | Sub-technique | Description |
|--------|-----------|--------------|-------------|
| `{{tactic_1}}` | `{{technique_id_1}}` | `{{subtechnique_1}}` | `{{coverage_description_1}}` |
| `{{tactic_2}}` | `{{technique_id_2}}` | `{{subtechnique_2}}` | `{{coverage_description_2}}` |
