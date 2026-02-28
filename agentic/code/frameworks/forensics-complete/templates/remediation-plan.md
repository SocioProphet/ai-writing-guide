# Remediation Plan

> This plan defines the actions required to contain, eradicate, and recover from the incident,
> and to improve defenses to prevent recurrence. Actions are organized by priority and timeframe.
> Each action includes a verification procedure to confirm it has been completed successfully.

---

## Investigation Summary

| Field | Value |
|-------|-------|
| Case ID | `{{case_id}}` |
| Target System | `{{hostname}}` |
| Overall Severity | `{{overall_severity}}` |
| Investigation Date | `{{investigation_date}}` |
| Lead Investigator | `{{investigator_name}}` |
| Plan Owner | `{{plan_owner}}` |
| Plan Created | `{{plan_created_date}}` |
| Plan Version | `{{plan_version}}` |
| Classification | `{{classification}}` |

### Incident Summary

`{{incident_summary}}`

*(2-3 sentences describing what happened, what was compromised, and what the confirmed impact was.)*

### Confirmed Root Cause

`{{root_cause}}`

---

## Immediate Actions (Complete within 24 hours)

These actions address active threats and prevent ongoing damage. Complete before any other remediation work.

| ID | Priority | Action | Target | Owner | Status | Completed Date | Notes |
|----|----------|--------|--------|-------|--------|---------------|-------|
| IA-001 | P1 | `{{immediate_action_1}}` | `{{target_1}}` | `{{owner_1}}` | `{{status_1}}` | `{{completed_1}}` | `{{notes_1}}` |
| IA-002 | P1 | `{{immediate_action_2}}` | `{{target_2}}` | `{{owner_2}}` | `{{status_2}}` | `{{completed_2}}` | `{{notes_2}}` |
| IA-003 | P1 | `{{immediate_action_3}}` | `{{target_3}}` | `{{owner_3}}` | `{{status_3}}` | `{{completed_3}}` | `{{notes_3}}` |

### Standard Immediate Actions (Apply Unless Documented as Not Applicable)

- [ ] **Isolate affected system** — Remove from network or apply firewall block rules if live investigation is complete
- [ ] **Revoke compromised credentials** — Rotate passwords and SSH keys for all accounts confirmed or suspected compromised
- [ ] **Disable unauthorized accounts** — Disable or remove any accounts created by the attacker
- [ ] **Terminate active attacker sessions** — Kill any confirmed attacker processes or sessions
- [ ] **Preserve evidence** — Confirm all evidence is collected and hashed before making system changes
- [ ] **Notify stakeholders** — Inform system owner, security team, and management per incident response policy
- [ ] **Block confirmed IOCs** — Add attacker IPs, domains, and file hashes to blocklists

### Immediate Action: Credential Rotation Commands

```bash
# Force password change for compromised accounts
passwd {{compromised_user}}
chage -d 0 {{compromised_user}}  # Force change on next login

# Revoke and regenerate SSH host keys (if host keys compromised)
rm /etc/ssh/ssh_host_*
dpkg-reconfigure openssh-server  # Debian/Ubuntu
# or:
ssh-keygen -A  # Generic

# Remove attacker SSH authorized keys
# Review and clean:
cat /home/{{compromised_user}}/.ssh/authorized_keys
# Remove specific key:
sed -i '/{{attacker_key_fragment}}/d' /home/{{compromised_user}}/.ssh/authorized_keys

# Disable compromised account
usermod -L {{compromised_user}}
```

---

## Short-term Remediations (Complete within 1-7 days)

Actions to eradicate attacker artifacts and restore system integrity.

| ID | Action | Finding Reference | Owner | Due Date | Status | Verification Method |
|----|--------|------------------|-------|----------|--------|-------------------|
| ST-001 | `{{short_action_1}}` | `{{finding_ref_1}}` | `{{st_owner_1}}` | `{{st_due_1}}` | `{{st_status_1}}` | `{{st_verify_1}}` |
| ST-002 | `{{short_action_2}}` | `{{finding_ref_2}}` | `{{st_owner_2}}` | `{{st_due_2}}` | `{{st_status_2}}` | `{{st_verify_2}}` |
| ST-003 | `{{short_action_3}}` | `{{finding_ref_3}}` | `{{st_owner_3}}` | `{{st_due_3}}` | `{{st_status_3}}` | `{{st_verify_3}}` |

### Standard Short-term Actions

- [ ] **Remove persistence mechanisms** — Delete unauthorized cron jobs, systemd units, startup scripts, and SUID binaries
- [ ] **Patch exploited vulnerabilities** — Apply patches for any CVEs or misconfigurations exploited during the incident
- [ ] **Rebuild from known-good baseline** — If system integrity is in question, redeploy from clean image
- [ ] **Audit and clean authorized_keys** — Remove all unauthorized SSH public keys across all user accounts
- [ ] **Review and tighten firewall rules** — Close unnecessary ports; restrict access to confirmed-needed sources only
- [ ] **Audit installed packages** — Remove unauthorized packages installed during the incident
- [ ] **Verify log integrity** — Confirm logging is functional and logs are being forwarded to a secure, separate system
- [ ] **Scan for additional IOCs** — Run IOC-based scan across other systems in the environment

