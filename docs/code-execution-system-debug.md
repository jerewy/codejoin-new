# Code Execution System Debug Guide

## Overview
This document explains how the CodeJoin code execution system works and the current issues with C/C++ execution in the terminal.

> **Quick fix for "Docker connection failed" errors**
>
> If the backend logs show `Docker connection test failed {"error":"Unknown error"}` followed by `Docker connection failed: Unknown error`, the Docker daemon is offline or unreachable from the backend. Start Docker Desktop (or `dockerd` on Linux) and re-run `npm run dev` for the `code-execution-backend`. When Docker is healthy, `docker info` should succeed and the backend will build or pull the required images automatically.

## Windows Permission Denied On Docker

When the backend runs on Windows and the logs show entries similar to:

```
{"level":"error","message":"Docker permission error during execution","errorCode":"EPERM"}
```

or the message `Access is denied.`, the Node process cannot open the named pipe `//./pipe/docker_engine` that Docker Desktop exposes.

**Root cause**  
Your Windows account is missing from the local `docker-users` group, so the Docker pipe rejects the connection. This frequently occurs on new PCs where Docker Desktop was installed by an administrator account.

**Fix it**
1. Open an elevated PowerShell and run `net localgroup docker-users` to inspect membership.
2. If your username is absent, add it with `net localgroup docker-users <YourUserName> /add`.
3. Sign out (or reboot) and restart Docker Desktop so the new group membership is applied.
4. Re-run `npm run dev` in `code-execution-backend`; the startup log should report `Docker connection test successful`.

**Verify**
- `docker info` succeeds without elevation.
- Backend logs stop emitting `Docker permission error during execution` and show `Docker connection test successful`.
- Code execution requests return output instead of `Docker connection failed`.
## System Architecture

### 1. Execution Flow Components

```
User clicks "Run"
    ↓
handleRun() in ProjectWorkspace
    ↓
Smart Router (checks for interactive input)
    ↓                              ↓
Terminal Execution        Regular CodeEditor Execution
(Interactive programs)    (Non-interactive programs)
    ↓                              ↓
TerminalPanel              CodeEditor component
executeCodeInTerminal()    executeCode() function
    ↓                              ↓
Socket.IO to server        HTTP API call
    ↓                              ↓
server.js                  /api/execute endpoint
terminal:start event       codeExecutionAPI
    ↓                              ↓
DockerService              DockerService
createInteractiveContainer() executeCode()
    ↓                              ↓
Docker Container           Docker Container
(Interactive TTY)          (One-shot execution)
```

### 2. Key Components

#### A. ProjectWorkspace Component (`components/project-workspace.tsx`)
**Location**: Main workspace container
**Key Functions**:
- `handleRun()` - Entry point for code execution (lines ~930-980)
- Smart routing logic that detects interactive input needs:
```javascript
const needsInteractiveInput =
  codeContent.includes('scanf') ||
  codeContent.includes('input(') ||
  codeContent.includes('Scanner') ||
  codeContent.includes('nextInt()') ||
  codeContent.includes('cin >>') ||
  codeContent.includes('readline()');
```

#### B. TerminalPanel Component (`components/project-workspace.tsx`)
**Location**: Lines 125-722
**Key Functions**:
- `executeCodeInTerminal()` - Handles terminal-based execution (lines ~385-494)
- Creates files in terminal using echo commands
- Runs language-specific compile/run commands
- **Current Issue**: Language detection and container switching logic

#### C. CodeEditor Component (`components/code-editor.tsx`)
**Location**: Separate component file
**Key Functions**:
- `executeCode()` - Handles regular execution (lines ~622-669)
- Listens for "codeEditorExecute" window event
- Uses codeExecution API for HTTP-based execution
- **Works for**: All languages including C/C++ (when not interactive)

### 3. Backend Components

#### A. Server.js (`server.js`)
**Location**: Root server file
**Key Handlers**:
- `terminal:start` event (lines ~70-124)
- Language detection: `const languageKey = typeof language === 'string' ? language.toLowerCase() : 'javascript'`
- **Current Issue**: Always defaults to JavaScript if language not properly passed

#### B. DockerService (`code-execution-backend/src/services/dockerService.js`)
**Key Methods**:
- `createInteractiveContainer()` - For terminal sessions (lines ~186-257)
- `executeCode()` - For regular execution (lines ~48-98)
- **Container Selection**: Based on languageConfig parameter

#### C. Language Configuration (`code-execution-backend/src/config/languages.js`)
**Available Languages**:
- `javascript`: `node:18-alpine` (default)
- `python`: `python:3.11-alpine`
- `c`: `gcc:latest` ✓ (has gcc compiler)
- `cpp`: `gcc:latest` ✓ (has g++ compiler)
- `java`: `code-exec-multi`

## Current Interactive Input Issue Analysis

