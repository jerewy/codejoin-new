// Test fixtures and mock data

const mockDockerImages = {
  python: 'code-execution-python:latest',
  javascript: 'code-execution-node:latest',
  java: 'code-execution-java:latest',
  bash: 'code-execution-bash:latest'
};

const mockLanguageConfigs = {
  python: {
    name: 'Python',
    image: mockDockerImages.python,
    fileExtension: '.py',
    type: 'interpreted',
    timeout: 10000,
    memoryLimit: '256m',
    cpuLimit: 0.5,
    runCommand: 'python3 /tmp/code.py'
  },
  javascript: {
    name: 'JavaScript',
    image: mockDockerImages.javascript,
    fileExtension: '.js',
    type: 'interpreted',
    timeout: 10000,
    memoryLimit: '256m',
    cpuLimit: 0.5,
    runCommand: 'node /tmp/code.js'
  },
  java: {
    name: 'Java',
    image: mockDockerImages.java,
    fileExtension: '.java',
    type: 'compiled',
    timeout: 15000,
    memoryLimit: '512m',
    cpuLimit: 1.0,
    className: 'Main',
    runCommand: 'java -cp /tmp Main',
    compileCommand: 'javac /tmp/Main.java'
  },
  bash: {
    name: 'Bash',
    image: mockDockerImages.bash,
    fileExtension: '.sh',
    type: 'interpreted',
    timeout: 5000,
    memoryLimit: '128m',
    cpuLimit: 0.25,
    runCommand: 'bash /tmp/code.sh'
  }
};

const mockTestCode = {
  simple: {
    python: 'print("Hello, World!")',
    javascript: 'console.log("Hello, World!");',
    java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, World!");
  }
}`,
    bash: 'echo "Hello, World!"'
  },
  interactive: {
    python: `name = input("Enter your name: ")
print(f"Hello, {name}!")`,
    javascript: `const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('What is your name? ', (name) => {
  console.log(\`Hello, \${name}!\`);
  rl.close();
});`,
    java: `import java.util.Scanner;
public class Main {
  public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);
    System.out.print("Enter your name: ");
    String name = scanner.nextLine();
    System.out.println("Hello, " + name + "!");
    scanner.close();
  }
}`,
    bash: 'read -p "Enter your name: " name\necho "Hello, $name!"'
  },
  multiLine: {
    python: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,
    javascript: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
    java: `public class Main {
  public static int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  public static void main(String[] args) {
    for (int i = 0; i < 10; i++) {
      System.out.println("F(" + i + ") = " + fibonacci(i));
    }
  }
}`,
    bash: `fibonacci() {
  if [ $1 -le 1 ]; then
    echo $1
  else
    echo $((fibonacci $(($1 - 1)) + fibonacci $(($1 - 2))))
  fi
}

for i in {0..9}; do
  echo "F($i) = $(fibonacci $i)"
done`
  },
  error: {
    python: 'print(undefined_variable)',
    javascript: 'console.log(undefinedVariable);',
    java: `public class Main {
  public static void main(String[] args) {
    System.out.println(undefinedVariable);
  }
}`,
    bash: 'echo $undefined_variable'
  }
};

const mockSocketData = {
  validConnection: {
    projectId: 'test-project-123',
    userId: 'test-user-456',
    language: 'python',
    code: 'print("test")'
  },
  invalidConnection: {
    // Missing projectId
    userId: 'test-user-456',
    language: 'python'
  },
  resizeData: {
    sessionId: 'test-session-123',
    cols: 80,
    rows: 24
  },
  inputData: {
    sessionId: 'test-session-123',
    input: 'print("Hello")\n'
  }
};

const mockDockerResponses = {
  pingSuccess: { ok: true },
  containerInfo: {
    Id: 'container-123',
    State: {
      Running: true,
      Status: 'running',
      StartedAt: new Date().toISOString()
    },
    Config: {
      Image: 'code-execution-python:latest',
      Cmd: ['python3', '-i']
    }
  },
  containerExit: {
    StatusCode: 0
  },
  containerError: {
    StatusCode: 1
  },
  dockerInfo: {
    ServerVersion: '20.10.12',
    Containers: 5,
    Images: 10,
    MemTotal: 8589934592,
    NCPU: 4
  }
};

const mockPTYData = {
  pythonPrompt: '>>> ',
  pythonMultiline: '... ',
  bashPrompt: '$ ',
  nodePrompt: '> ',
  javaPrompt: 'jshell> ',
  ansiSequences: {
    clear: '\x1b[2J\x1b[H',
    cursorMove: '\x1b[10;20H',
    color: '\x1b[31mRed Text\x1b[0m',
    bold: '\x1b[1mBold Text\x1b[0m'
  },
  controlChars: {
    ctrlC: '\x03',
    ctrlD: '\x04',
    backspace: '\x7f',
    enter: '\r',
    tab: '\t'
  }
};

const mockErrorScenarios = {
  dockerUnavailable: {
    code: 'ECONNREFUSED',
    message: 'Docker is not running or not accessible'
  },
  dockerImageMissing: {
    code: 'DOCKER_IMAGE_MISSING',
    message: 'Docker image not found'
  },
  socketDisconnected: {
    code: 'SOCKET_DISCONNECTED',
    message: 'Socket connection lost'
  },
  sessionNotFound: {
    code: 'SESSION_NOT_FOUND',
    message: 'Terminal session not found'
  },
  invalidInput: {
    code: 'INVALID_INPUT',
    message: 'Invalid input provided'
  },
  containerTimeout: {
    code: 'CONTAINER_TIMEOUT',
    message: 'Container execution timed out'
  }
};

const performanceTestData = {
  // Test data for performance testing
  highVolumeInput: 'x'.repeat(10000),
  binaryData: Buffer.from(Array.from({length: 1000}, (_, i) => i % 256)),
  unicodeData: '🚀 ' + '测试 '.repeat(1000),
  ansiHeavyData: '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m '.repeat(500),
  controlCharHeavyData: '\x03\x04\x1b[A\x1b[B\x1b[C\x1b[D'.repeat(200)
};

module.exports = {
  mockDockerImages,
  mockLanguageConfigs,
  mockTestCode,
  mockSocketData,
  mockDockerResponses,
  mockPTYData,
  mockErrorScenarios,
  performanceTestData
};