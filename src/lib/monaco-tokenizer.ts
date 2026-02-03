import { loader, type Monaco } from '@monaco-editor/react'
import * as monacoEditor from 'monaco-editor'
import { useState, useEffect } from 'react'

loader.config({ monaco: monacoEditor })

export interface SyntaxToken {
  text: string
  className: string
}

const tokenTypeToClass: Record<string, string> = {
  keyword: 'text-purple-400',
  'keyword.control': 'text-purple-400',
  'keyword.operator': 'text-purple-400',
  'keyword.operator.new': 'text-purple-400',
  string: 'text-amber-300',
  'string.quoted': 'text-amber-300',
  number: 'text-teal-300',
  comment: 'text-slate-500 italic',
  'comment.line': 'text-slate-500 italic',
  'comment.block': 'text-slate-500 italic',
  type: 'text-cyan-400',
  'type.identifier': 'text-cyan-400',
  identifier: 'text-foreground',
  'identifier.type': 'text-cyan-400',
  function: 'text-blue-400',
  variable: 'text-foreground',
  operator: 'text-slate-300',
  delimiter: 'text-slate-400',
  'delimiter.bracket': 'text-slate-400',
  'delimiter.parenthesis': 'text-slate-400',
}

function getClassForTokenType(tokenType: string): string {
  if (tokenTypeToClass[tokenType]) {
    return tokenTypeToClass[tokenType]
  }

  const parts = tokenType.split('.')
  for (let i = parts.length; i > 0; i--) {
    const partial = parts.slice(0, i).join('.')
    if (tokenTypeToClass[partial]) {
      return tokenTypeToClass[partial]
    }
  }

  return 'text-foreground'
}

let monacoInstance: Monaco | null = null
let initPromise: Promise<Monaco> | null = null
const listeners: Set<() => void> = new Set()

async function loadMonaco(): Promise<Monaco> {
  if (monacoInstance) {
    return monacoInstance
  }

  if (!initPromise) {
    initPromise = loader.init().then((monaco) => {
      monacoInstance = monaco
      listeners.forEach((listener) => listener())
      return monaco
    })
  }

  return initPromise
}

export function useMonacoReady(): boolean {
  const [ready, setReady] = useState(monacoInstance !== null)

  useEffect(() => {
    if (monacoInstance) {
      setReady(true)
      return
    }

    const listener = () => setReady(true)
    listeners.add(listener)
    loadMonaco()

    return () => {
      listeners.delete(listener)
    }
  }, [])

  return ready
}

export function tokenizeLine(content: string, languageId: string): SyntaxToken[] {
  if (!monacoInstance) {
    loadMonaco()
    return [{ text: content, className: 'text-foreground' }]
  }

  try {
    const tokens = monacoInstance.editor.tokenize(content, languageId)

    if (!tokens.length || !tokens[0].length) {
      return [{ text: content, className: 'text-foreground' }]
    }

    const result: SyntaxToken[] = []
    const lineTokens = tokens[0]

    for (let i = 0; i < lineTokens.length; i++) {
      const token = lineTokens[i]
      const nextToken = lineTokens[i + 1]
      const start = token.offset
      const end = nextToken ? nextToken.offset : content.length
      const text = content.substring(start, end)

      if (text) {
        result.push({
          text,
          className: getClassForTokenType(token.type),
        })
      }
    }

    return result.length ? result : [{ text: content, className: 'text-foreground' }]
  } catch {
    return [{ text: content, className: 'text-foreground' }]
  }
}

export async function initializeMonaco(): Promise<void> {
  await loadMonaco()
}
