# ATT&CK Technique to Artifact Mapping

This guide maps MITRE ATT&CK techniques to the forensic artifacts that reveal them and the commands used to surface those artifacts. Use this during the analysis phase to connect observed evidence to attacker behavior patterns.

## How to Use This Guide

1. Identify anomalies during examination (unexpected files, unusual connections, suspicious log entries)
2. Locate the relevant technique in this guide
3. Run the listed detection commands against collected evidence
4. Document the technique in the ATT&CK Navigator layer for the incident

All commands below run against collected copies in the investigation workspace, not against live evidence sources.

---

## Initial Access

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1190 | Exploit Public-Facing Application | Web server access logs, application error logs, WAF logs, process spawn records showing web server creating shells | `grep -E "(/../|cmd=|exec\(|eval\(|base64_decode)" /workspace/web-access.log` |
| T1133 | External Remote Services | VPN authentication logs, RDP event logs (Event 4624 logon type 10), SSH auth logs with external IPs | `grep "Accepted" /workspace/auth.log \| awk '{print $9, $11}' \| sort \| uniq -c \| sort -rn` |
| T1078 | Valid Accounts | Authentication logs with unusual times, geographic anomalies, or service accounts logging in interactively | `grep "Accepted password" /workspace/auth.log \| awk '{print $9}' \| sort \| uniq -c \| sort -rn` |

### T1190 Detection Details

```bash
# Web shell indicators in access logs
grep -E "POST.*(\.php|\.asp|\.jsp)" /workspace/web-access.log | grep -E "(200|500)"

# PHP web shell function calls in URL parameters
grep -E "(system|exec|passthru|shell_exec|popen|proc_open)" /workspace/web-access.log

# Suspicious user agents
grep -E "(sqlmap|nikto|nmap|masscan|python-requests|curl/)" /workspace/web-access.log
```

---

## Execution

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1059 | Command and Scripting Interpreter | Shell history files, auditd command logs, process creation logs with command line arguments | `cat /workspace/bash_history \| grep -E "(wget\|curl\|chmod\|base64\|/tmp/)"` |
| T1053 | Scheduled Task/Job | /etc/crontab, /etc/cron.d/, /var/spool/cron/crontabs/, systemd timer units | `find /workspace/etc/cron* /workspace/var/spool/cron -type f -exec cat {} \;` |

### T1059 Detection Details

```bash
# Commands run as root from non-standard paths
grep -E "^(sudo\s+)?/(tmp|dev/shm|var/tmp|run)" /workspace/bash_history

# Base64-encoded command execution (common obfuscation)
grep -E "base64\s+-d|echo\s+[A-Za-z0-9+/]{20,}=*\s*\|" /workspace/bash_history

# Python/Perl reverse shells
grep -E "(python|perl|ruby).*socket|connect.*SOCK_STREAM" /workspace/bash_history
```

---

## Persistence

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1053 | Scheduled Task/Job | Crontab entries, systemd timer units, at job queue | `find /workspace -path "*/cron*" -type f \| xargs grep -l "wget\|curl\|/tmp"` |
| T1543 | Create or Modify System Process | New systemd service files, init.d scripts, rc.local modifications | `find /workspace/etc/systemd /workspace/etc/init.d -newer /workspace/etc/passwd -type f` |
| T1098 | Account Manipulation | passwd/shadow modifications, new UID 0 accounts, SSH authorized_keys additions | `grep ":0:" /workspace/etc/passwd \| grep -v "^root:"` |
| T1574 | Hijack Execution Flow | /etc/ld.so.preload, modified shared libraries, PATH manipulation in profiles | `cat /workspace/etc/ld.so.preload 2>/dev/null` |
| T1556 | Modify Authentication Process | PAM configuration changes, non-package PAM modules, /etc/nsswitch.conf modifications | `find /workspace/etc/pam.d -newer /workspace/etc/passwd -type f` |
| T1547 | Boot or Logon Autostart | .bashrc/.profile/.bash_profile modifications, /etc/profile.d/ additions, rc.local | `find /workspace/home -name ".bashrc" -o -name ".profile" \| xargs grep -l "wget\|curl\|/tmp"` |

### T1098 Detection Details

```bash
# Accounts with UID 0 other than root
awk -F: '$3 == 0 {print}' /workspace/etc/passwd | grep -v "^root:"

# Recently modified authorized_keys files
find /workspace/home /workspace/root -name "authorized_keys" -newer /workspace/etc/passwd

# SSH keys added after a certain date (check against known-good date)
find /workspace/home /workspace/root -name "authorized_keys" \
  -newer /workspace/etc/passwd -exec ls -la {} \; -exec cat {} \;
```

---

## Privilege Escalation

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1548 | Abuse Elevation Control Mechanism | SUID/SGID binaries not in packages, sudo log entries, polkit bypass indicators | `find /workspace -perm /6000 -type f 2>/dev/null` |
| T1068 | Exploitation for Privilege Escalation | Crash dumps, kernel dmesg errors, process spawning with elevated privileges from low-privilege parent | `grep -E "(segfault\|buffer overflow\|kernel BUG)" /workspace/var/log/kern.log` |

### T1548 Detection Details

```bash
# SUID binaries - cross-reference with package database
find /workspace -perm -4000 -type f > /tmp/suid-files.txt
# Compare against known-good baseline or check timestamps
find /workspace -perm -4000 -type f -newer /workspace/etc/passwd

# Writable SUID directories (allow planting SUID binaries)
find /workspace -perm -4000 -type d
```

