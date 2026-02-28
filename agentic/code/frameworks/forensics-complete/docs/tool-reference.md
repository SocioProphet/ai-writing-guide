# Forensics Tool Reference

Reference inventory for tools used across the forensics-complete framework. Each entry includes purpose, installation, basic usage, and guidance on when to reach for it.

---

## Evidence Collection

### dd

**Purpose**: Bit-for-bit disk or partition imaging. Produces an exact binary copy of a storage device.

**Install**: Built-in on all Linux distributions.

**Basic usage**:
```bash
# Image entire disk
dd if=/dev/sdb of=/evidence/disk-sdb.dd bs=4M status=progress

# Image specific partition
dd if=/dev/sdb1 of=/evidence/partition-sdb1.dd bs=4M status=progress

# Compute hash simultaneously (pipe to tee)
dd if=/dev/sdb bs=4M | tee /evidence/disk-sdb.dd | sha256sum > /evidence/disk-sdb.dd.sha256
```

**When to use**: Quick imaging when dc3dd is not available. Hash separately after imaging with standard dd.

---

### dc3dd

**Purpose**: Forensic-enhanced version of dd. Computes hashes during acquisition, writes hash logs, splits output, and provides better error handling.

**Install**:
```bash
apt install dc3dd        # Debian/Ubuntu
yum install dc3dd        # RHEL/CentOS (EPEL required)
```

**Basic usage**:
```bash
# Image with SHA-256 hash computed during acquisition
dc3dd if=/dev/sdb of=/evidence/disk-sdb.dd hash=sha256 hlog=/evidence/disk-sdb.hashlog

# Image and split into 4GB chunks (for FAT32 destination)
dc3dd if=/dev/sdb of=/evidence/disk-sdb.dd hash=sha256 ofsz=4G hlog=/evidence/disk-sdb.hashlog
```

**When to use**: Preferred over dd for all disk acquisitions. The simultaneous hash computation eliminates a separate hashing step.

---

### LiME (Linux Memory Extractor)

**Purpose**: Loadable kernel module for acquiring physical memory from Linux systems. Produces forensically sound memory images.

**Install**:
```bash
# Build for current kernel
apt install linux-headers-$(uname -r) build-essential
git clone https://github.com/504ensicsLabs/LiME.git
cd LiME/src && make

# Or install pre-built (distribution-specific)
apt install lime-forensics-dkms
```

**Basic usage**:
```bash
# Dump to local file
sudo insmod lime-$(uname -r).ko "path=/evidence/memory.lime format=lime"

# Dump over network (investigator side: nc -l 4444 > memory.lime)
sudo insmod lime-$(uname -r).ko "path=tcp:4444 format=lime"

# Remove module after acquisition
sudo rmmod lime
```

**When to use**: Primary tool for live Linux memory acquisition. The lime format is supported by Volatility 3. Use padded format if compatibility with other tools is needed.

---

### AVML (Acquire Volatile Memory for Linux)

**Purpose**: Memory acquisition without a kernel module. Runs as a userspace binary. Useful when kernel module installation is restricted or risky.

**Install**:
```bash
# Download pre-built binary
curl -L https://github.com/microsoft/avml/releases/latest/download/avml -o /tools/avml
chmod +x /tools/avml
```

**Basic usage**:
```bash
# Acquire memory to file
sudo /tools/avml /evidence/memory.avml

# With compression (reduces file size, supported by Volatility)
sudo /tools/avml --compress /evidence/memory.avml.compressed
```

**When to use**: When LiME is not available or when you cannot load kernel modules (some locked-down environments). Slightly less reliable than LiME for kernel version compatibility.

---

## Analysis

### Volatility 3

**Purpose**: Memory forensics framework. Analyzes memory dumps to extract processes, network connections, registry hives, encryption keys, and detect rootkit artifacts.

**Install**:
```bash
pip3 install volatility3
# Or from source
git clone https://github.com/volatilityfoundation/volatility3.git
cd volatility3 && pip3 install -r requirements.txt
```

**Basic usage**:
```bash
# List processes
vol -f memory.lime linux.pslist

# Show network connections from memory
vol -f memory.lime linux.netstat

# Check for hidden processes (rootkit detection)
vol -f memory.lime linux.psscan

# List loaded kernel modules
vol -f memory.lime linux.lsmod

# Find processes with injected memory (fileless malware)
vol -f memory.lime linux.malfind

# Extract bash command history from memory
vol -f memory.lime linux.bash
```

**When to use**: Every investigation that includes a memory dump. Memory analysis frequently reveals attacker activity that is invisible on disk.

---

### Plaso / log2timeline

**Purpose**: Timeline creation from diverse log sources. Parses hundreds of log formats and normalizes them into a unified timeline for analysis.

**Install**:
```bash
pip3 install plaso
# Or Docker
docker pull log2timeline/plaso
```

