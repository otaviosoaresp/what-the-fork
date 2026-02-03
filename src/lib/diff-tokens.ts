export interface DiffToken {
  text: string
  type: 'unchanged' | 'removed' | 'added'
}

function tokenizeWords(text: string): string[] {
  const tokens: string[] = []
  let current = ''

  for (const char of text) {
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else if (/[^\w]/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function lcsLength(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

function backtrackLCS(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number
): string[] {
  if (i === 0 || j === 0) return []

  if (a[i - 1] === b[j - 1]) {
    return [...backtrackLCS(dp, a, b, i - 1, j - 1), a[i - 1]]
  }

  if (dp[i - 1][j] > dp[i][j - 1]) {
    return backtrackLCS(dp, a, b, i - 1, j)
  }

  return backtrackLCS(dp, a, b, i, j - 1)
}

export function computeWordDiff(
  oldText: string,
  newText: string
): { removed: DiffToken[]; added: DiffToken[] } {
  const oldTokens = tokenizeWords(oldText)
  const newTokens = tokenizeWords(newText)

  const dp = lcsLength(oldTokens, newTokens)
  const lcs = new Set(backtrackLCS(dp, oldTokens, newTokens, oldTokens.length, newTokens.length))

  const removed: DiffToken[] = []
  const added: DiffToken[] = []

  let lcsIndex = 0
  const lcsArray = Array.from(lcs)

  for (const token of oldTokens) {
    if (lcsIndex < lcsArray.length && token === lcsArray[lcsIndex]) {
      removed.push({ text: token, type: 'unchanged' })
      lcsIndex++
    } else {
      removed.push({ text: token, type: 'removed' })
    }
  }

  lcsIndex = 0
  for (const token of newTokens) {
    if (lcsIndex < lcsArray.length && token === lcsArray[lcsIndex]) {
      added.push({ text: token, type: 'unchanged' })
      lcsIndex++
    } else {
      added.push({ text: token, type: 'added' })
    }
  }

  return { removed, added }
}