### Problem Statement
**CRITICAL ISSUE**: Any program with interactive input functions (scanf, input(), cin, etc.) cannot run properly, regardless of language. The system detects these functions and routes to terminal execution, but the terminal execution is completely broken.

### Affected Functions and Languages
- **C**: `scanf()`, `gets()`, `getchar()`, `fgets()`
- **C++**: `cin >>`, `getline()`
- **Python**: `input()`, `raw_input()`
- **Java**: `Scanner`, `nextInt()`, `nextLine()`
- **JavaScript**: `readline()` (Node.js)

### Current Behavior
1. ✅ **Detection Works**: Smart router correctly identifies interactive input functions
2. ❌ **Terminal Execution Fails**: All programs with interactive input fail to run
3. ✅ **Non-interactive Works**: Same programs work fine when input functions are removed
4. ❌ **All Languages Affected**: Issue is not C-specific, affects ALL languages with interactive input

### Root Cause Investigation

#### 1. Language Parameter Flow
```
handleRun() → terminalExecuteCallback() → initializeSession(detectedLanguage)
     ↓
startTerminalSession({ projectId, userId, language })
     ↓
Socket emit 'terminal:start' with language parameter
     ↓
server.js receives language parameter
     ↓
getLanguageConfig(languageKey) should return gcc:latest config
```

#### 2. Potential Issues

**Issue A: Language Parameter Not Reaching Server**
- Check: Browser Network tab → WebSocket frames
- Look for: `terminal:start` event with language parameter
- Expected: `{ projectId: "...", userId: "...", language: "c" }`

**Issue B: Language Config Not Applied**
- Check: Server logs for "Started interactive terminal container"
- Expected: Should show `"image":"gcc:latest"` for C files
- Actual: Probably showing `"image":"node:18-alpine"`

**Issue C: Container Doesn't Have Compiler**
- If wrong container: gcc/g++ commands will fail
- Error: "gcc: command not found" or similar

### 3. Debug Steps

#### Step 1: Verify Language Detection
Add logging to `executeCodeInTerminal()`:
```javascript
console.log("Detected language:", detectedLanguage);
console.log("Needs specific container:", needsSpecificContainer);
```

#### Step 2: Verify Socket Communication
In browser console, check WebSocket messages:
```javascript
// Should see terminal:start with language parameter
```

#### Step 3: Check Server Language Processing
Add logging to server.js line ~76:
```javascript
console.log("Received language:", language);
console.log("Language key:", languageKey);
console.log("Language config:", languageConfig);
```

#### Step 4: Verify Container Image
Check Docker logs or server logs for container creation:
```bash
# Should see gcc:latest for C files, not node:18-alpine
```

### 4. Quick Fixes to Try

#### Fix A: Force Language Parameter
In `components/project-workspace.tsx` line ~197:
```javascript
// Change from:
startTerminalSession({ projectId, userId, language });

// To (debug):
console.log("Starting terminal with language:", language);
startTerminalSession({ projectId, userId, language: language || detectedLanguage });
```

#### Fix B: Use Multi-Language Container
In `code-execution-backend/src/config/languages.js`, temporarily change C config:
```javascript
c: {
  name: 'C',
  type: 'compiled',
  image: 'code-exec-multi', // Instead of 'gcc:latest'
  // ... rest of config
}
```

#### Fix C: Container Pre-warming
Ensure gcc container is pre-pulled:
```bash
docker pull gcc:latest
```

## Working vs Non-Working Scenarios

### ✅ Currently Working
1. **JavaScript files** (all modes)
2. **Python files** (all modes)
3. **C/C++ files in regular execution** (non-interactive)
4. **HTML files** (preview mode)

### ❌ Currently Broken
1. **ALL files with interactive input** - Any language with input functions
   - **C**: `printf("Enter: "); scanf("%d", &x);`
   - **C++**: `cout << "Enter: "; cin >> x;`
   - **Python**: `x = input("Enter: ")`
   - **Java**: `Scanner sc = new Scanner(System.in); x = sc.nextInt();`
   - **JavaScript**: `const x = readline("Enter: ");`

## Expected Behavior vs Actual Behavior

### Expected (Any file with interactive input)
1. User clicks "Run" on file with input functions
2. System detects interactive input → routes to terminal
3. Terminal starts with appropriate language container
4. File is created in terminal environment
5. Program compiles (if needed) and runs
6. Program displays prompt and waits for user input
7. User types input in terminal → program continues
8. Output displays in real-time in terminal

### Actual (Any file with interactive input)
1. User clicks "Run" on file with input functions
2. System detects interactive input → routes to terminal ✅
3. Terminal execution function is called ✅
4. **FAILURE POINT**: Terminal execution completely fails ❌
5. No file creation, no compilation, no execution ❌
6. Error messages or silent failures ❌