**Basic usage**:
```bash
# Create timeline from disk image
log2timeline.py --storage-file /workspace/timeline.plaso /evidence/disk-sdb.dd

# Parse specific directory
log2timeline.py --storage-file /workspace/timeline.plaso /workspace/logs/

# Filter and export to CSV for analysis
psort.py -o l2tcsv -w /workspace/timeline.csv /workspace/timeline.plaso

# Filter to specific time range
psort.py -o l2tcsv -w /workspace/timeline.csv /workspace/timeline.plaso \
  "date > '2025-11-01 00:00:00' AND date < '2025-11-15 00:00:00'"
```

**When to use**: Building the master incident timeline. Plaso handles the normalization complexity; analysts focus on the events.

---

### Timesketch

**Purpose**: Web-based collaborative timeline analysis. Multiple analysts can annotate, tag, and query a shared timeline.

**Install**:
```bash
# Docker Compose (recommended)
git clone https://github.com/google/timesketch.git
cd timesketch && docker-compose up -d
```

**Basic usage**:
```bash
# Import a Plaso timeline
tsctl import --file /workspace/timeline.plaso --sketch_id 1

# Import CSV timeline
tsctl import --file /workspace/timeline.csv --sketch_id 1
```

**When to use**: Multi-analyst investigations or long-duration investigations where annotating and bookmarking timeline events improves coordination.

---

### Autopsy

**Purpose**: Graphical disk forensics platform. File carving, keyword search, timeline view, registry analysis, and case management.

**Install**:
```bash
# Download from sleuthkit.org/autopsy/
# Ubuntu package
apt install autopsy
```

**When to use**: When a graphical interface accelerates analysis, for file carving from unallocated space, or for cases where non-technical reviewers need to navigate evidence.

---

## Network

### tcpdump

**Purpose**: Packet capture from live interfaces or reading of existing pcap files.

**Install**: Built-in on most Linux distributions.

**Basic usage**:
```bash
# Capture all traffic on eth0
tcpdump -i eth0 -w /evidence/capture.pcap

# Capture traffic to/from specific IP
tcpdump -i eth0 -w /evidence/capture.pcap host 192.168.1.100

# Read and filter existing capture
tcpdump -r /evidence/capture.pcap 'port 443 and host 10.0.0.50'
```

**When to use**: Initial packet capture during live response. Lightweight, available everywhere.

---

### Wireshark / tshark

**Purpose**: Deep packet inspection and protocol dissection. tshark is the command-line variant.

**Install**:
```bash
apt install wireshark tshark
```

**Basic usage**:
```bash
# Extract HTTP requests from pcap
tshark -r /evidence/capture.pcap -Y "http.request" -T fields \
  -e frame.time -e ip.src -e http.request.method -e http.request.uri

# Extract DNS queries
tshark -r /evidence/capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e frame.time -e ip.src -e dns.qry.name

# Follow a TCP stream
tshark -r /evidence/capture.pcap -z follow,tcp,ascii,0
```

**When to use**: Analyzing pcap files during post-capture examination. Excellent for web shell communication analysis, C2 protocol identification, and data exfiltration investigation.

---

### Zeek

**Purpose**: Network traffic analysis framework. Produces structured logs (conn.log, dns.log, http.log, ssl.log) from pcap files or live interfaces.

**Install**:
```bash
apt install zeek
```

**Basic usage**:
```bash
# Process a pcap file
zeek -r /evidence/capture.pcap

# Process with specific scripts
zeek -r /evidence/capture.pcap /usr/share/zeek/base/protocols/http/

# Outputs to current directory: conn.log, dns.log, http.log, ssl.log, etc.
```

**When to use**: When structured log output is more useful than raw packets. Zeek logs are easier to parse and correlate with other log sources than raw pcap.

---

### Suricata

**Purpose**: Network intrusion detection. Runs rule-based detection against pcap files or live traffic.

**Install**:
```bash
apt install suricata
```

**Basic usage**:
```bash
# Run rules against captured pcap
suricata -r /evidence/capture.pcap -l /workspace/suricata-output/

# Update rules
suricata-update
```

**When to use**: Quickly identify known malicious traffic patterns using existing rulesets (ET Open, Emerging Threats Pro).

---

## Threat Hunting

### Sigma

**Purpose**: Generic signature format for log-based detection. Sigma rules translate to queries for Splunk, Elastic, Chronicle, and other SIEM platforms.

**Install**:
```bash
pip3 install sigma-cli
pip3 install pySigma-backend-splunk pySigma-backend-elasticsearch
```

**Basic usage**:
```bash
# Convert Sigma rule to Splunk query
sigma convert -t splunk rules/ssh-brute-force-success.yml

# Convert to Elasticsearch query
sigma convert -t elasticsearch rules/ld-preload-rootkit.yml

# Run against local logs (with Chainsaw)
chainsaw hunt /workspace/logs/ -s sigma/linux/ --mapping mappings/sigma-mapping.yml
```

**When to use**: Translating forensic findings into detection rules. See `sigma/` directory for framework-provided rules.

---

### YARA

**Purpose**: Pattern matching for malware identification. Scan files and memory for known indicators.

