import {
  ColumnAnalysis,
  ColumnDataType,
  DetectedRole,
  SheetAnalysis,
  WorkbookAnalysisResult,
} from './types'
import {
  parseNumericValue,
  evaluateGridFormulas,
} from './formulaEvaluator'

export { parseNumericValue, evaluateGridFormulas }

// Helper to check if a value is a date
export function isDateLike(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false
  if (val instanceof Date && !isNaN(val.getTime())) return true

  const str = String(val).trim()
  if (str.length < 2) return false

  // Common date formats: 2025-11-01, 11/01/2025, 01-Nov-2025, etc.
  const isoPattern = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/
  const dmyPattern = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/
  if (isoPattern.test(str) || dmyPattern.test(str)) {
    const timestamp = Date.parse(str)
    if (!isNaN(timestamp)) return true
  }

  // Days of week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  if (days.includes(str.toLowerCase())) return true

  // Months
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  if (months.includes(str.toLowerCase())) return true

  // Quarter / Period (Q1, Q2 2025, Week 12, Day 1)
  if (/^(q[1-4]|quarter\s*[1-4]|week\s*\d+|day\s*\d+)/i.test(str)) return true

  return false
}

// Detect if a row is a summary/total row
export function isSummaryRow(row: Array<unknown>): boolean {
  if (!Array.isArray(row) || row.length === 0) return false
  const summaryKeywords = ['total', 'grand total', 'subtotal', 'average', 'avg', 'summary', 'sum']

  for (const cell of row) {
    if (typeof cell === 'string') {
      const lower = cell.trim().toLowerCase()
      if (summaryKeywords.some((kw) => lower === kw || lower.startsWith(`${kw}:`) || lower.startsWith(`${kw} `))) {
        return true
      }
    }
  }
  return false
}

// Analyze a single column
export function analyzeColumn(
  title: string,
  index: number,
  declaredType: string | undefined,
  values: unknown[]
): ColumnAnalysis {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  const nonNullCount = nonNullValues.length
  const uniqueSet = new Set(nonNullValues.map((v) => String(v).trim()))
  const distinctCount = uniqueSet.size

  // Test numeric
  const numericValues: number[] = []
  for (const v of nonNullValues) {
    const parsed = parseNumericValue(v)
    if (parsed !== null) numericValues.push(parsed)
  }
  const numericRatio = nonNullCount > 0 ? numericValues.length / nonNullCount : 0
  const isNumeric = declaredType === 'numeric' || (nonNullCount > 0 && numericRatio >= 0.5)

  // Test date
  let dateMatches = 0
  for (const v of nonNullValues) {
    if (isDateLike(v)) dateMatches++
  }
  const dateRatio = nonNullCount > 0 ? dateMatches / nonNullCount : 0
  const titleLower = title.toLowerCase()
  const titleHasDateHint = titleLower.includes('date') || titleLower.includes('month') || titleLower.includes('year') || titleLower.includes('day') || titleLower.includes('period') || titleLower.includes('quarter')
  const isDate = dateRatio >= 0.5 || (titleHasDateHint && dateRatio >= 0.25)

  // Determine detectedType
  let detectedType: ColumnDataType = 'text'
  if (isDate) {
    detectedType = 'date'
  } else if (isNumeric) {
    detectedType = 'numeric'
  } else if (declaredType === 'dropdown' || (distinctCount > 0 && distinctCount <= 20 && distinctCount < nonNullCount)) {
    detectedType = 'dropdown'
  }

  // Determine detectedRole
  let detectedRole: DetectedRole = 'categorical'

  if (isDate) {
    detectedRole = 'temporal'
  } else if (isNumeric) {
    // Check if it's an ID or Year
    const isIdHint = titleLower.includes('id') || titleLower.includes('code') || titleLower.includes('key') || titleLower.includes('#')
    const looksLikeYear = numericValues.length > 0 && numericValues.every((n) => n >= 1950 && n <= 2100 && Number.isInteger(n))

    if (looksLikeYear && titleHasDateHint) {
      detectedRole = 'temporal'
    } else if (isIdHint && distinctCount === nonNullCount && nonNullCount > 3) {
      detectedRole = 'identifier'
    } else {
      detectedRole = 'quantitative'
    }
  } else {
    // String column: check if identifier or categorical
    const isIdHint = titleLower.includes('id') || titleLower.includes('sku') || titleLower.includes('uuid') || titleLower.includes('guid') || titleLower.includes('key')
    const uniqueness = nonNullCount > 0 ? distinctCount / nonNullCount : 0

    if ((isIdHint && uniqueness > 0.8) || (uniqueness > 0.95 && nonNullCount > 20)) {
      detectedRole = 'identifier'
    } else {
      detectedRole = 'categorical'
    }
  }

  // Calculate statistics for quantitative columns
  let stats: ColumnAnalysis['stats'] = undefined
  if (detectedRole === 'quantitative' && numericValues.length > 0) {
    const min = Math.min(...numericValues)
    const max = Math.max(...numericValues)
    const sum = numericValues.reduce((a, b) => a + b, 0)
    const avg = parseFloat((sum / numericValues.length).toFixed(2))
    stats = { min, max, sum: parseFloat(sum.toFixed(2)), avg }
  }

  return {
    index,
    title,
    declaredType,
    detectedType,
    detectedRole,
    sampleValues: nonNullValues.slice(0, 5) as Array<string | number | boolean | null>,
    nonNullCount,
    distinctCount,
    isNumeric,
    isDate,
    stats,
  }
}

