# 🐳 Docker Fundamentals for Code Execution

This guide explains Docker concepts specifically in the context of our code execution system.

## 🤔 What is Docker and Why Do We Need It?

### The Problem We're Solving

Imagine you want to run user-submitted code safely. Without Docker:

```
❌ DANGEROUS: Running directly on your server
┌─────────────────────────────────────────┐
│           Your Server                   │
│  ┌─────────────────────────────────┐   │
│  │     User Code                   │   │
│  │  import os                      │   │
│  │  os.system("rm -rf /")          │   │
│  │  # This could delete everything!│   │
│  └─────────────────────────────────┘   │
│                                         │
│  Your files, database, everything!     │
└─────────────────────────────────────────┘
```

With Docker:
```
✅ SAFE: Running in isolated containers
┌─────────────────────────────────────────┐
│           Your Server                   │
│  ┌─────────────────────────────────┐   │
│  │        Docker Container         │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │      User Code          │   │   │
│  │  │  import os              │   │   │
│  │  │  os.system("rm -rf /")  │   │   │
│  │  │  # Only affects container│   │   │
│  │  └─────────────────────────┘   │   │
│  │  Isolated Environment       │   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Your files are completely safe!       │
└─────────────────────────────────────────┘
```

### Docker = Virtual Computers

Think of Docker containers as **lightweight virtual computers**:

- **Traditional VMs**: Full operating system (heavy, slow)
- **Docker Containers**: Shared kernel, isolated processes (light, fast)

```
Traditional VM vs Docker:

Virtual Machines:                Docker Containers:
┌─────────────────┐             ┌─────────────────┐
│   App A         │             │   App A         │
├─────────────────┤             ├─────────────────┤
│   Guest OS      │             │   Container     │
├─────────────────┤             ├─────────────────┤
│   Hypervisor    │             │   Docker Engine │
├─────────────────┤             ├─────────────────┤
│   Host OS       │             │   Host OS       │
└─────────────────┘             └─────────────────┘
Size: ~GB                       Size: ~MB
Boot: ~minutes                  Boot: ~seconds
```

## 🏗️ Docker Concepts in Our System

### 1. Docker Images = Templates

An **image** is like a template or blueprint:

```
Python Image (python:3.11-alpine):
┌─────────────────────────────────┐
│  Alpine Linux (lightweight OS) │
│  + Python 3.11 interpreter     │
│  + Basic libraries              │
│  + Package manager (pip)       │
└─────────────────────────────────┘
```

In our system, we use different images for different languages:

```javascript
// src/config/languages.js
const languageImages = {
  python: 'python:3.11-alpine',     // Python + Alpine Linux
  javascript: 'node:18-alpine',     // Node.js + Alpine Linux
  java: 'openjdk:17-alpine',        // Java JDK + Alpine Linux
  cpp: 'gcc:latest',                // GCC compiler + build tools
  go: 'golang:1.21-alpine'          // Go compiler + Alpine Linux
};
```

### 2. Docker Containers = Running Instances

A **container** is a running instance of an image:

```
Image (Template)  →  Container (Running Instance)
┌─────────────┐        ┌─────────────┐
│ Python      │   →    │ Running     │
│ Image       │        │ Python      │
│             │        │ Container   │
│ (Static)    │        │ (Dynamic)   │
└─────────────┘        └─────────────┘
```

### 3. Container Lifecycle in Our System

```
1. CREATE     2. START     3. EXECUTE   4. CLEANUP
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Image   │→ │Container│→ │ Run     │→ │ Auto    │
│ + Code  │  │ Ready   │  │ Code    │  │ Delete  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
  ~100ms       ~50ms       0-30s        ~10ms
```

## 🛠️ How Our Docker Service Works

### Step 1: Container Creation

```javascript
// src/services/dockerService.js
async createSecureContainer(languageConfig, code, containerId) {
  const containerConfig = {
    // Which image to use
    Image: 'python:3.11-alpine',

    // Unique name for this execution
    name: `code-exec-${containerId}`,

    // Security settings (explained below)
    NetworkMode: 'none',
    User: 'nobody',

    // Resource limits
    HostConfig: {
      Memory: 134217728,        // 128MB RAM
      CpuQuota: 50000,         // 50% CPU
      PidsLimit: 64,           // Max 64 processes
      AutoRemove: true         // Self-destruct when done
    }
  };

  return await docker.createContainer(containerConfig);
}
```

### Step 2: Code Injection

We can't just copy files to a running container normally. Docker uses **TAR archives**:

```javascript
async copyCodeToContainer(container, fileName, code) {
  // Create a TAR archive (like a ZIP file)
  const tar = require('tar-stream');
  const pack = tar.pack();

  // Add our code file to the archive
  pack.entry({ name: 'code.py' }, 'print("Hello World!")');
  pack.finalize();

  // Upload the archive to the container's /tmp directory
  await container.putArchive(pack, { path: '/tmp' });
}
```

**What happens inside the container:**
```bash
# Container filesystem after injection:
/tmp/
├── code.py  ← Our user's code is here
└── (other temporary files)
```

### Step 3: Execution

For **interpreted languages** (Python, JavaScript):
```bash
# Container runs this command:
python /tmp/code.py
```

For **compiled languages** (C++, Java):
```bash
# Container runs this command:
g++ -o /tmp/program /tmp/code.cpp && /tmp/program

# Step by step:
# 1. g++ -o /tmp/program /tmp/code.cpp  ← Compile
# 2. /tmp/program                       ← Run if compilation succeeds
```

### Step 4: Stream Handling

Docker uses **multiplexed streams** to separate stdout and stderr:

```
Docker Stream Format:
┌──────────┬────────────┬─────────────────────┐
│ Header   │ Size       │ Content             │
│ (8 bytes)│ (4 bytes)  │ (variable)          │
├──────────┼────────────┼─────────────────────┤
│ STDOUT=1 │ 13         │ "Hello World!\n"    │
│ STDERR=2 │ 27         │ "Traceback (most..."│
└──────────┴────────────┴─────────────────────┘
```

Our parser separates these:
```javascript
parseDockerStream(buffer) {
  let stdout = '';
  let stderr = '';
  let offset = 0;

  while (offset < buffer.length) {
    const streamType = buffer[offset];     // 1=stdout, 2=stderr
    const size = buffer.readUInt32BE(offset + 4);
    const content = buffer.slice(offset + 8, offset + 8 + size).toString();

    if (streamType === 1) stdout += content;
    if (streamType === 2) stderr += content;

    offset += 8 + size;
  }

  return { stdout, stderr };
}
```

## 🔒 Security Through Isolation

### 1. Network Isolation
```javascript
NetworkMode: 'none'  // No internet access at all
```

**Effect**: Container can't:
- Download malicious code
- Connect to external servers
- Perform DDoS attacks
- Leak data to external services

### 2. User Isolation
```javascript
User: 'nobody'  // UID 65534, minimal permissions
```

**Effect**: Code runs as non-root user with no special privileges.

### 3. Filesystem Isolation

```
Container Filesystem:
┌─────────────────────────────────────┐
│ /                                   │
│ ├── bin/     ← System binaries      │
│ ├── usr/     ← User programs        │
│ ├── etc/     ← Configuration        │
│ ├── tmp/     ← Our code runs here   │ ✅ Read/Write
│ └── ...      ← Everything else      │ ❌ Read-only or restricted
└─────────────────────────────────────┘
```

### 4. Resource Isolation

```javascript
HostConfig: {
  Memory: 134217728,        // 128MB RAM limit
  CpuQuota: 50000,         // 50% of one CPU core
  CpuPeriod: 100000,       // 100ms time periods
  PidsLimit: 64,           // Max 64 processes

  // File descriptor limits
  Ulimits: [
    { Name: 'nofile', Soft: 64, Hard: 64 },
    { Name: 'nproc', Soft: 32, Hard: 32 }
  ]
}
```

## 📊 Resource Management Deep Dive

### Memory Limits

```
Memory Allocation by Language:

Shell Scripts:    64MB   ┌████░░░░░░░░░░░░░░░░┐
JavaScript:      128MB   ┌████████░░░░░░░░░░░░┐
Python:          128MB   ┌████████░░░░░░░░░░░░┐
C++:             256MB   ┌████████████████░░░░┐
Java:            512MB   ┌████████████████████┐
```

**Why these limits?**
- **Shell/JS**: Simple scripts, minimal memory
- **Python**: Interpreter overhead + libraries
- **C++**: Compilation requires extra memory
- **Java**: JVM has significant overhead

### CPU Limits

CPU limits use the **CFS (Completely Fair Scheduler)**:

```javascript
// 50% CPU = 50ms out of every 100ms period
CpuQuota: 50000,    // 50,000 microseconds
CpuPeriod: 100000   // 100,000 microseconds (100ms)
```

**Visual representation:**
```
100ms time period:
├─────────────────────────────────────────────────────────┤
│████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░│
│<-- Container can use -->│<-- Container must wait ------>│
│      50ms               │           50ms                │
```

## 🚀 Performance Optimizations

### 1. Alpine Linux Images

