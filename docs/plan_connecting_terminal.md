# 🖥️ CodeJoin Terminal Upgrade Plan

This document describes how to replace the current simulated terminal with a **real interactive terminal** using `xterm.js` (frontend), `node-pty` (backend), and optionally `dockerode` for sandboxing. It also covers integration with the Monaco editor so files can be executed interactively.

---

## 🎯 Goals

- Replace `<pre>` + `<input>` fake terminal with **xterm.js**.
- Connect to a **real PTY** via WebSocket.
- Run commands interactively (Python REPL, C programs with `scanf`, etc.).
- Wire Monaco "Run" button to either:
  - Non-interactive execution via `/api/execute`, OR
  - Interactive execution inside terminal.
- Optionally isolate each session inside Docker.

**Definition of Done:**

- Terminal behaves like VS Code’s integrated terminal.
- Supports interactive input/output with immediate feedback.
- Runs multiple languages (Python, Node, C/C++, Java, etc.).
- CTRL-C and resize work.
- No synthetic “timeout” warnings; rely on real stderr.

---

## 0. Install Dependencies

````bash
# frontend
npm i xterm xterm-addon-fit xterm-addon-web-links

# backend
npm i ws node-pty dockerode

## Backend (WebSocket + PTY)
Create server/terminal.ts:
```ts
import { WebSocketServer } from "ws";
import pty from "node-pty";

const wss = new WebSocketServer({ port: 3080 });
console.log("PTY server listening on ws://localhost:3080");

wss.on("connection", (ws) => {
  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  const p = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env,
  });

  p.onData((d) => ws.send(d));
  ws.on("message", (msg) => p.write(msg.toString()));
  ws.on("close", () => p.kill());
});
````

Run with:
node server/terminal.ts

## 2. Frontend (xterm.js)

Create TerminalPane.tsx

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalPane() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = new Terminal({ convertEol: true, fontFamily: "monospace" });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current!);
    fit.fit();

    const ws = new WebSocket("ws://localhost:3080");
    ws.onmessage = (e) => term.write(e.data);
    term.onData((d) => ws.send(d));

    window.addEventListener("resize", () => fit.fit());
    return () => ws.close();
  }, []);

  return <div ref={ref} className="h-full w-full bg-black" />;
}
```

## 3. Optional: Docker Isolation

```ts
import Docker from "dockerode";
const docker = new Docker();

const container = await docker.createContainer({
  Image: "python:3.11-alpine",
  Tty: true,
  OpenStdin: true,
  Cmd: ["/bin/sh"],
  HostConfig: { AutoRemove: true, NetworkMode: "none" },
});
await container.start();
```

Attach stdin/stdout to WebSocket stream.
You can also pass ?image=gcc:latest in the WS URL to select a language container.

## 4. Connect Monaco

1. Non-interactive runs → keep using codeExecutionAPI.executeCode (/api/execute).
2. Interactive runs → save file, then send a command to terminal:

```ts
// Example helper
function runFile(ws: WebSocket, fileName: string, lang: string) {
  let cmd = "";
  switch (lang) {
    case "python":
      cmd = `python3 ${fileName}`;
      break;
    case "javascript":
      cmd = `node ${fileName}`;
      break;
    case "c":
      cmd = `gcc ${fileName} -o program && ./program`;
      break;
    case "cpp":
      cmd = `g++ ${fileName} -o program && ./program`;
      break;
    case "java":
      cmd = `javac ${fileName} && java ${fileName.replace(".java", "")}`;
      break;
  }
  ws.send(cmd + "\r");
}
```

## 5. Tests

- Python stdin

```py
n = input("name? ")
print("hi", n)
```

- C compile

```c
#include <stdio.h>
int main(){int x; scanf("%d",&x); printf("%d\n", x*2);}
```

- Java

```java
class Main { public static void main(String[] a){ System.out.println("OK"); } }
```

- Ctrl-C works on sleep 30.

## Run everythong

```bash
# backend code execution API
cd code-execution-backend && npm run dev   # :3001

# terminal WebSocket
node server/terminal.ts                   # :3080

# frontend
npm run dev                               # :3000
```

## 7: Monaco “Run” wiring (non-interactive vs interactive)

- Keep your existing non-interactive /api/execute path for quick runs (prints to your console panel).
- If code contains input()/scanf/cin/readline, switch default to terminal run:
  1. Send heredoc to create the file.
  2. Send the run command.
  3. If there’s a buffered executionInput, write each line with \r after the command.

## Non-Goals (for the agent)

- No auth, room, or AI features changes.
- No refactor of your Monaco custom theme/validation.
- No Supabase schema changes.

## Deliverables

server/terminal.ts (node-pty version) and server/terminal-docker.ts (dockerode version).

- Updated TerminalPanel that uses xterm.js.
- Utility to run current Monaco file in terminal (heredoc or FS API).
- README.md “How to run terminal locally”.
- A small e2e smoke doc with the manual tests above.

# 1) Start code-execution backend (your existing service)

cd code-execution-backend && npm run dev # :3001

# 2) Start terminal WS server (choose one)

npm run term:dev # node-pty host shell

# or

npm run term:docker # dockerode variant (if you add a script for it)

# 3) Start Next.js

npm run dev # :3000