// Analyze worksheet data
export function analyzeSheet(
  sheetName: string,
  columns: Array<{ title: string; type?: string }>,
  data: Array<Array<unknown>>
): SheetAnalysis {
  // Pre-evaluate formula cells so analysis uses actual computed numbers
  const evaluatedData = evaluateGridFormulas(data)

  const rowCount = evaluatedData.length
  const colCount = columns.length

  // Check for summary row
  let hasSummaryRow = false
  let summaryRowIndex: number | undefined = undefined

  if (rowCount > 0 && isSummaryRow(evaluatedData[rowCount - 1])) {
    hasSummaryRow = true
    summaryRowIndex = rowCount - 1
  }

  const effectiveRows = hasSummaryRow ? evaluatedData.slice(0, rowCount - 1) : evaluatedData

  // Analyze each column
  const columnAnalyses: ColumnAnalysis[] = columns.map((col, cIdx) => {
    const colValues = effectiveRows.map((row) => (Array.isArray(row) ? row[cIdx] : undefined))
    return analyzeColumn(col.title || `Column ${cIdx + 1}`, cIdx, col.type, colValues)
  })

  // Determine visualization suitability
  const quantCols = columnAnalyses.filter((c) => c.detectedRole === 'quantitative')
  const catCols = columnAnalyses.filter((c) => c.detectedRole === 'categorical')
  const tempCols = columnAnalyses.filter((c) => c.detectedRole === 'temporal')
  const effectiveRowCount = effectiveRows.length

  let isSuitableForVisualization = true
  let unsuitabilityReason: string | undefined = undefined

  if (effectiveRowCount < 2) {
    isSuitableForVisualization = false
    unsuitabilityReason = 'The spreadsheet contains fewer than 2 data rows, which is not sufficient for meaningful charting.'
  } else if (quantCols.length === 0) {
    isSuitableForVisualization = false
    unsuitabilityReason = 'No quantitative/numeric columns were found. Charts require at least one numeric metric to plot.'
  } else if (catCols.length === 0 && tempCols.length === 0 && effectiveRowCount > 1) {
    // If only quantitative columns exist, it can still plot an index/scatter
    if (quantCols.length < 2) {
      isSuitableForVisualization = false
      unsuitabilityReason = 'At least one categorical or temporal dimension (or two quantitative metrics for correlation) is required.'
    }
  }

  // Generate suggested insights
  const suggestedInsights: string[] = []
  if (isSuitableForVisualization) {
    const tempCol = columnAnalyses.find((c) => c.detectedRole === 'temporal')
    const primaryCat = columnAnalyses.find((c) => c.detectedRole === 'categorical' && c.distinctCount >= 2 && c.distinctCount <= 20)

    if (tempCol && quantCols.length > 0) {
      suggestedInsights.push(`Time-series progression tracked across ${tempCol.title} for ${quantCols.map((c) => c.title).join(', ')}.`)
    }
    if (primaryCat && quantCols.length > 0) {
      suggestedInsights.push(`Distribution and categorical comparison across ${primaryCat.title} (${primaryCat.distinctCount} groups).`)
    }
    if (quantCols.length >= 2) {
      suggestedInsights.push(`Metric correlation between ${quantCols[0].title} and ${quantCols[1].title}.`)
    }
  }

  return {
    sheetName,
    rowCount: effectiveRowCount,
    colCount,
    hasSummaryRow,
    summaryRowIndex,
    columns: columnAnalyses,
    suggestedInsights,
    isSuitableForVisualization,
    unsuitabilityReason,
  }
}

// Analyze entire workbook
export function analyzeWorkbook(
  title: string,
  sheets: Array<{ name: string; columns: Array<{ title: string; type?: string }>; data: Array<Array<unknown>> }>,
  activeSheetIndex: number = 0
): WorkbookAnalysisResult {
  const sheetAnalyses = sheets.map((s) => analyzeSheet(s.name, s.columns, s.data))
  const activeSheet = sheetAnalyses[activeSheetIndex] || sheetAnalyses[0]

  const primaryDateColumn = activeSheet?.columns.find((c) => c.detectedRole === 'temporal')?.title
  const primaryCategoryColumn = activeSheet?.columns.find(
    (c) => c.detectedRole === 'categorical' && c.distinctCount >= 2 && c.distinctCount <= 25
  )?.title
  const metricColumns = activeSheet?.columns.filter((c) => c.detectedRole === 'quantitative').map((c) => c.title) || []

  return {
    title: title || 'Spreadsheet',
    sheets: sheetAnalyses,
    activeSheet,
    primaryDateColumn,
    primaryCategoryColumn,
    metricColumns,
  }
}
