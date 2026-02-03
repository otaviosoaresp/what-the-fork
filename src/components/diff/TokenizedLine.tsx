import { cn } from '@/lib/utils'
import { tokenizeLine, type SyntaxToken } from '@/lib/monaco-tokenizer'
import { computeWordDiff, type DiffToken } from '@/lib/diff-tokens'
import { getLanguageFromPath } from '@/lib/language-map'
import { useMemo } from 'react'

interface TokenizedLineProps {
  content: string
  filePath: string
  lineType: 'add' | 'remove' | 'context'
  pairedContent?: string
}

interface CombinedToken {
  text: string
  syntaxClass: string
  diffType: 'unchanged' | 'removed' | 'added'
}

function combineTokens(
  syntaxTokens: SyntaxToken[],
  diffTokens: DiffToken[]
): CombinedToken[] {
  const result: CombinedToken[] = []
  let syntaxIndex = 0
  let syntaxOffset = 0
  let diffIndex = 0
  let diffOffset = 0

  while (syntaxIndex < syntaxTokens.length && diffIndex < diffTokens.length) {
    const syntax = syntaxTokens[syntaxIndex]
    const diff = diffTokens[diffIndex]

    const syntaxRemaining = syntax.text.length - syntaxOffset
    const diffRemaining = diff.text.length - diffOffset

    const takeLength = Math.min(syntaxRemaining, diffRemaining)
    const text = syntax.text.substring(syntaxOffset, syntaxOffset + takeLength)

    if (text) {
      result.push({
        text,
        syntaxClass: syntax.className,
        diffType: diff.type,
      })
    }

    syntaxOffset += takeLength
    diffOffset += takeLength

    if (syntaxOffset >= syntax.text.length) {
      syntaxIndex++
      syntaxOffset = 0
    }

    if (diffOffset >= diff.text.length) {
      diffIndex++
      diffOffset = 0
    }
  }

  while (syntaxIndex < syntaxTokens.length) {
    const syntax = syntaxTokens[syntaxIndex]
    const text = syntax.text.substring(syntaxOffset)
    if (text) {
      result.push({
        text,
        syntaxClass: syntax.className,
        diffType: 'unchanged',
      })
    }
    syntaxIndex++
    syntaxOffset = 0
  }

  return result
}

export function TokenizedLine({
  content,
  filePath,
  lineType,
  pairedContent,
}: TokenizedLineProps) {
  const tokens = useMemo(() => {
    const language = getLanguageFromPath(filePath)
    const syntaxTokens = tokenizeLine(content, language)

    if (lineType === 'context' || !pairedContent) {
      return syntaxTokens.map((t) => ({
        text: t.text,
        syntaxClass: t.className,
        diffType: 'unchanged' as const,
      }))
    }

    const { removed, added } = computeWordDiff(
      lineType === 'remove' ? content : pairedContent,
      lineType === 'add' ? content : pairedContent
    )

    const diffTokens = lineType === 'remove' ? removed : added
    return combineTokens(syntaxTokens, diffTokens)
  }, [content, filePath, lineType, pairedContent])

  return (
    <span className="whitespace-pre-wrap break-all">
      {tokens.map((token, index) => (
        <span
          key={index}
          className={cn(
            token.syntaxClass,
            token.diffType === 'removed' && 'bg-[var(--color-diff-removed-word)] line-through',
            token.diffType === 'added' && 'bg-[var(--color-diff-added-word)] font-bold'
          )}
        >
          {token.text}
        </span>
      ))}
    </span>
  )
}
