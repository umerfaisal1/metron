/**
 * Metron Formula Evaluator & Smart Column Matcher
 * Evaluates spreadsheet cell formulas (SUM, AVERAGE, MIN, MAX, arithmetic, cell references like B2, ranges C2:C10)
 * and provides robust fuzzy column matching so charts always have accurate, populated data.
 */

// Convert Excel column letters to 0-based index: A -> 0, B -> 1, Z -> 25, AA -> 26
export function colLetterToIndex(colStr: string): number {
  let col = 0
  const s = colStr.toUpperCase().trim()
  for (let i = 0; i < s.length; i++) {
    col = col * 26 + (s.charCodeAt(i) - 64)
  }
  return Math.max(0, col - 1)
}

// Convert 0-based index to Excel column letters: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA
export function indexToColLetter(index: number): string {
  let colStr = ''
  let c = index
  while (c >= 0) {
    colStr = String.fromCharCode((c % 26) + 65) + colStr
    c = Math.floor(c / 26) - 1
  }
  return colStr
}

/**
 * Robust numeric parser that handles:
 * - Direct numbers
 * - Currency symbols (Rs., $, €, £, ¥, ₹, PKR, USD, EUR, etc.)
 * - Accounting negative format: (1,250.00) -> -1250
 * - Suffix multipliers: 10k -> 10000, 2.5M -> 2500000, 1B -> 1000000000
 * - Percentages: 15% -> 15
 * - Commas & whitespace in numbers
 */
export function parseNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    return isFinite(val) ? val : null
  }

  const str = String(val).trim()
  if (str === '') return null

  // Accounting parentheses negative numbers e.g. (500) or (1,250.50)
  if (str.startsWith('(') && str.endsWith(')')) {
    const inner = parseNumericValue(str.slice(1, -1))
    return inner !== null ? -inner : null
  }

  // Trailing minus e.g. 500- or 500/-
  if (/^[\d,.]+\s*\/?-$/.test(str)) {
    const inner = parseNumericValue(str.replace(/\/?-$/, ''))
    return inner !== null ? inner : null
  }

  // Suffix multipliers (e.g. 10k, 2.5M, 1B)
  const suffixMatch = str.match(/^([+-]?[\d,.]+)\s*([kKmMbB])%?$/)
  if (suffixMatch) {
    const base = parseFloat(suffixMatch[1].replace(/,/g, ''))
    const mult = suffixMatch[2].toLowerCase()
    if (!isNaN(base)) {
      if (mult === 'k') return base * 1000
      if (mult === 'm') return base * 1000000
      if (mult === 'b') return base * 1000000000
    }
  }

  // Pure arithmetic formula without cell letters e.g. "=500*2" or "=1200+300"
  if (str.startsWith('=')) {
    // If it references letters (cell names like D2, SUM) or colons (ranges like D2:D10), skip evaluating
    if (/[a-zA-Z:]/.test(str)) return null

    try {
      const sanitized = str.substring(1).replace(/[^0-9.+\-*/() ]/g, '')
      if (sanitized && !/[a-zA-Z]/.test(sanitized)) {
        // eslint-disable-next-line no-eval
        const evaluated = Function(`"use strict"; return (${sanitized})`)()
        if (typeof evaluated === 'number' && isFinite(evaluated)) return evaluated
      }
    } catch {
      // ignore
    }
    return null
  }

  // Remove currency words and symbols, commas, trailing slashes, percentage signs
  const cleaned = str
    .replace(/rs\.?/gi, '')
    .replace(/\b(?:usd|pkr|inr|eur|gbp|cad|aud)\b/gi, '')
    .replace(/[$€£¥₹,\s%/-]/gi, '')
    .trim()

  const num = parseFloat(cleaned)
  if (!isNaN(num) && isFinite(num)) {
    // Preserve negative sign if original had it
    return str.includes('-') && !str.endsWith('-') ? -Math.abs(num) : num
  }

  return null
}

