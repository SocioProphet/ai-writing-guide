# Indicators of Compromise (IOC) Register

> This register tracks all indicators of compromise identified during the investigation.
> IOCs are aligned with STIX 2.1 observable types where applicable.
> Share this register with threat intelligence teams and detection engineering after the investigation closes.

---

## Investigation Reference

| Field | Value |
|-------|-------|
| Case ID | `{{case_id}}` |
| Target System | `{{hostname}}` |
| Investigation Date | `{{investigation_date}}` |
| Investigator | `{{investigator_name}}` |
| Register Version | `{{register_version}}` |
| Last Updated | `{{last_updated}}` |
| Classification | `{{classification}}` |

---

## IOC Summary

| Type | Count | High Confidence | Medium Confidence | Low Confidence |
|------|-------|----------------|-------------------|----------------|
| IP Address (ipv4-addr) | `{{count_ip}}` | `{{high_ip}}` | `{{med_ip}}` | `{{low_ip}}` |
| Domain Name | `{{count_domain}}` | `{{high_domain}}` | `{{med_domain}}` | `{{low_domain}}` |
| File Hash (SHA-256) | `{{count_file_hash}}` | `{{high_hash}}` | `{{med_hash}}` | `{{low_hash}}` |
| File Path | `{{count_path}}` | `{{high_path}}` | `{{med_path}}` | `{{low_path}}` |
| URL | `{{count_url}}` | `{{high_url}}` | `{{med_url}}` | `{{low_url}}` |
| Email Address | `{{count_email}}` | `{{high_email}}` | `{{med_email}}` | `{{low_email}}` |
| User Account | `{{count_user}}` | `{{high_user}}` | `{{med_user}}` | `{{low_user}}` |
| Process Name | `{{count_process}}` | `{{high_process}}` | `{{med_process}}` | `{{low_process}}` |
| Registry Key | `{{count_registry}}` | `{{high_registry}}` | `{{med_registry}}` | `{{low_registry}}` |
| **Total** | `{{count_total}}` | `{{high_total}}` | `{{med_total}}` | `{{low_total}}` |

---

## IOC Table

| IOC ID | Type | Value | Context | Source | First Seen | Last Seen | Confidence | ATT&CK Technique | STIX Type |
|--------|------|-------|---------|--------|-----------|----------|-----------|-----------------|-----------|
| IOC-001 | `{{type_1}}` | `{{value_1}}` | `{{context_1}}` | `{{source_1}}` | `{{first_seen_1}}` | `{{last_seen_1}}` | `{{confidence_1}}` | `{{technique_1}}` | `{{stix_1}}` |
| IOC-002 | `{{type_2}}` | `{{value_2}}` | `{{context_2}}` | `{{source_2}}` | `{{first_seen_2}}` | `{{last_seen_2}}` | `{{confidence_2}}` | `{{technique_2}}` | `{{stix_2}}` |
| IOC-003 | `{{type_3}}` | `{{value_3}}` | `{{context_3}}` | `{{source_3}}` | `{{first_seen_3}}` | `{{last_seen_3}}` | `{{confidence_3}}` | `{{technique_3}}` | `{{stix_3}}` |

### IOC Type Reference

| Type Used | STIX 2.1 SCO | Description |
|-----------|-------------|-------------|
| `ipv4-addr` | IPv4 Address | IPv4 address observed in connection, log, or artifact |
| `ipv6-addr` | IPv6 Address | IPv6 address |
| `domain-name` | Domain Name | DNS name resolved or contacted |
| `url` | URL | Full URL observed in logs or artifacts |
| `file` | File | File identified by path, name, and/or hash |
| `email-addr` | Email Address | Email address used by threat actor |
| `user-account` | User Account | User account name or UID |
| `process` | Process | Process name, PID, or command line |
| `windows-registry-key` | Windows Registry Key | Registry key path (Windows targets) |
| `network-traffic` | Network Traffic | Specific connection pattern |
| `artifact` | Artifact | Raw bytes or encoded content |

### Confidence Definitions

| Confidence | Definition |
|-----------|-----------|
| High | Directly observed in evidence; corroborated by multiple independent sources |
| Medium | Observed in evidence but context admits benign explanation; or single source |
| Low | Inferred or circumstantial; requires additional corroboration before acting |

---

## Enrichment Results

Results from threat intelligence enrichment queries. Run queries against VirusTotal, Shodan, AbuseIPDB, or internal threat intel platforms.

| IOC ID | Platform | Query Date | Result Summary | Malicious Reports | Links |
|--------|----------|-----------|----------------|------------------|-------|
| IOC-001 | `{{platform_1}}` | `{{query_date_1}}` | `{{result_1}}` | `{{reports_1}}` | `{{link_1}}` |
| IOC-002 | `{{platform_2}}` | `{{query_date_2}}` | `{{result_2}}` | `{{reports_2}}` | `{{link_2}}` |

### Enrichment Commands

```bash
# VirusTotal IP lookup (requires API key)
curl -s --request GET \
  --url "https://www.virustotal.com/api/v3/ip_addresses/{{ioc_ip}}" \
  --header "x-apikey: $VT_API_KEY" | python3 -m json.tool

# AbuseIPDB check
curl -s -G https://api.abuseipdb.com/api/v2/check \
  --data-urlencode "ipAddress={{ioc_ip}}" \
  -H "Key: $ABUSEIPDB_API_KEY" \
  -H "Accept: application/json" | python3 -m json.tool

# Shodan host lookup
curl -s "https://api.shodan.io/shodan/host/{{ioc_ip}}?key=$SHODAN_API_KEY" | python3 -m json.tool
```

---

## Detection Rules Generated

Sigma rules and other detection content generated from these IOCs. See the `sigma/` directory for full rule files.

| Rule ID | Type | Covers IOC(s) | Rule File | Status |
|---------|------|--------------|-----------|--------|
| `{{rule_id_1}}` | Sigma | `{{covered_iocs_1}}` | `{{rule_file_1}}` | `{{rule_status_1}}` |
| `{{rule_id_2}}` | Sigma | `{{covered_iocs_2}}` | `{{rule_file_2}}` | `{{rule_status_2}}` |

---

## Related IOCs from Threat Intelligence

External IOCs from threat intelligence feeds that overlap with this investigation's findings. Include to provide context on threat actor attribution and campaign scope.

| External Source | IOC Value | Type | Relevance | Report / Reference |
|----------------|-----------|------|-----------|-------------------|
| `{{ext_source_1}}` | `{{ext_ioc_1}}` | `{{ext_type_1}}` | `{{ext_relevance_1}}` | `{{ext_ref_1}}` |
| `{{ext_source_2}}` | `{{ext_ioc_2}}` | `{{ext_type_2}}` | `{{ext_relevance_2}}` | `{{ext_ref_2}}` |

### Threat Actor Attribution

```
{{threat_actor_attribution_notes}}
```

*(Record any attribution assessments here. Use confidence qualifiers: "attributed with high confidence", "possibly related to", "consistent with TTPs of". Do not overstate certainty.)*

---

## Export Formats

This register can be exported for ingestion into SIEM, EDR, or threat intel platforms:

```bash
# Export IP addresses as plain list
grep 'ipv4-addr' ioc-register.md | awk '{print $4}'

# Export all IOC values to CSV
# (Requires structured YAML version — see schemas/ioc-entry.yaml)
```

Full structured IOC data: `{{ioc_yaml_export_path}}`
