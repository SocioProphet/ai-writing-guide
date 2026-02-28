# Target Research Guide

The research phase occurs before any active investigation or intrusive action against a target system. The goal is to build a profile of the target's externally observable characteristics using only passive, non-intrusive methods. This information establishes the baseline against which anomalies are measured and informs which collection and analysis paths are most likely to be productive.

All techniques in this guide are passive or non-destructive. No technique modifies the target, sends packets to the target (beyond normal DNS resolution from your resolver), or touches the target's file system.

## Step 1: DNS and WHOIS Reconnaissance

Start with public registration data and DNS records. This establishes the administrative context and maps the target's external DNS surface.

```bash
# WHOIS registration data
whois target.example.com
whois <target-IP>

# DNS records - all types
dig +noall +answer target.example.com ANY
dig +noall +answer target.example.com A
dig +noall +answer target.example.com AAAA
dig +noall +answer target.example.com MX
dig +noall +answer target.example.com NS
dig +noall +answer target.example.com TXT
dig +noall +answer target.example.com SPF

# Reverse DNS
dig +noall +answer -x <target-IP>

# Zone transfer attempt (passive - server decides whether to respond)
dig @ns1.target.example.com target.example.com AXFR
```

Record results to workspace:
```bash
whois target.example.com > /workspace/research/whois.txt
dig target.example.com ANY > /workspace/research/dns-records.txt
```

Build the external IP list from DNS A records. This becomes the scope boundary for network research.

## Step 2: Port and Service Discovery

Identify which ports are open and accepting connections. Use a scan rate that does not trigger rate limiting or logging on the target side. Prefer passive sources (Shodan, Censys) when available.

```bash
# Active TCP port scan (SYN scan - use carefully, will appear in target logs)
nmap -sS -p- -oA /workspace/research/nmap-tcp <target-IP>

# Service version detection on discovered open ports
nmap -sV -p 22,80,443,8080 -oA /workspace/research/nmap-services <target-IP>

# UDP scan for key services (DNS, SNMP, NTP)
nmap -sU -p 53,123,161 -oA /workspace/research/nmap-udp <target-IP>
```

For passive-only research, use Shodan or Censys data (Step 7) instead of active nmap scans.

## Step 3: OS Fingerprinting

Identify the operating system and kernel version from network behavior. This informs which vulnerability classes are relevant and which forensic tools to prepare.

```bash
# OS detection via TCP/IP stack fingerprinting
nmap -O -oA /workspace/research/nmap-os <target-IP>

# Passive fingerprinting from pcap (no packets sent to target)
p0f -r /evidence/traffic.pcap -o /workspace/research/p0f-results.txt
```

OS fingerprinting results are probabilistic. Record the confidence level reported by the tool alongside the result.

## Step 4: Service Version Identification

For each open port, identify the service name and version string. Version data narrows the CVE search space.

```bash
# Banner grabbing with netcat (one connection per service)
echo "" | nc -w3 <target-IP> 22 > /workspace/research/banner-ssh.txt
echo "HEAD / HTTP/1.0\r\n\r\n" | nc -w3 <target-IP> 80 > /workspace/research/banner-http.txt

# More detailed service probing via nmap
nmap -sV --version-intensity 9 -oA /workspace/research/nmap-versions <target-IP>

# HTTP server header
curl -sI http://<target-IP>/ > /workspace/research/http-headers.txt
curl -sI https://<target-IP>/ > /workspace/research/https-headers.txt
```

Map identified service versions to known CVEs:
```bash
# Search NVD (requires internet access)
# Example for Apache 2.4.49
curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=Apache+2.4.49" | \
  jq '.vulnerabilities[].cve.id' > /workspace/research/cves-apache.txt
```

## Step 5: SSL/TLS Certificate Analysis

Certificates reveal hostnames (Subject Alternative Names), organization details, certificate authorities, and issuance dates that are not visible in DNS alone.

```bash
# Retrieve and display certificate
openssl s_client -connect <target-IP>:443 </dev/null 2>/dev/null | \
  openssl x509 -noout -text > /workspace/research/tls-cert.txt

# Extract Subject Alternative Names (additional hostnames)
openssl s_client -connect <target-IP>:443 </dev/null 2>/dev/null | \
  openssl x509 -noout -ext subjectAltName

# Check certificate transparency logs for all certs issued for the domain
# crt.sh is a passive lookup
curl -s "https://crt.sh/?q=%.target.example.com&output=json" | \
  jq '.[].name_value' | sort -u > /workspace/research/cert-transparency-names.txt
```

