'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

// Language detection based on file extension
function detectLanguage(filePath?: string): string {
  if (!filePath) return 'text'
  const ext = filePath.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    // Go
    go: 'go',
    // TypeScript/JavaScript
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    // Python
    py: 'python',
    pyw: 'python',
    // Java/Kotlin
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    // C/C++
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    // Rust
    rs: 'rust',
    // Ruby
    rb: 'ruby',
    // PHP
    php: 'php',
    // SQL
    sql: 'sql',
    // Shell
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    // YAML/JSON
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    // HTML/CSS
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    // Terraform
    tf: 'terraform',
    tfvars: 'terraform',
    // Solidity
    sol: 'solidity',
  }

  return languageMap[ext || ''] || 'text'
}

// Token types for syntax highlighting
type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'type'
  | 'operator'
  | 'variable'
  | 'punctuation'
  | 'text'

interface Token {
  type: TokenType
  value: string
}

// Color classes for different token types
const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'text-purple-400',
  string: 'text-green-400',
  number: 'text-amber-400',
  comment: 'text-slate-500 italic',
  function: 'text-blue-400',
  type: 'text-cyan-400',
  operator: 'text-pink-400',
  variable: 'text-orange-300',
  punctuation: 'text-slate-400',
  text: 'text-slate-300',
}

// Language-specific keyword sets
const KEYWORDS: Record<string, Set<string>> = {
  go: new Set([
    'package',
    'import',
    'func',
    'return',
    'if',
    'else',
    'for',
    'range',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'goto',
    'fallthrough',
    'defer',
    'go',
    'select',
    'chan',
    'var',
    'const',
    'type',
    'struct',
    'interface',
    'map',
    'make',
    'new',
    'append',
    'len',
    'cap',
    'nil',
    'true',
    'false',
    'iota',
    'panic',
    'recover',
    'print',
    'println',
  ]),
  typescript: new Set([
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'async',
    'await',
    'class',
    'extends',
    'implements',
    'interface',
    'type',
    'enum',
    'export',
    'import',
    'from',
    'as',
    'new',
    'this',
    'super',
    'static',
    'public',
    'private',
    'protected',
    'readonly',
    'abstract',
    'typeof',
    'instanceof',
    'in',
    'of',
    'null',
    'undefined',
    'true',
    'false',
    'void',
    'never',
    'any',
    'unknown',
    'string',
    'number',
    'boolean',
    'object',
    'symbol',
    'bigint',
    'keyof',
    'infer',
    'extends',
    'is',
  ]),
  javascript: new Set([
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'async',
    'await',
    'class',
    'extends',
    'export',
    'import',
    'from',
    'as',
    'new',
    'this',
    'super',
    'static',
    'typeof',
    'instanceof',
    'in',
    'of',
    'null',
    'undefined',
    'true',
    'false',
    'void',
    'delete',
    'yield',
    'with',
    'debugger',
  ]),
  python: new Set([
    'def',
    'class',
    'return',
    'if',
    'elif',
    'else',
    'for',
    'while',
    'break',
    'continue',
    'pass',
    'try',
    'except',
    'finally',
    'raise',
    'with',
    'as',
    'import',
    'from',
    'global',
    'nonlocal',
    'lambda',
    'and',
    'or',
    'not',
    'in',
    'is',
    'None',
    'True',
    'False',
    'yield',
    'assert',
    'del',
    'async',
    'await',
    'match',
    'case',
  ]),
  java: new Set([
    'public',
    'private',
    'protected',
    'static',
    'final',
    'abstract',
    'class',
    'interface',
    'extends',
    'implements',
    'new',
    'this',
    'super',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'throws',
    'void',
    'int',
    'long',
    'float',
    'double',
    'boolean',
    'char',
    'byte',
    'short',
    'null',
    'true',
    'false',
    'import',
    'package',
    'instanceof',
    'native',
    'synchronized',
    'volatile',
    'transient',
    'strictfp',
    'enum',
    'assert',
    'var',
    'record',
  ]),
  rust: new Set([
    'fn',
    'let',
    'mut',
    'const',
    'static',
    'struct',
    'enum',
    'trait',
    'impl',
    'type',
    'mod',
    'pub',
    'use',
    'crate',
    'self',
    'super',
    'return',
    'if',
    'else',
    'match',
    'loop',
    'for',
    'while',
    'break',
    'continue',
    'in',
    'as',
    'unsafe',
    'async',
    'await',
    'move',
    'where',
    'ref',
    'dyn',
    'true',
    'false',
    'Some',
    'None',
    'Ok',
    'Err',
  ]),
  sql: new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'NOT',
    'IN',
    'BETWEEN',
    'LIKE',
    'IS',
    'NULL',
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'CREATE',
    'TABLE',
    'DROP',
    'ALTER',
    'INDEX',
    'JOIN',
    'LEFT',
    'RIGHT',
    'INNER',
    'OUTER',
    'ON',
    'GROUP',
    'BY',
    'ORDER',
    'ASC',
    'DESC',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'UNION',
    'ALL',
    'DISTINCT',
    'AS',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'TRUE',
    'FALSE',
    'PRIMARY',
    'KEY',
    'FOREIGN',
    'REFERENCES',
    'CONSTRAINT',
    'DEFAULT',
    'UNIQUE',
    'CHECK',
    'EXISTS',
  ]),
  shell: new Set([
    'if',
    'then',
    'else',
    'elif',
    'fi',
    'for',
    'while',
    'do',
    'done',
    'case',
    'esac',
    'function',
    'return',
    'exit',
    'export',
    'local',
    'readonly',
    'unset',
    'shift',
    'echo',
    'printf',
    'read',
    'cd',
    'pwd',
    'source',
    'alias',
    'eval',
    'exec',
    'set',
    'true',
    'false',
    'test',
    'declare',
    'typeset',
    'trap',
    'break',
    'continue',
  ]),
  solidity: new Set([
    'pragma',
    'solidity',
    'contract',
    'interface',
    'library',
    'struct',
    'enum',
    'event',
    'modifier',
    'function',
    'constructor',
    'fallback',
    'receive',
    'mapping',
    'address',
    'bool',
    'string',
    'bytes',
    'uint',
    'int',
    'public',
    'private',
    'internal',
    'external',
    'pure',
    'view',
    'payable',
    'constant',
    'immutable',
    'override',
    'virtual',
    'abstract',
    'returns',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'break',
    'continue',
    'require',
    'revert',
    'assert',
    'emit',
    'new',
    'delete',
    'true',
    'false',
    'wei',
    'gwei',
    'ether',
    'memory',
    'storage',
    'calldata',
    'this',
    'super',
    'selfdestruct',
    'msg',
    'tx',
    'block',
  ]),
}