### Specific Test Cases That Fail

#### Test Case 1: Simple C Program
```c
#include <stdio.h>
int main() {
    int x;
    printf("Enter a number: ");
    scanf("%d", &x);
    printf("You entered: %d\n", x);
    return 0;
}
```
**Result**: Cannot run - routed to broken terminal execution

#### Test Case 2: Simple Python Program
```python
name = input("Enter your name: ")
print(f"Hello, {name}!")
```
**Result**: Cannot run - routed to broken terminal execution

#### Test Case 3: Same Programs Without Input
```c
#include <stdio.h>
int main() {
    printf("Hello World\n");
    return 0;
}
```
**Result**: ✅ Works perfectly - uses regular execution

## Critical Debug Priority

### IMMEDIATE INVESTIGATION NEEDED

The terminal execution system is completely broken. This is not a language-specific issue but a fundamental problem with the interactive execution pathway.

### Priority Debug Steps

#### 1. Test Terminal Execution Pathway
**Location**: `components/project-workspace.tsx` → `executeCodeInTerminal()` function
**Add Logging**:
```javascript
console.log("=== TERMINAL EXECUTION DEBUG ===");
console.log("File:", file.name);
console.log("Detected language:", detectedLanguage);
console.log("Terminal ready:", isTerminalReady);
console.log("Session ID:", sessionIdRef.current);
console.log("=================================");
```

#### 2. Check WebSocket Terminal Connection
**Browser Console**: Look for WebSocket messages
- Should see `terminal:start` event
- Should see `terminal:ready` response
- Should see `terminal:input` events when commands are sent

#### 3. Verify Container Creation
**Server Logs**: Check if containers are actually being created
- Look for "Started interactive terminal container" messages
- Verify correct Docker image is being used

#### 4. Test Manual Terminal Commands
Before fixing code execution, test if basic terminal works:
- Open terminal tab
- Try simple commands: `ls`, `pwd`, `echo "hello"`
- If basic terminal doesn't work, the whole system is broken

#### 5. Emergency Fallback Solution
**Temporary Fix**: Disable smart routing for debugging
```javascript
// In handleRun(), comment out the smart routing:
// if (needsInteractiveInput && terminalExecuteCallback...) {
//   // Terminal execution
// } else {
  // Always use regular execution temporarily
  const event = new CustomEvent("codeEditorExecute");
  window.dispatchEvent(event);
// }
```

### Root Cause Theories

#### Theory 1: Terminal System Never Worked
- The entire terminal-based execution was implemented but never tested
- Container switching logic is flawed
- WebSocket communication is broken

#### Theory 2: Container Configuration Issue
- Language containers don't have necessary tools
- File creation mechanism in terminal is broken
- Command execution in containers fails

#### Theory 3: Race Condition
- Terminal session not fully ready when execution starts
- Container startup takes too long
- Session ID handling is inconsistent

### Quick Test to Confirm System Status

1. **Create a simple Python file** with just `print("hello")`
2. **Run it** - Should use regular execution and work
3. **Add `input("Enter:")` to the same file**
4. **Run it again** - Should route to terminal and fail
5. **This confirms**: The issue is specifically with terminal execution route

## Alternative Solutions

### Option 1: Hybrid Approach
- Use terminal for input/output streaming
- Use regular execution API for compilation
- Combine both for interactive experience

### Option 2: Universal Container
- Create single container with all compilers
- Eliminates language-specific container switching
- Simpler but larger container size

### Option 3: Input Simulation
- Use regular execution with simulated input
- Pre-populate input fields for interactive programs
- Less authentic but more reliable

## Files to Check During Debug

1. Browser Console → Network → WebSocket frames
2. Server logs → Language config selection
3. Docker logs → Container image verification
4. `components/project-workspace.tsx` → Language detection
5. `server.js` → Terminal session creation
6. `code-execution-backend/src/services/dockerService.js` → Container creation

---

**UPDATED: 2025-09-26**

## Summary of Current Status

❌ **CRITICAL BUG**: ALL interactive programs are broken
✅ **Non-interactive programs**: Work perfectly
🔍 **Issue**: Terminal execution pathway is completely non-functional
🎯 **Priority**: URGENT - Core functionality completely broken

### User Impact
- **Cannot run any program with input functions** (scanf, input, cin, etc.)
- **All languages affected** (C, C++, Python, Java, JavaScript)
- **Workaround**: Remove all input functions from programs to make them run

### For Next Session
1. **Start with basic terminal test** - Try manual commands first
2. **Add comprehensive logging** to trace execution flow
3. **Consider emergency fallback** - Disable smart routing temporarily
4. **Focus on WebSocket communication** - Likely root cause

Status: **CRITICAL BUG** - Interactive program execution completely broken
Priority: **URGENT** - Primary code execution feature non-functional
