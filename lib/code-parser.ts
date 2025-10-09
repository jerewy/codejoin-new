export interface CodeBlock {
  content: string
  language?: string
  type: 'block' | 'inline'
  startIndex: number
  endIndex: number
  lineStart?: number
  lineEnd?: number
}

export interface ParsedContent {
  segments: (TextSegment | CodeSegment)[]
  codeBlocks: CodeBlock[]
  inlineCodeBlocks: CodeBlock[]
}

export interface TextSegment {
  type: 'text'
  content: string
}

export interface CodeSegment {
  type: 'code'
  codeBlock: CodeBlock
}

// Language detection patterns
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  javascript: /\b(function|const|let|var|import|export|require|module|console|async|await|class|extends|=>)\b/,
  typescript: /\b(interface|type|enum|declare|as|implements|public|private|protected|readonly|namespace|abstract)\b/,
  python: /\b(def|class|import|from|if|elif|else|for|while|try|except|finally|with|lambda|yield|async|await)\b/,
  java: /\b(public|private|protected|class|interface|extends|implements|import|package|static|final|void|int|String|boolean)\b/,
  cpp: /\b(#include|using|namespace|class|public|private|int|float|double|char|bool|void|virtual|override|const)\b/,
  c: /\b(#include|stdio|h|stdlib|math|string|printf|scanf|malloc|free|int|float|double|char|void|const|static)\b/,
  csharp: /\b(using|namespace|class|public|private|protected|internal|int|string|bool|void|var|async|await|Task|List)\b/,
  php: /<\?php|\b(echo|function|class|public|private|protected|\$\w+)\b/,
  ruby: /\b(def|class|module|require|include|if|unless|case|when|begin|rescue|ensure|end|do|yield)\b/,
  go: /\b(package|import|func|type|struct|interface|if|else|for|select|go|defer|chan|make|new)\b/,
  rust: /\b(fn|let|mut|const|static|struct|enum|impl|trait|use|mod|if|else|match|loop|for|while|unsafe)\b/,
  sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|JOIN|INNER|LEFT|RIGHT|GROUP|ORDER|BY)\b/i,
  html: /<[^>]+>/,
  css: /\{[^}]*\}|\.[a-zA-Z][\w-]*|#[a-zA-Z][\w-]*/,
  json: /^\s*\{[\s\S]*\}\s*$|^\s*\[[\s\S]*\]\s*$/,
  yaml: /^[\s-]*[\w]+:/m,
  bash: /\b(bash|sh|zsh|fish|export|alias|function|if|then|else|fi|for|do|done|while|case)\b/,
  dockerfile: /^FROM|^RUN|^COPY|^ADD|^WORKDIR|^EXPOSE|^CMD|^ENTRYPOINT|^VOLUME|^ENV/m,
}

// Common file extensions for language detection
const FILE_EXTENSIONS: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.cc': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.sql': 'sql',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.ps1': 'powershell',
  '.dockerfile': 'dockerfile',
}

/**
 * Detect programming language from code content
 */
export function detectLanguage(code: string): string | undefined {
  const trimmedCode = code.trim()

  // Check for JSON/YAML patterns first
  if (/^\s*\{[\s\S]*\}\s*$|^\s*\[[\s\S]*\]\s*$/.test(trimmedCode)) {
    return 'json'
  }
  if (/^[\s-]*[\w]+:/m.test(trimmedCode)) {
    return 'yaml'
  }

  // Check for HTML
  if (/<[^>]+>/.test(trimmedCode)) {
    return 'html'
  }

  // Check for CSS
  if (/\{[^}]*\}|\.[a-zA-Z][\w-]*|#[a-zA-Z][\w-]*/.test(trimmedCode)) {
    return 'css'
  }

  // Check for Dockerfile
  if (/^(FROM|RUN|COPY|ADD|WORKDIR|EXPOSE|CMD|ENTRYPOINT|VOLUME|ENV)\s+/mi.test(trimmedCode)) {
    return 'dockerfile'
  }

  // Test against language patterns
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(trimmedCode)) {
      return language
    }
  }

  return undefined
}

/**
 * Detect language from filename
 */
export function detectLanguageFromFilename(filename: string): string | undefined {
  const ext = Object.keys(FILE_EXTENSIONS).find(ext =>
    filename.toLowerCase().endsWith(ext)
  )
  return ext ? FILE_EXTENSIONS[ext] : undefined
}

/**
 * Parse code blocks from markdown text
 */