// Type keywords for various languages
const TYPE_KEYWORDS: Record<string, Set<string>> = {
  go: new Set([
    'string',
    'int',
    'int8',
    'int16',
    'int32',
    'int64',
    'uint',
    'uint8',
    'uint16',
    'uint32',
    'uint64',
    'float32',
    'float64',
    'complex64',
    'complex128',
    'byte',
    'rune',
    'bool',
    'error',
    'any',
    'comparable',
    'uintptr',
  ]),
  typescript: new Set([
    'string',
    'number',
    'boolean',
    'any',
    'void',
    'never',
    'unknown',
    'object',
    'symbol',
    'bigint',
  ]),
  java: new Set([
    'int',
    'long',
    'float',
    'double',
    'boolean',
    'char',
    'byte',
    'short',
    'void',
    'String',
    'Object',
    'Integer',
    'Long',
    'Double',
    'Boolean',
  ]),
  rust: new Set([
    'i8',
    'i16',
    'i32',
    'i64',
    'i128',
    'isize',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'usize',
    'f32',
    'f64',
    'bool',
    'char',
    'str',
    'String',
    'Vec',
    'Option',
    'Result',
    'Box',
    'Rc',
    'Arc',
  ]),
}

// Simple tokenizer for code highlighting
function tokenize(code: string, language: string): Token[] {
  const tokens: Token[] = []
  const keywords = KEYWORDS[language] || KEYWORDS.typescript || new Set()
  const types = TYPE_KEYWORDS[language] || new Set()

  let i = 0
  while (i < code.length) {
    const char = code[i]
    const remaining = code.slice(i)

    // Comments (// or #)
    if (remaining.startsWith('//') || (language === 'python' && char === '#')) {
      const end = code.indexOf('\n', i)
      const value = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ type: 'comment', value })
      i += value.length
      continue
    }

    // Multi-line comments (/* */)
    if (remaining.startsWith('/*')) {
      const end = code.indexOf('*/', i + 2)
      const value = end === -1 ? code.slice(i) : code.slice(i, end + 2)
      tokens.push({ type: 'comment', value })
      i += value.length
      continue
    }

    // Strings (single, double, backtick, Python triple quotes)
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      // Check for triple quotes (Python)
      if (language === 'python' && remaining.startsWith(quote.repeat(3))) {
        const endQuote = code.indexOf(quote.repeat(3), i + 3)
        const value = endQuote === -1 ? code.slice(i) : code.slice(i, endQuote + 3)
        tokens.push({ type: 'string', value })
        i += value.length
        continue
      }

      let j = i + 1
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2 // Skip escaped character
        } else if (code[j] === quote) {
          j++
          break
        } else if (code[j] === '\n' && quote !== '`') {
          break // String ends at newline for single/double quotes
        } else {
          j++
        }
      }
      tokens.push({ type: 'string', value: code.slice(i, j) })
      i = j
      continue
    }

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(code[i + 1] || ''))) {
      let j = i
      // Handle hex, octal, binary
      if (char === '0' && (code[i + 1] === 'x' || code[i + 1] === 'o' || code[i + 1] === 'b')) {
        j += 2
      }
      while (j < code.length && /[\d._a-fA-FxXoObB]/.test(code[j])) {
        j++
      }
      tokens.push({ type: 'number', value: code.slice(i, j) })
      i = j
      continue
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) {
        j++
      }
      const word = code.slice(i, j)
      const upperWord = word.toUpperCase()

      // Check if followed by ( for function detection
      const isFunction = code[j] === '('

      // SQL keywords are case-insensitive
      const isKeyword = language === 'sql' ? keywords.has(upperWord) : keywords.has(word)

      const isType = types.has(word)

      if (isKeyword) {
        tokens.push({ type: 'keyword', value: word })
      } else if (isType) {
        tokens.push({ type: 'type', value: word })
      } else if (isFunction) {
        tokens.push({ type: 'function', value: word })
      } else {
        tokens.push({ type: 'variable', value: word })
      }
      i = j
      continue
    }

    // Operators
    if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
      let j = i + 1
      // Handle multi-character operators
      while (j < code.length && /[+\-*/%=<>!&|^~?:]/.test(code[j])) {
        j++
      }
      tokens.push({ type: 'operator', value: code.slice(i, j) })
      i = j
      continue
    }

    // Punctuation
    if (/[{}()\[\];,.]/.test(char)) {
      tokens.push({ type: 'punctuation', value: char })
      i++
      continue
    }

    // Whitespace and other characters
    tokens.push({ type: 'text', value: char })
    i++
  }

  return tokens
}

