const SUPPORTED_LANGUAGES = {
  // Essential Core Languages (5)
  javascript: {
    name: 'JavaScript',
    type: 'interpreted',
    image: 'node:18-alpine',
    fileExtension: '.js',
    runCommand: 'node',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5
  },

  python: {
    name: 'Python',
    type: 'interpreted',
    image: 'python:3.11-alpine',
    fileExtension: '.py',
    runCommand: 'python',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5
  },

  java: {
    name: 'Java',
    type: 'compiled',
    image: 'code-exec-multi',
    fileExtension: '.java',
    compileCommand: 'javac -d /tmp /tmp/Main.java',
    runCommand: 'java -cp /tmp Main',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0,
    className: 'Main'
  },

  typescript: {
    name: 'TypeScript',
    type: 'interpreted',
    image: 'code-exec-multi',
    fileExtension: '.ts',
    runCommand: 'ts-node --transpile-only --compilerOptions \'{"module":"commonjs","moduleResolution":"node"}\'',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  sql: {
    name: 'SQL',
    type: 'interpreted',
    image: 'code-exec-multi',
    fileExtension: '.sql',
    runCommand: 'sqlite3 ":memory:" < /tmp/code.sql',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5,
    note: 'SQLite for demonstration - queries run against in-memory database'
  },

  // Specialized but Very Popular (7)
  csharp: {
    name: 'C#',
    type: 'compiled',
    image: 'code-exec-multi',
    fileExtension: '.cs',
    compileCommand: 'mcs -out:/tmp/program.exe /tmp/code.cs',
    runCommand: 'mono /tmp/program.exe',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  go: {
    name: 'Go',
    type: 'compiled',
    image: 'code-exec-multi',
    fileExtension: '.go',
    compileCommand: 'go build -o /tmp/program /tmp/code.go',
    runCommand: '/tmp/program',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  rust: {
    name: 'Rust',
    type: 'compiled',
    image: 'code-exec-multi',
    fileExtension: '.rs',
    compileCommand: 'rustc -o /tmp/program /tmp/code.rs',
    runCommand: '/tmp/program',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  swift: {
    name: 'Swift',
    type: 'compiled',
    image: 'swift:5.9-focal',
    fileExtension: '.swift',
    compileCommand: 'swiftc -o /tmp/program /tmp/code.swift',
    runCommand: '/tmp/program',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  cpp: {
    name: 'C++',
    type: 'compiled',
    image: 'gcc:latest',
    fileExtension: '.cpp',
    compileCommand: 'g++ -o /tmp/program /tmp/code.cpp -std=c++17',
    runCommand: '/tmp/program',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  c: {
    name: 'C',
    type: 'compiled',
    image: 'gcc:latest',
    fileExtension: '.c',
    compileCommand: 'gcc -o /tmp/program /tmp/code.c',
    runCommand: '/tmp/program',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  }
};

module.exports = {
  SUPPORTED_LANGUAGES,
  getSupportedLanguages: () => Object.keys(SUPPORTED_LANGUAGES),
  getLanguageConfig: (language) => SUPPORTED_LANGUAGES[language],
  isLanguageSupported: (language) => language in SUPPORTED_LANGUAGES
};