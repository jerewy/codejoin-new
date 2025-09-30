const Docker = require('./code-execution-backend/node_modules/dockerode');
const docker = new Docker();

(async () => {
  const container = await docker.createContainer({
    Image: 'gcc:latest',
    name: `debug-terminal-${Date.now()}`,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    WorkingDir: '/tmp',
    Env: [
      'HOME=/tmp',
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      'PS1=debug@codejoin:$ ',
      'TERM=xterm',
      'SHELL=/bin/sh'
    ],
    Cmd: ['/bin/sh', '-l'],
    HostConfig: {
      Memory: 512 * 1024 * 1024,
      CpuQuota: Math.floor(1 * 100000),
      CpuPeriod: 100000,
      PidsLimit: 64,
      ReadonlyRootfs: false,
      Tmpfs: {
        '/tmp': 'rw,exec,nosuid,size=100m',
        '/var/tmp': 'rw,noexec,nosuid,size=10m'
      },
      SecurityOpt: ['no-new-privileges:true'],
      CapDrop: ['ALL']
    }
  });

  // ⏱ Timeout protection
  const timeout = setTimeout(async () => {
    console.error("⏰ Timeout! Cleaning up container...");
    try { await container.kill(); } catch {}
    try { await container.remove({ force: true }); } catch {}
    process.exit(1);
  }, 10000); // 10s

  try {
    await container.start();
    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      tty: true
    });

    stream.on('data', (chunk) => {
      const raw = chunk.toString();
      console.log('CHUNK RAW:', JSON.stringify(raw));
    });

    const send = (input) => new Promise((resolve, reject) => {
      stream.write(input, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    await sleep(1500);
    await send("if command -v gcc >/dev/null 2>&1; then echo '__CODEJOIN_GCC_OK__'; else echo '__CODEJOIN_GCC_MISSING__'; fi\n");
    await sleep(2000);
    await send('exit\n');
    await container.wait();
    console.log("✅ Container finished cleanly");

  } finally {
    clearTimeout(timeout); // cancel timeout if everything finished
    try { await container.remove({ force: true }); } catch {}
  }
})();