---

## Medium-term Improvements (Complete within 1-4 weeks)

Structural improvements to address underlying weaknesses that enabled the incident.

| ID | Improvement | Rationale | Owner | Due Date | Status |
|----|-------------|-----------|-------|----------|--------|
| MT-001 | `{{medium_improvement_1}}` | `{{mt_rationale_1}}` | `{{mt_owner_1}}` | `{{mt_due_1}}` | `{{mt_status_1}}` |
| MT-002 | `{{medium_improvement_2}}` | `{{mt_rationale_2}}` | `{{mt_owner_2}}` | `{{mt_due_2}}` | `{{mt_status_2}}` |
| MT-003 | `{{medium_improvement_3}}` | `{{mt_rationale_3}}` | `{{mt_owner_3}}` | `{{mt_due_3}}` | `{{mt_status_3}}` |

---

## Long-term Hardening (Complete within 1-3 months)

Strategic improvements to reduce attack surface and improve detection capability.

| ID | Initiative | Rationale | Owner | Target Date | Status |
|----|-----------|-----------|-------|-------------|--------|
| LT-001 | `{{long_initiative_1}}` | `{{lt_rationale_1}}` | `{{lt_owner_1}}` | `{{lt_date_1}}` | `{{lt_status_1}}` |
| LT-002 | `{{long_initiative_2}}` | `{{lt_rationale_2}}` | `{{lt_owner_2}}` | `{{lt_date_2}}` | `{{lt_status_2}}` |
| LT-003 | `{{long_initiative_3}}` | `{{lt_rationale_3}}` | `{{lt_owner_3}}` | `{{lt_date_3}}` | `{{lt_status_3}}` |

---

## Verification Procedures

For each completed action, document how successful completion was confirmed. Untested remediations are incomplete remediations.

| Action ID | Verification Method | Expected Result | Verified By | Verification Date | Result |
|-----------|--------------------|-----------------|-----------|--------------------|--------|
| IA-001 | `{{verify_method_ia1}}` | `{{verify_expected_ia1}}` | `{{verifier_ia1}}` | `{{verify_date_ia1}}` | `{{verify_result_ia1}}` |
| ST-001 | `{{verify_method_st1}}` | `{{verify_expected_st1}}` | `{{verifier_st1}}` | `{{verify_date_st1}}` | `{{verify_result_st1}}` |

### Verification Commands

```bash
# Confirm unauthorized cron jobs removed
for user in $(cut -d: -f1 /etc/passwd); do
  crontab -l -u $user 2>/dev/null | grep -v '^#' | grep -v '^$'
done

# Confirm unauthorized systemd services removed
systemctl list-units --type=service --state=active | grep -v '{{expected_service_pattern}}'

# Confirm SUID binaries match known-good list
find / -perm /6000 -type f 2>/dev/null \
  | grep -v '^/proc\|^/sys' | sort > /tmp/suid_post_remediation.txt
diff {{known_good_suid_list}} /tmp/suid_post_remediation.txt

# Confirm ld.so.preload is clear
[[ -s /etc/ld.so.preload ]] && echo "WARNING: ld.so.preload still populated" || echo "CLEAR"

# Confirm firewall rules are applied
iptables -L -n -v
nft list ruleset 2>/dev/null

# Verify no attacker SSH keys remain
for home in /home/* /root; do
  [[ -f "$home/.ssh/authorized_keys" ]] && echo "=== $home ===" && cat "$home/.ssh/authorized_keys"
done
```

---

## Monitoring Recommendations

Detection improvements to identify recurrence or similar attacks in the future.

| Recommendation | Alert Trigger | Platform | Priority |
|---------------|--------------|----------|---------|
| `{{monitor_1}}` | `{{trigger_1}}` | `{{platform_1}}` | `{{priority_1}}` |
| `{{monitor_2}}` | `{{trigger_2}}` | `{{platform_2}}` | `{{priority_2}}` |
| `{{monitor_3}}` | `{{trigger_3}}` | `{{platform_3}}` | `{{priority_3}}` |

### Detection Rules

Sigma rules covering the TTPs observed in this incident are documented in the IOC register and located in:
`{{sigma_rules_path}}`

---

## Lessons Learned

Complete this section after remediation is verified complete. Use findings to improve processes and defenses.

### What Was Detected Well

```
{{detection_strengths}}
```

### What Was Missed or Detected Late

```
{{detection_gaps}}
```

### Process Improvements

| Gap | Proposed Process Change | Owner | Target Date |
|-----|------------------------|-------|-------------|
| `{{process_gap_1}}` | `{{process_change_1}}` | `{{process_owner_1}}` | `{{process_date_1}}` |
| `{{process_gap_2}}` | `{{process_change_2}}` | `{{process_owner_2}}` | `{{process_date_2}}` |

### Tool / Coverage Gaps

```
{{tool_coverage_gaps}}
```

### Training Recommendations

```
{{training_recommendations}}
```