/**
 * Evaluates all formula cells in a spreadsheet 2D grid so that downstream
 * charts and calculations operate on real numerical values instead of raw formula strings.
 */
export function evaluateGridFormulas(grid: Array<Array<unknown>>): Array<Array<unknown>> {
  if (!Array.isArray(grid) || grid.length === 0) return grid
  const rowCount = grid.length
  const colCount = Math.max(...grid.map((r) => (Array.isArray(r) ? r.length : 0)))

  // Clone grid to store evaluated values
  const evaluated: Array<Array<unknown>> = grid.map((row) =>
    Array.isArray(row) ? [...row] : []
  )

  const getCellNum = (cIdx: number, rIdx: number): number => {
    if (rIdx < 0 || rIdx >= rowCount || cIdx < 0 || cIdx >= colCount) return 0
    const v = evaluated[rIdx]?.[cIdx]
    const n = parseNumericValue(v)
    return n ?? 0
  }

  // Resolves a cell reference like "B2" or "C10"
  // Note: in Excel row 1 is headers, so B2 is row index 0 of gridData.
  const resolveCellRef = (refStr: string): number => {
    const m = refStr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
    if (!m) return 0
    const colIdx = colLetterToIndex(m[1])
    const rowNum = parseInt(m[2], 10)

    let rIdx = rowNum - 2 // Excel row 2 = grid[0]
    if (rIdx < 0 || rIdx >= rowCount) {
      rIdx = rowNum - 1 // 1-based data index fallback
    }
    return getCellNum(colIdx, rIdx)
  }

  // Resolves a range reference like "C2:C10" or "B2:E2"
  const resolveRange = (rangeStr: string): number[] => {
    const parts = rangeStr.split(':')
    if (parts.length !== 2) return []
    const m1 = parts[0].trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
    const m2 = parts[1].trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
    if (!m1 || !m2) return []

    const startCol = colLetterToIndex(m1[1])
    const endCol = colLetterToIndex(m2[1])
    const startRow = parseInt(m1[2], 10)
    const endRow = parseInt(m2[2], 10)

    const minC = Math.min(startCol, endCol)
    const maxC = Math.max(startCol, endCol)
    const minR = Math.min(startRow, endRow)
    const maxR = Math.max(startRow, endRow)

    const vals: number[] = []
    for (let r = minR; r <= maxR; r++) {
      let rIdx = r - 2
      if (rIdx < 0 || rIdx >= rowCount) rIdx = r - 1
      for (let c = minC; c <= maxC; c++) {
        vals.push(getCellNum(c, rIdx))
      }
    }
    return vals
  }

  const evalSingleFormula = (formula: string): number => {
    let expr = formula.trim()
    if (expr.startsWith('=')) expr = expr.substring(1).trim()

    // 1. Evaluate SUM(...)
    expr = expr.replace(/\bSUM\s*\(([^)]+)\)/gi, (_, args) => {
      let sum = 0
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) {
          resolveRange(a).forEach((v) => (sum += v))
        } else {
          sum += resolveCellRef(a) || (parseNumericValue(a) ?? 0)
        }
      })
      return String(sum)
    })

    // 2. Evaluate AVERAGE(...) or AVG(...)
    expr = expr.replace(/\b(?:AVERAGE|AVG)\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = []
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) {
          vals.push(...resolveRange(a))
        } else {
          vals.push(resolveCellRef(a) || (parseNumericValue(a) ?? 0))
        }
      })
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return String(parseFloat(avg.toFixed(2)))
    })

    // 3. Evaluate MIN(...) and MAX(...)
    expr = expr.replace(/\bMIN\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = []
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) vals.push(...resolveRange(a))
        else vals.push(resolveCellRef(a) || (parseNumericValue(a) ?? 0))
      })
      return String(vals.length > 0 ? Math.min(...vals) : 0)
    })

    expr = expr.replace(/\bMAX\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = []
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) vals.push(...resolveRange(a))
        else vals.push(resolveCellRef(a) || (parseNumericValue(a) ?? 0))
      })
      return String(vals.length > 0 ? Math.max(...vals) : 0)
    })

    // 4. Evaluate COUNT(...)
    expr = expr.replace(/\bCOUNT(?:A)?\s*\(([^)]+)\)/gi, (_, args) => {
      let count = 0
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) count += resolveRange(a).length
        else count += 1
      })
      return String(count)
    })

    // 5. Evaluate PRODUCT(...) or MULTIPLY(...)
    expr = expr.replace(/\b(?:PRODUCT|MULTIPLY)\s*\(([^)]+)\)/gi, (_, args) => {
      const vals: number[] = []
      args.split(',').forEach((arg: string) => {
        const a = arg.trim()
        if (a.includes(':')) vals.push(...resolveRange(a))
        else vals.push(resolveCellRef(a) || (parseNumericValue(a) ?? 0))
      })
      const prod = vals.length > 0 ? vals.reduce((a, b) => a * b, 1) : 0
      return String(prod)
    })

    // 6. Evaluate ROUND(expr, decimals)
    expr = expr.replace(/\bROUND\s*\(([^,]+),\s*(\d+)\)/gi, (_, innerExpr, dec) => {
      const val = evalSingleFormula(innerExpr)
      const factor = Math.pow(10, parseInt(dec, 10))
      return String(Math.round(val * factor) / factor)
    })

    // 7. Resolve standalone cell references (e.g. B2, C3, D10)
    expr = expr.replace(/\b([A-Z]+)(\d+)\b/gi, (match) => {
      return String(resolveCellRef(match))
    })

    // 8. Safe arithmetic evaluation
    try {
      const sanitized = expr.replace(/[^0-9.+\-*/() ]/g, '')
      if (sanitized && !/[a-zA-Z]/.test(sanitized)) {
        // eslint-disable-next-line no-eval
        const res = Function(`"use strict"; return (${sanitized})`)()
        if (typeof res === 'number' && isFinite(res)) {
          return parseFloat(res.toFixed(4))
        }
      }
    } catch {
      // ignore
    }

    return 0
  }

  // Iterate rows and evaluate formulas (up to 2 passes to resolve inter-row dependencies)
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cell = evaluated[r]?.[c]
        if (typeof cell === 'string' && cell.trim().startsWith('=')) {
          const res = evalSingleFormula(cell)
          evaluated[r][c] = res
        }
      }
    }
  }

  return evaluated
}

