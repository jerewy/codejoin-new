const SUPPORTED_LANGUAGES = {
  // Interpreted Languages
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

  ruby: {
    name: 'Ruby',
    type: 'interpreted',
    image: 'ruby:3.2-alpine',
    fileExtension: '.rb',
    runCommand: 'ruby',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5
  },

  php: {
    name: 'PHP',
    type: 'interpreted',
    image: 'php:8.2-cli-alpine',
    fileExtension: '.php',
    runCommand: 'php',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5
  },

  shell: {
    name: 'Shell',
    type: 'interpreted',
    image: 'alpine:latest',
    fileExtension: '.sh',
    runCommand: 'sh',
    timeout: 5000,
    memoryLimit: '64m',
    cpuLimit: 0.25
  },

  // Compiled Languages
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

  go: {
    name: 'Go',
    type: 'compiled',
    image: 'golang:1.21-alpine',
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
    image: 'rust:1.75-alpine',
    fileExtension: '.rs',
    compileCommand: 'rustc -o /tmp/program /tmp/code.rs',
    runCommand: '/tmp/program',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  csharp: {
    name: 'C#',
    type: 'compiled',
    image: 'mcr.microsoft.com/dotnet/sdk:8.0-alpine',
    fileExtension: '.cs',
    compileCommand: 'csc -out:/tmp/program.exe /tmp/code.cs',
    runCommand: 'mono /tmp/program.exe',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  // Special Cases
  typescript: {
    name: 'TypeScript',
    type: 'transpiled',
    image: 'node:18-alpine',
    fileExtension: '.ts',
    compileCommand: 'npx tsc /tmp/code.ts --outDir /tmp --target es2020',
    runCommand: 'node /tmp/code.js',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  kotlin: {
    name: 'Kotlin',
    type: 'compiled',
    image: 'zenika/kotlin:1.9-jdk17-alpine',
    fileExtension: '.kt',
    compileCommand: 'kotlinc /tmp/code.kt -include-runtime -d /tmp/program.jar',
    runCommand: 'java -jar /tmp/program.jar',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  scala: {
    name: 'Scala',
    type: 'compiled',
    image: 'hseeberger/scala-sbt:17.0.2_1.6.2_2.13.8',
    fileExtension: '.scala',
    compileCommand: 'scalac -d /tmp /tmp/code.scala',
    runCommand: 'scala -cp /tmp Main',
    timeout: 25000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  perl: {
    name: 'Perl',
    type: 'interpreted',
    image: 'perl:5.38-alpine',
    fileExtension: '.pl',
    runCommand: 'perl',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5
  },

  lua: {
    name: 'Lua',
    type: 'interpreted',
    image: 'alpine:latest',
    fileExtension: '.lua',
    runCommand: 'lua',
    timeout: 10000,
    memoryLimit: '128m',
    cpuLimit: 0.5,
    setupCommands: ['apk add --no-cache lua5.3']
  },

  r: {
    name: 'R',
    type: 'interpreted',
    image: 'r-base:4.3.2',
    fileExtension: '.r',
    runCommand: 'Rscript',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
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

  dart: {
    name: 'Dart',
    type: 'interpreted',
    image: 'dart:stable',
    fileExtension: '.dart',
    runCommand: 'dart',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  elixir: {
    name: 'Elixir',
    type: 'interpreted',
    image: 'elixir:1.15-alpine',
    fileExtension: '.ex',
    runCommand: 'elixir',
    timeout: 15000,
    memoryLimit: '256m',
    cpuLimit: 0.75
  },

  haskell: {
    name: 'Haskell',
    type: 'compiled',
    image: 'haskell:9.4-alpine',
    fileExtension: '.hs',
    compileCommand: 'ghc -o /tmp/program /tmp/code.hs',
    runCommand: '/tmp/program',
    timeout: 20000,
    memoryLimit: '512m',
    cpuLimit: 1.0
  },

  ocaml: {
    name: 'OCaml',
    type: 'compiled',
    image: 'ocaml/opam:alpine',
    fileExtension: '.ml',
    compileCommand: 'ocamlc -o /tmp/program /tmp/code.ml',
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