interface CodeHighlighterProps {
  code: string
  filePath?: string
  className?: string
  showLineNumbers?: boolean
  startLine?: number
  highlightLine?: number
}

export function CodeHighlighter({
  code,
  filePath,
  className,
  showLineNumbers = false,
  startLine = 1,
  highlightLine,
}: CodeHighlighterProps) {
  const language = detectLanguage(filePath)

  const highlighted = useMemo(() => {
    const tokens = tokenize(code, language)
    return tokens.map((token, i) => (
      <span key={i} className={TOKEN_COLORS[token.type]}>
        {token.value}
      </span>
    ))
  }, [code, language])

  if (showLineNumbers) {
    const lines = code.split('\n')
    return (
      <pre className={cn('text-xs font-mono overflow-x-auto', className)}>
        <code className="block">
          {lines.map((line, i) => {
            const lineNumber = startLine + i
            const isHighlighted = lineNumber === highlightLine
            const lineTokens = tokenize(line, language)

            return (
              <div key={i} className={cn('flex', isHighlighted && 'bg-yellow-500/20 -mx-3 px-3')}>
                <span className="select-none w-8 text-right pr-3 text-slate-600 flex-shrink-0">
                  {lineNumber}
                </span>
                <span className="flex-1">
                  {lineTokens.map((token, j) => (
                    <span key={j} className={TOKEN_COLORS[token.type]}>
                      {token.value}
                    </span>
                  ))}
                </span>
              </div>
            )
          })}
        </code>
      </pre>
    )
  }

  return (
    <pre
      className={cn('text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all', className)}
    >
      <code>{highlighted}</code>
    </pre>
  )
}

// Export language detection for external use
export { detectLanguage }
