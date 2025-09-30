const Docker = require('./code-execution-backend/node_modules/dockerode');
const docker = new Docker();

async function main() {
  const container = await docker.createContainer({
    Image: 'gcc:latest',
    name: `debug-interactive-${Date.now()}`,
    AttachStdout: true,
    AttachStderr: true,
    AttachStdin: true,
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    WorkingDir: '/tmp',
    User: 'nobody',
    Env: [
      'HOME=/tmp',
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      'PS1=debug@codejoin:$ ',
      'TERM=xterm',
      'SHELL=/bin/sh'
    ],
    Cmd: ['/bin/sh', '-l'],
    HostConfig: {
      NetworkMode: 'none',
      Memory: 512 * 1024 * 1024,
      CpuQuota: Math.floor(1.0 * 100000),
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

  const cleanup = async () => {
    try {
      await container.remove({ force: true });
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  };

  const timeout = setTimeout(async () => {
    console.error('Timeout reached, forcing cleanup...');
    try { await container.kill(); } catch (err) {
      console.error('Kill error:', err.message);
    }
    await cleanup();
    process.exit(1);
  }, 20000);

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
      const text = chunk.toString('utf8');
      process.stdout.write(`[DATA] ${JSON.stringify(text)}\n`);
    });

    stream.on('error', (err) => {
      console.error('[STREAM ERROR]', err.message);
    });

    stream.resume();

    const send = (input) => new Promise((resolve, reject) => {
      stream.write(input, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendCommand = async (cmd, wait = 500) => {
      console.log(`[SEND] ${cmd}`);
      await send(`${cmd}\r`);
      await sleep(wait);
    };

    const code = `#include <stdio.h>\nint main() {\n  int value;\n  printf("Enter value: ");\n  fflush(stdout);\n  if (scanf("%d", &value) != 1) {\n    printf("Read failure\\n");\n    return 1;\n  }\n  printf("You typed %d\\n", value);\n  return 0;\n}\n`;
    const code64 = Buffer.from(code, 'utf-8').toString('base64');

    await sendCommand(`echo '${code64}' | base64 -d > /tmp/test.c`, 800);
    await sendCommand('ls -l /tmp', 800);
    await sendCommand('gcc /tmp/test.c -O2 -o /tmp/test', 1500);
    await sendCommand('ls -l /tmp', 800);
    await sendCommand('/tmp/test', 800);

    console.log('[INFO] Program should be waiting for input now. Sending 42...');
    await sleep(1500);
    await send('42\r');
    await sleep(1500);

    console.log('[INFO] Sending second input 7...');
    await send('7\r');
    await sleep(1500);

    console.log('[INFO] Stopping container');
    await container.stop({ t: 0 });
    clearTimeout(timeout);
    await cleanup();
    console.log('[INFO] Done');
  } catch (err) {
    console.error('Runtime error:', err);
    clearTimeout(timeout);
    await cleanup();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