---

## Defense Evasion

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1070 | Indicator Removal | Log files with gaps or truncation, wtmp/btmp entries deleted, bash history cleared or truncated | `ls -la /workspace/var/log/ \| grep "^-rw" \| awk '{print $5, $9}' \| sort -n` |
| T1036 | Masquerading | Processes with names mimicking system processes (kworker, sshd), binaries in /tmp with system names | `ls -la /proc/*/exe 2>/dev/null \| grep -E "/(tmp\|dev/shm\|var/tmp)"` |

### T1070 Detection Details

```bash
# Log files that are unusually small (may have been truncated)
find /workspace/var/log -name "*.log" -size -1k -type f

# Log files with gaps in timestamps
awk '{print $1,$2,$3}' /workspace/var/log/auth.log | \
  awk 'NR>1 && prev != $1" "$2 {print "Gap at: "$1" "$2} {prev=$1" "$2}'

# wtmp (login records) - check for truncation
last -f /workspace/var/log/wtmp | tail -5
```

---

## Credential Access

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1110 | Brute Force | High volume of authentication failures from single IP in btmp/auth.log | `lastb -F 2>/dev/null \| awk '{print $3}' \| sort \| uniq -c \| sort -rn \| head -20` |
| T1003 | OS Credential Dumping | Memory regions containing LSASS dump (Windows), /proc/pid/mem access patterns, /etc/shadow reads | `grep -r "shadow" /workspace/var/log/audit/audit.log \| grep "SYSCALL"` |

### T1110 Detection Details

```bash
# Brute force attack identification
grep "Failed password" /workspace/var/log/auth.log | \
  awk '{print $11}' | sort | uniq -c | sort -rn | head -20

# Successful login following failures (brute force success)
# See sigma/linux/ssh-brute-force-success.yml for full detection logic

# Spray attacks (many accounts, few attempts each)
grep "Failed password" /workspace/var/log/auth.log | \
  awk '{print $9}' | sort | uniq -c | sort -rn | head -20
```

---

## Discovery

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1082 | System Information Discovery | Shell history showing uname, hostname, id, whoami, cat /etc/os-release | `grep -E "^(uname\|hostname\|id\b\|whoami\|cat /etc)" /workspace/bash_history` |
| T1083 | File and Directory Discovery | Shell history showing find, ls, locate, tree with broad search paths | `grep -E "^find\s+/\s+\|^ls\s+-la\s+/" /workspace/bash_history` |

---

## Lateral Movement

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1021 | Remote Services | SSH auth logs showing connections between internal IPs, known_hosts files, RDP event logs | `grep "Accepted" /workspace/var/log/auth.log \| awk '{print $9, $11}' \| grep -E "^root\|^admin"` |

### T1021 Detection Details

```bash
# SSH lateral movement - root logins from internal IPs
grep "Accepted" /workspace/var/log/auth.log | \
  grep "root" | awk '{print $11}' | sort | uniq -c

# known_hosts files (show what systems this host connected to)
find /workspace/home /workspace/root -name "known_hosts" -exec cat {} \;

# SSH agent forwarding abuse indicators in auth log
grep "publickey.*agent" /workspace/var/log/auth.log
```

---

## Collection

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1005 | Data from Local System | Shell history showing find with -exec cp, tar commands targeting sensitive paths | `grep -E "(tar\|zip\|7z\|gzip).*(home\|etc\|var/www\|data)" /workspace/bash_history` |

---

## Exfiltration

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1048 | Exfiltration Over Alternative Protocol | DNS query logs with large volumes or unusually long hostnames (DNS tunneling), ICMP with large payloads | `tshark -r /workspace/traffic.pcap -T fields -e dns.qry.name \| awk 'length > 50' \| sort \| uniq -c \| sort -rn \| head -20` |

### T1048 Detection Details

```bash
# Large outbound transfers to external IPs in network logs
awk '$9 > 1000000 {print}' /workspace/network/zeek/conn.log | \
  awk '{print $3, $5, $9}' | sort -k3 -rn | head -20

# DNS tunneling - high-entropy hostnames
tshark -r /workspace/traffic.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name | awk 'length($0) > 50 {print length($0), $0}' | sort -rn
```

---

## Command and Control

| Technique | Name | Forensic Artifacts | Detection Commands |
|-----------|------|-------------------|-------------------|
| T1071 | Application Layer Protocol | Network connections to unusual IPs on standard ports (80/443), beaconing behavior (regular intervals), HTTP with non-browser user agents | `zeek-cut id.orig_h id.resp_h id.resp_p proto service < /workspace/conn.log \| sort \| uniq -c \| sort -rn` |
| T1573 | Encrypted Channel | TLS connections to self-signed certificates or uncommon certificate authorities, Tor or VPN endpoints | `tshark -r /workspace/traffic.pcap -Y "ssl.handshake.type == 2" -T fields -e x509af.issuer` |

### T1071 Detection Details

```bash
# Beaconing detection - connections at regular intervals to same destination
# Requires network connection log with timestamps
awk '{print $1, $3, $5}' /workspace/network/conn.log | \
  sort -k2,2 -k3,3 | \
  awk 'prev_dest == $3 {diff = $1 - prev_time; print diff, $2, $3} {prev_time=$1; prev_dest=$3}'

# Unusual process making network connections (from netstat capture)
grep -E ":(80|443|8080|8443)\s" /workspace/network/ss-connections.txt | \
  awk '{print $7}' | sort | uniq -c | sort -rn
```