We use Alpine Linux instead of Ubuntu:

```
Image Size Comparison:
Ubuntu-based:  ████████████████████████████████████████ 200MB
Alpine-based:  ████████ 20MB

Startup Time:
Ubuntu:        ████████████████████ 2-5 seconds
Alpine:        ████ 0.5-1 seconds
```

### 2. Image Layering

Docker images are built in layers:

```
Python Image Layers:
┌─────────────────────────┐ ← python:3.11-alpine (final)
│ Python 3.11 + pip      │ ← Layer 3 (50MB)
├─────────────────────────┤
│ Alpine packages         │ ← Layer 2 (30MB)
├─────────────────────────┤
│ Alpine Linux base       │ ← Layer 1 (5MB)
└─────────────────────────┘

Total: 85MB, but layers are cached and shared!
```

### 3. Container Reuse Strategy

```
Container Lifecycle:
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ CREATE  │→ │ EXECUTE │→ │ DESTROY │→ │ REPEAT  │
│ ~100ms  │  │ 0-30s   │  │ ~10ms   │  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘

Why not reuse containers?
❌ Security: Previous execution could leave artifacts
❌ State: Environment variables, temp files, etc.
✅ Our approach: Fast creation/destruction is safer
```

## 🛡️ Security Deep Dive

### Linux Capabilities

Containers normally inherit many Linux capabilities. We drop them all:

```javascript
CapDrop: ['ALL']  // Remove all capabilities
```

**What capabilities does this remove?**
```
Removed Capabilities:
├── CAP_NET_ADMIN     (Network configuration)
├── CAP_SYS_ADMIN     (System administration)
├── CAP_SYS_TIME      (Change system time)
├── CAP_MKNOD         (Create device files)
├── CAP_DAC_OVERRIDE  (Bypass file permissions)
├── CAP_CHOWN         (Change file ownership)
└── ... 37 more capabilities
```

### Tmpfs Filesystems

We use temporary filesystems for writable areas:

```javascript
Tmpfs: {
  '/tmp': 'rw,noexec,nosuid,size=100m',
  '/var/tmp': 'rw,noexec,nosuid,size=10m'
}
```

**Options explained:**
- `rw`: Read-write access
- `noexec`: Cannot execute files stored here
- `nosuid`: SUID bits ignored
- `size=100m`: Maximum 100MB

### Process Limits

```javascript
PidsLimit: 64  // Maximum 64 processes
```

**Why limit processes?**
- Prevent fork bombs: `while True: os.fork()`
- Control resource usage
- Prevent DoS attacks

## 🔧 Debugging Docker Issues

### 1. Container Inspection

```bash
# List all containers (including stopped)
docker ps -a

# Inspect a specific container
docker inspect code-exec-abc123

# View container logs
docker logs code-exec-abc123
```

### 2. Image Management

```bash
# List all images
docker images

# Remove unused images
docker image prune

# Pull a specific image
docker pull python:3.11-alpine
```

### 3. Testing Container Configuration

You can test our exact container setup manually:

```bash
# Create a container with our security settings
docker run -it --rm \
  --network none \
  --user nobody \
  --memory 128m \
  --cpus 0.5 \
  --pids-limit 64 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  python:3.11-alpine \
  /bin/sh

# Inside the container, try to run code:
echo 'print("Hello from isolated Python!")' > /tmp/test.py
python /tmp/test.py
```

## 📈 Monitoring and Metrics

### Container Resource Usage

```bash
# Real-time resource usage
docker stats

# Specific container stats
docker stats code-exec-abc123
```

### Image Storage Usage

```bash
# See disk usage by images
docker system df

# Detailed breakdown
docker system df -v
```

## 🎯 Best Practices

### 1. Image Selection
- ✅ Use Alpine-based images (smaller, faster)
- ✅ Use specific version tags (python:3.11-alpine)
- ❌ Avoid "latest" tags in production
- ❌ Don't use full Ubuntu/Debian unless necessary

### 2. Security
- ✅ Always drop all capabilities
- ✅ Run as non-root user
- ✅ Disable network access
- ✅ Set resource limits
- ✅ Use read-only root filesystem when possible

### 3. Performance
- ✅ Pre-pull images during setup
- ✅ Use --rm flag for auto-cleanup
- ✅ Set appropriate resource limits
- ✅ Monitor container metrics

### 4. Debugging
- ✅ Use unique container names
- ✅ Implement comprehensive logging
- ✅ Set up health checks
- ✅ Monitor Docker daemon health

This deep dive should give you a solid understanding of how Docker enables safe, isolated code execution in our system!