export function parseMarkdownCodeBlocks(text: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []
  const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)\n?```/g
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1]?.toLowerCase() || detectLanguage(match[2])
    codeBlocks.push({
      content: match[2],
      language,
      type: 'block',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return codeBlocks
}

/**
 * Parse inline code from text
 */
export function parseInlineCode(text: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []
  const inlineCodeRegex = /`([^`\n]+)`/g
  let match

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    codeBlocks.push({
      content: match[1],
      type: 'inline',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return codeBlocks
}

/**
 * Auto-detect code-like patterns in plain text
 */
export function detectCodeInPlainText(text: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []

  // Patterns for detecting code-like content
  const patterns = [
    // Function definitions
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    /def\s+\w+\s*\([^)]*\)\s*:[\s\S]*?(?=\n\w|\n$|$)/g,
    /class\s+\w+[\s\S]*?(?=\n\w|\n$|$)/g,
    // Import statements
    /import\s+.*?(?=\n|$)/g,
    /require\s*\([^)]+\)(?=\n|$)/g,
    // Variable assignments with code-like patterns
    /(const|let|var)\s+\w+\s*=\s*[^;]+;/g,
    // CSS-like rules
    /\.[\w-]+\s*\{[^}]*\}/g,
    // SQL-like statements
    /(SELECT|INSERT|UPDATE|DELETE)\s+.*?(?=\n\n|\n[A-Z]|$)/gis,
  ]

  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      // Skip if this overlaps with already detected code blocks
      const overlaps = codeBlocks.some(block =>
        match.index >= block.startIndex && match.index < block.endIndex
      )

      if (!overlaps) {
        const language = detectLanguage(match[0])
        codeBlocks.push({
          content: match[0],
          language,
          type: 'block',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }
  })

  return codeBlocks
}

/**
 * Parse all code content from text
 */
export function parseCodeContent(text: string): ParsedContent {
  // Get all types of code blocks
  const markdownBlocks = parseMarkdownCodeBlocks(text)
  const inlineBlocks = parseInlineCode(text)
  const autoDetectedBlocks = detectCodeInPlainText(text)

  // Combine and deduplicate code blocks
  const allCodeBlocks = [...markdownBlocks, ...inlineBlocks, ...autoDetectedBlocks]
    .sort((a, b) => a.startIndex - b.startIndex)

  const segments: (TextSegment | CodeSegment)[] = []
  let currentIndex = 0

  allCodeBlocks.forEach(block => {
    // Add text before this code block
    if (block.startIndex > currentIndex) {
      segments.push({
        type: 'text',
        content: text.slice(currentIndex, block.startIndex)
      })
    }

    // Add the code block
    segments.push({
      type: 'code',
      codeBlock: block
    })

    currentIndex = block.endIndex
  })

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(currentIndex)
    })
  }

  return {
    segments,
    codeBlocks: allCodeBlocks.filter(block => block.type === 'block'),
    inlineCodeBlocks: allCodeBlocks.filter(block => block.type === 'inline')
  }
}

/**
 * Extract filename from code block language or content
 */
export function extractFilename(codeBlock: CodeBlock): string | undefined {
  const { content, language } = codeBlock

  // Check for filename in language specifier (e.g., ```javascript:app.js)
  const langWithFilename = language?.match(/^(\w+):(.+)$/)
  if (langWithFilename) {
    return langWithFilename[2]
  }

  // Look for filename patterns in the content
  const filenamePatterns = [
    /^\/\/\s*File:\s*(.+)$/m,
    /^#\s*File:\s*(.+)$/m,
    /^\/\*\*\s*\*\s*File:\s*(.+?)\s*\*\//m,
    /^<!--\s*File:\s*(.+?)\s*-->/m,
  ]

  for (const pattern of filenamePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  // Detect filename from shebang or language-specific patterns
  const shebangMatch = content.match(/^#!\s*(.+)$/m)
  if (shebangMatch) {
    return shebangMatch[1].split('/').pop()
  }

  return undefined
}

/**
 * Count lines in code with proper handling of different line endings
 */
export function countLines(text: string): number {
  return text.split(/\r?\n/).length
}

/**
 * Clean and normalize code content
 */
export function cleanCodeContent(code: string): string {
  return code
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/^\n+|\n+$/g, '') // Remove leading/trailing empty lines
    .replace(/\t/g, '  ') // Convert tabs to spaces (2 spaces)
    .trim()
}