/**
 * Normalizes a column title for fuzzy matching:
 * Removes parenthesized units, symbols, currency tags, and punctuation.
 * e.g. "Daily Total (Rs.)" -> "daily total"
 * e.g. "Amount ($)" -> "amount"
 */
export function normalizeColTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Smart column index resolver:
 * Matches recommended column names (even if slightly altered or abbreviated by LLM)
 * to actual spreadsheet columns, guaranteeing charts receive valid data.
 */
export function findBestColumnIndex(
  targetTitle: string,
  columns: Array<{ title: string; type?: string }>,
  data: Array<Array<unknown>>,
  options?: {
    isQuantitative?: boolean
    isTemporal?: boolean
    isCategorical?: boolean
    excludeIndices?: Set<number>
  }
): number {
  if (!columns || columns.length === 0) return -1
  const exclude = options?.excludeIndices || new Set<number>()
  const cleanTarget = normalizeColTitle(targetTitle)

  // 1. Exact string match (trimmed, case-insensitive)
  if (targetTitle) {
    const rawTarget = targetTitle.trim().toLowerCase()
    for (let i = 0; i < columns.length; i++) {
      if (exclude.has(i)) continue
      if (columns[i].title.trim().toLowerCase() === rawTarget) {
        return i
      }
    }
  }

  // 2. Normalized name match (stripping units, currency, brackets)
  if (cleanTarget) {
    for (let i = 0; i < columns.length; i++) {
      if (exclude.has(i)) continue
      const cleanCol = normalizeColTitle(columns[i].title)
      if (cleanCol === cleanTarget && cleanCol.length > 0) {
        return i
      }
    }

    // 3. Substring / Containment match (e.g. "Amount" in "Total Amount", "Cost" in "Mess Cost")
    let bestSubIdx = -1
    let bestSubScore = 0
    for (let i = 0; i < columns.length; i++) {
      if (exclude.has(i)) continue
      const cleanCol = normalizeColTitle(columns[i].title)
      if (cleanCol.includes(cleanTarget) || cleanTarget.includes(cleanCol)) {
        const score = Math.min(cleanCol.length, cleanTarget.length)
        if (score > bestSubScore) {
          bestSubScore = score
          bestSubIdx = i
        }
      }
    }
    if (bestSubIdx !== -1) return bestSubIdx

    // 4. Word-level overlap match
    const targetWords = cleanTarget.split(' ').filter((w) => w.length > 2)
    let bestWordIdx = -1
    let bestWordScore = 0
    for (let i = 0; i < columns.length; i++) {
      if (exclude.has(i)) continue
      const colWords = normalizeColTitle(columns[i].title).split(' ').filter((w) => w.length > 2)
      let overlap = 0
      for (const tw of targetWords) {
        if (colWords.some((cw) => cw.startsWith(tw) || tw.startsWith(cw))) {
          overlap++
        }
      }
      if (overlap > bestWordScore) {
        bestWordScore = overlap
        bestWordIdx = i
      }
    }
    if (bestWordIdx !== -1 && bestWordScore > 0) return bestWordIdx
  }

  // 5. Data-driven fallback if looking for a quantitative (metric) column
  if (options?.isQuantitative && data.length > 0) {
    const metricKeywords = /total|cost|amount|price|revenue|sales|spend|profit|value|fee|tax|margin|rate|score|quantity|qty|units/i
    const nonMetricKeywords = /id|key|code|sku|uuid|date|day|month|year|period|time/i

    let bestIdx = -1
    let bestPriority = -1

    for (let c = 0; c < columns.length; c++) {
      if (exclude.has(c)) continue
      const colTitle = columns[c].title.toLowerCase()
      if (nonMetricKeywords.test(colTitle) && !metricKeywords.test(colTitle)) continue

      let numCount = 0
      let nonZeroCount = 0

      for (const row of data) {
        if (!Array.isArray(row)) continue
        const n = parseNumericValue(row[c])
        if (n !== null) {
          numCount++
          if (n !== 0) nonZeroCount++
        }
      }

      const ratio = numCount / Math.max(data.length, 1)
      if (ratio >= 0.4) {
        let priority = nonZeroCount * 2 + numCount
        if (columns[c].type === 'numeric') priority += 50
        if (metricKeywords.test(colTitle)) priority += 100

        if (priority > bestPriority) {
          bestPriority = priority
          bestIdx = c
        }
      }
    }

    if (bestIdx !== -1) return bestIdx
  }

  // 6. Data-driven fallback if looking for a temporal (date) column
  if (options?.isTemporal && data.length > 0) {
    const dateKeywords = /date|day|month|year|period|week|quarter|time/i
    for (let c = 0; c < columns.length; c++) {
      if (exclude.has(c)) continue
      if (dateKeywords.test(columns[c].title)) return c
    }
  }

  // 7. Data-driven fallback if looking for a categorical column
  if (options?.isCategorical && data.length > 0) {
    for (let c = 0; c < columns.length; c++) {
      if (exclude.has(c)) continue
      // Pick first non-numeric column with distinct values
      let textCount = 0
      for (const row of data) {
        if (!Array.isArray(row)) continue
        const val = row[c]
        if (val !== null && val !== undefined && parseNumericValue(val) === null) {
          textCount++
        }
      }
      if (textCount >= data.length * 0.5) return c
    }
  }

  return -1
}
