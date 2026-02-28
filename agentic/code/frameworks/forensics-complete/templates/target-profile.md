# Target System Profile

> This template defines the baseline profile for a system under investigation.
> Replace all `{{placeholder}}` values before beginning the investigation.
> This profile feeds the investigation plan, evidence collection commands, and final report.

---

## System Overview

| Field | Value |
|-------|-------|
| Hostname | `{{hostname}}` |
| Operating System | `{{os_name}} {{os_version}}` |
| Kernel Version | `{{kernel_version}}` |
| Architecture | `{{arch}}` |
| System Type | `{{system_type}}` (e.g., bare-metal, VM, container host, cloud instance) |
| Environment | `{{environment}}` (e.g., production, staging, development) |
| Physical/Cloud Location | `{{location}}` |
| Uptime at Investigation Start | `{{uptime}}` |
| System Owner | `{{system_owner}}` |
| Support Contact | `{{support_contact}}` |

---

## Users with Shell Access

List all accounts with interactive shell access (non-system accounts and accounts with shells other than `/usr/sbin/nologin` or `/bin/false`).

| Username | UID | GID | Shell | Last Login | Groups | Notes |
|----------|-----|-----|-------|------------|--------|-------|
| `{{username_1}}` | `{{uid_1}}` | `{{gid_1}}` | `{{shell_1}}` | `{{last_login_1}}` | `{{groups_1}}` | `{{notes_1}}` |
| `{{username_2}}` | `{{uid_2}}` | `{{gid_2}}` | `{{shell_2}}` | `{{last_login_2}}` | `{{groups_2}}` | `{{notes_2}}` |

**Commands used to populate:**

```bash
# Active shells
grep -v '/nologin\|/false' /etc/passwd | awk -F: '{print $1, $3, $4, $7}'

# Last login times
lastlog | grep -v 'Never logged in'

# Group memberships
for u in $(grep -v '/nologin\|/false' /etc/passwd | cut -d: -f1); do
  echo "$u: $(groups $u)"
done
```

---

## Services and Ports

List all expected services. Any service or port not in this table is an anomaly requiring investigation.

| Service Name | Port | Protocol | Bind Address | Expected | Notes |
|--------------|------|----------|-------------|----------|-------|
| `{{service_1}}` | `{{port_1}}` | `{{proto_1}}` | `{{bind_1}}` | Yes | `{{notes_1}}` |
| `{{service_2}}` | `{{port_2}}` | `{{proto_2}}` | `{{bind_2}}` | Yes | `{{notes_2}}` |

**Commands used to populate:**

```bash
# Current listening services
ss -tlnpu
netstat -tlnpu 2>/dev/null || ss -tlnpu

# Correlate PID to process name
ss -tlnpu | awk 'NR>1 {print $5, $7}'
```

---

## Security Stack

| Component | Tool/Version | Config Location | Status |
|-----------|-------------|-----------------|--------|
| Firewall | `{{firewall}}` (e.g., iptables, nftables, ufw) | `{{firewall_config}}` | `{{firewall_status}}` |
| IDS/IPS | `{{ids_tool}}` (e.g., Fail2ban, Suricata, OSSEC) | `{{ids_config}}` | `{{ids_status}}` |
| Log Aggregation | `{{log_tool}}` (e.g., rsyslog, journald, Filebeat) | `{{log_config}}` | `{{log_status}}` |
| Audit Framework | `{{audit_tool}}` (e.g., auditd, sysdig) | `{{audit_config}}` | `{{audit_status}}` |
| SELinux/AppArmor | `{{mac_tool}}` | `{{mac_mode}}` | `{{mac_status}}` |
| Antivirus/EDR | `{{av_tool}}` | `{{av_config}}` | `{{av_status}}` |

---

## Network Baseline

### Interfaces

| Interface | IP Address | MAC Address | VLAN | Role |
|-----------|-----------|-------------|------|------|
| `{{iface_1}}` | `{{ip_1}}` | `{{mac_1}}` | `{{vlan_1}}` | `{{role_1}}` |
| `{{iface_2}}` | `{{ip_2}}` | `{{mac_2}}` | `{{vlan_2}}` | `{{role_2}}` |

### Routing

```
{{routing_table}}
```

### DNS Configuration

| Field | Value |
|-------|-------|
| Nameservers | `{{nameservers}}` |
| Search Domains | `{{search_domains}}` |
| Config File | `{{dns_config_file}}` |

### Expected Outbound Connections

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| `{{dest_1}}` | `{{port_1}}` | `{{proto_1}}` | `{{purpose_1}}` |
| `{{dest_2}}` | `{{port_2}}` | `{{proto_2}}` | `{{purpose_2}}` |

---

## Docker / Container Environment

> Remove this section if containers are not present on the target system.

| Field | Value |
|-------|-------|
| Docker Version | `{{docker_version}}` |
| Compose Version | `{{compose_version}}` |
| Total Running Containers | `{{container_count}}` |
| Docker Socket Path | `{{docker_socket}}` |
| Rootless Mode | `{{rootless}}` |

### Running Containers (Baseline)

| Container Name | Image | Ports | Volumes | Privileged |
|---------------|-------|-------|---------|-----------|
| `{{container_1}}` | `{{image_1}}` | `{{ports_1}}` | `{{volumes_1}}` | `{{priv_1}}` |
| `{{container_2}}` | `{{image_2}}` | `{{ports_2}}` | `{{volumes_2}}` | `{{priv_2}}` |

---

## Known Concerns

Pre-identified issues, technical debt, or anomalies documented before the investigation began.

| ID | Description | Severity | Date Noted | Status |
|----|-------------|----------|------------|--------|
| KC-001 | `{{concern_1}}` | `{{severity_1}}` | `{{date_1}}` | `{{status_1}}` |
| KC-002 | `{{concern_2}}` | `{{severity_2}}` | `{{date_2}}` | `{{status_2}}` |

---

## Investigation Scope Configuration

```yaml
investigation_scope:
  # Case identifier - must match investigation plan
  case_id: "{{case_id}}"

  # Target system hostname
  target: "{{hostname}}"

  # Log retention window to analyze (days)
  log_lookback_days: {{log_lookback_days}}

  # Filesystem timeline window (days before incident)
  timeline_window_days: {{timeline_window_days}}

  # Minimum file size to include in large-file scan (MB)
  large_file_threshold_mb: {{large_file_threshold_mb}}

  # SUID/SGID scan: include known-good binaries in output?
  suid_scan_include_known_good: {{suid_scan_include_known_good}}

  # Cron scan: include system crontabs?
  cron_scan_system: {{cron_scan_system}}

  # Network: alert threshold for connection count per remote IP
  connection_count_alert_threshold: {{connection_count_alert_threshold}}

  # Authentication: failed login threshold before flagging
  failed_login_threshold: {{failed_login_threshold}}

  # Process: flag processes with no associated binary on disk
  flag_memfd_processes: {{flag_memfd_processes}}

  # Docker: scan container filesystems
  docker_filesystem_scan: {{docker_filesystem_scan}}

  # Paths excluded from filesystem scans
  excluded_paths:
    - /proc
    - /sys
    - /dev
    {{excluded_paths_additional}}

  # Log files to parse (in addition to defaults)
  additional_log_files:
    {{additional_log_files}}
```