**Install**:
```bash
apt install yara
pip3 install yara-python
```

**Basic usage**:
```bash
# Scan a file
yara /rules/webshell.yar /workspace/suspicious-file.php

# Scan a directory
yara -r /rules/ /workspace/web-root/

# Scan a memory dump
yara /rules/malware.yar /evidence/memory.lime
```

**When to use**: Identifying known malware families, web shells, and attacker tools in collected evidence.

---

### Velociraptor

**Purpose**: Endpoint visibility and remote forensics collection at scale. Agents deployed to endpoints; analyst queries via VQL (Velociraptor Query Language).

**Install**:
```bash
# Download server binary
curl -L https://github.com/Velocidex/velociraptor/releases/latest/download/velociraptor-linux-amd64 \
  -o /usr/local/bin/velociraptor
chmod +x /usr/local/bin/velociraptor

# Generate configuration and start server
velociraptor config generate -i
velociraptor --config server.config.yaml frontend
```

**When to use**: Multi-system investigations where manual triage of each host is impractical. Velociraptor can run forensic collection artifacts across hundreds of systems simultaneously.

---

### osquery

**Purpose**: SQL-based endpoint interrogation. Query the operating system state as if it were a relational database.

**Install**:
```bash
apt install osquery
```

**Basic usage**:
```bash
# Interactive query
osqueryi "SELECT pid, name, path, cmdline FROM processes WHERE uid = 0"

# Check for SUID binaries
osqueryi "SELECT path, permissions FROM file WHERE permissions LIKE '%s%' AND path NOT LIKE '/proc/%'"

# Network connections
osqueryi "SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets"
```

**When to use**: Live system triage when a structured query approach is preferred. Also useful for writing detection logic that translates directly to fleet-wide queries.

---

## Cloud

### Prowler

**Purpose**: AWS, Azure, and GCP security assessment. Checks hundreds of controls against cloud environment configuration.

**Install**:
```bash
pip3 install prowler
```

**Basic usage**:
```bash
# AWS assessment
prowler aws --profile incident-response-readonly

# Specific checks
prowler aws --checks iam_root_hardware_mfa_enabled cloudtrail_multi_region_enabled
```

**When to use**: Initial cloud environment assessment during an incident. Identifies misconfigurations that may have been the initial access vector.

---

### ScoutSuite

**Purpose**: Multi-cloud security auditing. Produces an HTML report of security findings.

**Install**:
```bash
pip3 install scoutsuite
```

**Basic usage**:
```bash
scout aws --profile incident-response-readonly --report-dir /workspace/scoutsuite/
```

**When to use**: When a comprehensive HTML report of the cloud security posture is needed for stakeholder review.

---

### CloudMapper

**Purpose**: AWS network visualization and analysis. Generates network diagrams and identifies exposed resources.

**Install**:
```bash
pip3 install cloudmapper
```

**When to use**: Understanding network topology in complex AWS environments during lateral movement investigation.

---

## Container

### dive

**Purpose**: Explore Docker image layers. Identifies files added, modified, or removed at each layer.

**Install**:
```bash
curl -OL https://github.com/wagoodman/dive/releases/latest/download/dive_linux_amd64.tar.gz
tar xzf dive_linux_amd64.tar.gz && mv dive /usr/local/bin/
```

**Basic usage**:
```bash
# Analyze an image
dive nginx:latest

# CI mode - check for wasted space
CI=true dive nginx:latest
```

**When to use**: Investigating suspicious container images to identify malicious additions to base images.

---

### trivy

**Purpose**: Container and filesystem vulnerability scanning. Identifies CVEs in installed packages and misconfigurations.

**Install**:
```bash
apt install trivy
```

**Basic usage**:
```bash
# Scan container image
trivy image nginx:latest

# Scan filesystem
trivy fs /workspace/extracted-container/

# Generate SARIF output
trivy image --format sarif -o /workspace/trivy-results.sarif nginx:latest
```

**When to use**: Identifying known vulnerabilities in container images involved in an incident.

---

### Falco

**Purpose**: Runtime security monitoring for containers and Linux. Detects anomalous behavior using kernel events.

**Install**:
```bash
apt install falco
```

**Basic usage**:
```bash
# Start with default rules
falco -c /etc/falco/falco.yaml

# Process existing sysdig trace
falco -e /evidence/container.scap
```

**When to use**: When a sysdig capture of container activity is available for offline analysis, or for ongoing monitoring during containment.

---

### sysdig

**Purpose**: System-level activity capture for containers and Linux. Can capture all system calls with container context.

**Install**:
```bash
apt install sysdig
```

**Basic usage**:
```bash
# Capture all activity
sysdig -w /evidence/system-activity.scap

# Capture specific container
sysdig -w /evidence/container.scap container.name=webserver

# Analyze existing capture
sysdig -r /evidence/system-activity.scap "proc.name=bash"
```

**When to use**: Deep container forensics when you need visibility into system calls and cannot rely solely on container logs.