Certificate transparency data frequently reveals subdomains that are not in public DNS records.

## Step 6: Cloud Provider Identification

Identify whether the target is hosted on a cloud provider and which one. This determines whether cloud-specific investigation paths apply.

```bash
# Check IP against cloud provider ranges
# AWS IP ranges
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json | \
  jq --arg ip "<target-IP>" '.prefixes[] | select(.ip_prefix | . as $prefix | "<target-IP>" | startswith($prefix | split("/")[0])) | .service,.region' 2>/dev/null

# Azure IP ranges
# Download from: https://www.microsoft.com/en-us/download/details.aspx?id=56519

# GCP IP ranges
curl -s https://www.gstatic.com/ipranges/cloud.json | \
  jq '.prefixes[] | select(.ipv4Prefix) | .ipv4Prefix,.service,.scope' 2>/dev/null

# Simpler method: reverse DNS often reveals cloud provider
host <target-IP>
# ec2-XX-XX-XX-XX.compute-1.amazonaws.com = AWS
# XX-XX-XX-XX.static.azure.com = Azure
# XX.XX.XX.XX.bc.googleusercontent.com = GCP
```

Record the cloud provider and region. This determines which API audit logs to request and which cloud-specific agents are applicable.

## Step 7: Historical Data from Shodan and Censys

Shodan and Censys scan the internet continuously. Their historical data reveals what services were exposed in the past, which is valuable when the current state has been modified after compromise.

```bash
# Shodan CLI (requires API key)
shodan host <target-IP> > /workspace/research/shodan-host.txt
shodan search "hostname:target.example.com" > /workspace/research/shodan-domain.txt

# Shodan history
shodan host <target-IP> --history > /workspace/research/shodan-history.txt

# Censys CLI (requires API key)
censys view <target-IP> > /workspace/research/censys-host.txt

# Without CLI - web interface at:
# https://www.shodan.io/host/<target-IP>
# https://search.censys.io/hosts/<target-IP>
```

Historical data is entirely passive — queries are sent to Shodan/Censys servers, not to the target.

## Step 8: Building the Target Profile

Compile all research findings into a structured target profile before beginning active investigation.

Target profile template:

```markdown
# Target Profile: [system identifier]
# Date: [ISO 8601 date]
# Investigator: [name]

## Identity
- Hostname(s): [list from DNS, SAN, reverse DNS]
- External IP(s): [list]
- WHOIS registrant: [organization, registrar, registration date]
- ASN: [number and name]

## Infrastructure
- Cloud provider: [AWS / Azure / GCP / On-premise / Unknown]
- Region/datacenter: [if known]
- Hosting type: [dedicated / VPS / container / managed service]

## Services
| Port | Protocol | Service | Version | First Seen |
|------|----------|---------|---------|------------|
| 22   | TCP      | SSH     | OpenSSH 8.9 | [date from Shodan] |
| 443  | TCP      | HTTPS   | nginx 1.24.0 | [date] |

## TLS/Certificates
- Certificate CN: [value]
- Subject Alternative Names: [list]
- Issuer: [CA name]
- Valid from: [date]
- Valid to: [date]

## Historical Observations
- First seen by Shodan: [date]
- Services changed: [describe any changes in historical data]
- Notable past exposures: [e.g., "Redis port 6379 was open 2024-08 through 2024-11"]

## Relevant CVEs
- [CVE-YYYY-XXXXX]: [brief description, CVSS score]

## Investigation Approach
- Primary collection targets: [based on identified services]
- Cloud-specific agents: [applicable/not applicable]
- Container forensics: [applicable/not applicable]
```

The target profile is the foundation document for the investigation. It is referenced throughout the case record and included in the final report appendix.

## Research Phase Checklist

Before proceeding to active investigation:

- [ ] WHOIS and DNS records collected and recorded
- [ ] All open ports identified
- [ ] OS and service versions identified
- [ ] TLS certificates examined, SANs extracted
- [ ] Cloud provider identified or ruled out
- [ ] Shodan/Censys historical data reviewed
- [ ] Target profile document completed
- [ ] Investigation approach determined based on profile
- [ ] Relevant CVEs cataloged for context
