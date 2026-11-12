import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseNumericValue,
  isDateLike,
  isSummaryRow,
  analyzeColumn,
  analyzeSheet,
  analyzeWorkbook,
} from '../lib/charts/analysisEngine'

import {
  buildChartDataAndOption,
  METRON_PALETTE,
} from '../lib/charts/aggregationEngine'

import {
  generateRuleBasedRecommendations,
} from '../lib/charts/aiChartEngine'

import {
  parseSpreadsheetBuffer,
} from '../lib/spreadsheet/fileParser'

import * as XLSX from 'xlsx'

describe('Workbook Analysis Engine', () => {
  describe('parseNumericValue', () => {
    it('parses raw numbers and string numbers', () => {
      assert.equal(parseNumericValue(42), 42)
      assert.equal(parseNumericValue(1250.75), 1250.75)
      assert.equal(parseNumericValue('500'), 500)
      assert.equal(parseNumericValue(' -15.5 '), -15.5)
    })

    it('cleans currency symbols, commas, and percentage signs', () => {
      assert.equal(parseNumericValue('$1,200.50'), 1200.5)
      assert.equal(parseNumericValue('Rs. 500'), 500)
      assert.equal(parseNumericValue('€ 2,450'), 2450)
      assert.equal(parseNumericValue('£350.00'), 350)
      assert.equal(parseNumericValue('85%'), 85)
    })

    it('evaluates simple formula arithmetic', () => {
      assert.equal(parseNumericValue('=500*2'), 1000)
      assert.equal(parseNumericValue('=1200+300'), 1500)
    })

    it('returns null for null, undefined, and non-numeric strings', () => {
      assert.equal(parseNumericValue(null), null)
      assert.equal(parseNumericValue(undefined), null)
      assert.equal(parseNumericValue(''), null)
      assert.equal(parseNumericValue('Transportation'), null)
      assert.equal(parseNumericValue('=SUM(D2:D10)'), null)
    })
  })

  describe('isDateLike', () => {
    it('detects ISO and common date formats', () => {
      assert.equal(isDateLike('2025-11-01'), true)
      assert.equal(isDateLike('11/05/2025'), true)
      assert.equal(isDateLike('2025.12.31'), true)
    })

    it('detects day and month names', () => {
      assert.equal(isDateLike('Monday'), true)
      assert.equal(isDateLike('Friday'), true)
      assert.equal(isDateLike('January'), true)
      assert.equal(isDateLike('Oct'), true)
    })

    it('detects quarters and periods', () => {
      assert.equal(isDateLike('Q1'), true)
      assert.equal(isDateLike('Quarter 3'), true)
      assert.equal(isDateLike('Day 14'), true)
    })

    it('returns false for non-date strings', () => {
      assert.equal(isDateLike('Groceries'), false)
      assert.equal(isDateLike('Rs. 500'), false)
      assert.equal(isDateLike('YES'), false)
    })
  })

  describe('isSummaryRow', () => {
    it('detects total, subtotal, and average rows', () => {
      assert.equal(isSummaryRow(['Total', '', '', 15000]), true)
      assert.equal(isSummaryRow(['Grand Total:', '', 25000]), true)
      assert.equal(isSummaryRow(['Average', 500, 120]), true)
    })

    it('returns false for normal data rows', () => {
      assert.equal(isSummaryRow(['2025-11-01', 'Sat', 'YES', 500]), false)
      assert.equal(isSummaryRow(['Acme Corp', 'Enterprise', 120000]), false)
    })
  })

  describe('analyzeColumn', () => {
    it('identifies temporal date columns', () => {
      const dates = ['2025-11-01', '2025-11-02', '2025-11-03', '2025-11-04']
      const col = analyzeColumn('Date', 0, 'text', dates)
      assert.equal(col.detectedRole, 'temporal')
      assert.equal(col.isDate, true)
    })

    it('identifies quantitative numeric columns with statistics', () => {
      const costs = [500, 1200, 350, 800, 950]
      const col = analyzeColumn('Cost (Rs.)', 1, 'numeric', costs)
      assert.equal(col.detectedRole, 'quantitative')
      assert.equal(col.isNumeric, true)
      assert.equal(col.stats?.min, 350)
      assert.equal(col.stats?.max, 1200)
      assert.equal(col.stats?.sum, 3800)
      assert.equal(col.stats?.avg, 760)
    })

    it('identifies categorical columns with low cardinality', () => {
      const categories = ['Food', 'Transport', 'Food', 'Shopping', 'Transport', 'Food']
      const col = analyzeColumn('Category', 2, 'dropdown', categories)
      assert.equal(col.detectedRole, 'categorical')
      assert.equal(col.distinctCount, 3)
    })

    it('identifies identifier columns with unique keys', () => {
      const ids = ['MET-001', 'MET-002', 'MET-003', 'MET-004', 'MET-005']
      const col = analyzeColumn('Item ID', 3, 'text', ids)
      assert.equal(col.detectedRole, 'identifier')
    })
  })

  describe('analyzeSheet & Suitability Rules', () => {
    it('approves suitable datasets and detects summary row', () => {
      const columns = [
        { title: 'Date', type: 'text' },
        { title: 'Category', type: 'text' },
        { title: 'Cost', type: 'numeric' },
      ]
      const data = [
        ['2025-11-01', 'Food', 500],
        ['2025-11-02', 'Transport', 250],
        ['2025-11-03', 'Food', 600],
        ['Total', '', 1350],
      ]
      const sheet = analyzeSheet('Expenses', columns, data)
      assert.equal(sheet.isSuitableForVisualization, true)
      assert.equal(sheet.hasSummaryRow, true)
      assert.equal(sheet.summaryRowIndex, 3)
      assert.equal(sheet.rowCount, 3) // Excludes summary row from count
    })

    it('rejects datasets with fewer than 2 data rows', () => {
      const columns = [{ title: 'Category', type: 'text' }, { title: 'Cost', type: 'numeric' }]
      const data = [['Food', 500]]
      const sheet = analyzeSheet('SingleRow', columns, data)
      assert.equal(sheet.isSuitableForVisualization, false)
      assert.match(sheet.unsuitabilityReason || '', /fewer than 2/i)
    })

    it('rejects datasets with zero numeric columns', () => {
      const columns = [{ title: 'First Name', type: 'text' }, { title: 'Last Name', type: 'text' }]
      const data = [
        ['John', 'Doe'],
        ['Jane', 'Smith'],
      ]
      const sheet = analyzeSheet('Names', columns, data)
      assert.equal(sheet.isSuitableForVisualization, false)
      assert.match(sheet.unsuitabilityReason || '', /numeric/i)
    })
  })
})

describe('Deterministic Data Aggregation Engine', () => {
  const columns = [
    { title: 'Date', type: 'text' },
    { title: 'Category', type: 'text' },
    { title: 'Cost (Rs.)', type: 'numeric' },
  ]
  const data = [
    ['2025-11-01', 'Food', 500],
    ['2025-11-02', 'Transport', 250],
    ['2025-11-03', 'Food', 300],
    ['2025-11-04', 'Shopping', 800],
    ['2025-11-05', 'Food', 200],
  ]

  it('aggregates sum for bar charts grouped by category', () => {
    const recommendation = {
      id: 'test-bar-1',
      title: 'Expense by Category',
      description: 'Total spending',
      chartType: 'bar' as const,
      xAxisColumn: 'Category',
      yAxisColumns: ['Cost (Rs.)'],
      aggregation: 'sum' as const,
      explanation: 'Shows spending rank',
    }

    const result = buildChartDataAndOption(recommendation, columns, data)
    assert.equal(result.calculatedPoints, 3) // Food (1000), Transport (250), Shopping (800)
    assert.equal((result.echartsOption.title as any)?.text, 'Expense by Category')
    const barSeries = (result.echartsOption.series as any[])?.[0]
    assert.equal(barSeries?.type, 'bar')
  })

  it('aggregates pie chart and limits slices with donut option', () => {
    const recommendation = {
      id: 'test-pie-1',
      title: 'Expense Share',
      description: 'Distribution',
      chartType: 'pie' as const,
      xAxisColumn: 'Category',
      yAxisColumns: ['Cost (Rs.)'],
      aggregation: 'sum' as const,
      explanation: 'Parts to whole',
      options: { donut: true },
    }

    const result = buildChartDataAndOption(recommendation, columns, data)
    const pieSeries = (result.echartsOption.series as any[])?.[0]
    assert.equal(pieSeries?.type, 'pie')
    assert.deepEqual(pieSeries.radius, ['42%', '72%']) // Donut radius
    // Food = 500 + 300 + 200 = 1000
    const foodItem = pieSeries.data.find((d: any) => d.name === 'Food')
    assert.equal(foodItem?.value, 1000)
  })

  it('creates area chart for temporal sequence', () => {
    const recommendation = {
      id: 'test-area-1',
      title: 'Daily Cost Trend',
      description: 'Spending over time',
      chartType: 'area' as const,
      xAxisColumn: 'Date',
      yAxisColumns: ['Cost (Rs.)'],
      aggregation: 'none' as const,
      explanation: 'Chronological timeline',
      options: { smooth: true },
    }

    const result = buildChartDataAndOption(recommendation, columns, data)
    const lineSeries = (result.echartsOption.series as any[])?.[0]
    assert.equal(lineSeries?.type, 'line')
    assert.equal(lineSeries.smooth, true)
    assert.ok(lineSeries.areaStyle !== undefined)
  })

  it('excludes summary row from chart aggregation', () => {
    const dataWithTotal = [...data, ['Total', '', 2050]]
    const recommendation = {
      id: 'test-bar-2',
      title: 'Category Sum',
      description: 'No summary duplicate',
      chartType: 'bar' as const,
      xAxisColumn: 'Category',
      yAxisColumns: ['Cost (Rs.)'],
      aggregation: 'sum' as const,
      explanation: 'Testing summary row exclusion',
    }

    const result = buildChartDataAndOption(recommendation, columns, dataWithTotal)
    // The X-axis categories must not contain 'Total'
    const xCategories = (result.echartsOption.xAxis as any)?.data || []
    assert.equal(xCategories.includes('Total'), false)
  })
})

describe('AI Rule-Based Recommender', () => {
  it('recommends trend and category charts for date and category data', () => {
    const columns = [
      { title: 'Date', type: 'text' },
      { title: 'Category', type: 'dropdown' },
      { title: 'Daily Total (Rs.)', type: 'numeric' },
    ]
    const data = [
      ['2025-11-01', 'Food', 500],
      ['2025-11-02', 'Transport', 350],
      ['2025-11-03', 'Food', 450],
      ['2025-11-04', 'Utilities', 800],
    ]
    const sheet = analyzeSheet('Monthly Expenses', columns, data)
    const recs = generateRuleBasedRecommendations(sheet)

    assert.equal(recs.isSuitableForVisualization, true)
    assert.ok(recs.charts.length >= 2)
    const chartTypes = recs.charts.map((c) => c.chartType)
    assert.ok(chartTypes.includes('area') || chartTypes.includes('line'))
    assert.ok(chartTypes.includes('pie') || chartTypes.includes('bar'))
  })

  it('provides short analytical explanation for each chart', () => {
    const columns = [
      { title: 'Stage', type: 'dropdown' },
      { title: 'Contract Value ($)', type: 'numeric' },
    ]
    const data = [
      ['Discovery', 50000],
      ['Demo', 80000],
      ['Proposal', 120000],
      ['Won', 150000],
    ]
    const sheet = analyzeSheet('Sales', columns, data)
    const recs = generateRuleBasedRecommendations(sheet)

    recs.charts.forEach((chart) => {
      assert.ok(chart.explanation.length > 10, 'Chart explanation must be descriptive')
      assert.ok(chart.title.length > 5, 'Chart title must be informative')
    })
  })
})

describe('Spreadsheet File Parser (SheetJS)', () => {
  it('parses valid workbook buffer into clean columns and rows', () => {
    // Create an in-memory workbook with SheetJS
    const wsData = [
      ['Product', 'Region', 'Revenue ($)', 'Quarter'],
      ['Laptop Pro', 'North', 15000, 'Q1'],
      ['Tablet Air', 'South', 8500, 'Q1'],
      ['Monitor 4K', 'West', 4200, 'Q1'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SalesData')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    const parsed = parseSpreadsheetBuffer(buffer, 'Q1_Sales_Report.xlsx')
    assert.equal(parsed.title, 'Q1 Sales Report')
    assert.equal(parsed.sheets.length, 1)
    assert.equal(parsed.activeSheet.columns.length, 4)
    assert.equal(parsed.activeSheet.columns[2].title, 'Revenue ($)')
    assert.equal(parsed.activeSheet.columns[2].type, 'numeric')
    assert.equal(parsed.activeSheet.data.length, 3)
    assert.equal(parsed.activeSheet.data[0][0], 'Laptop Pro')
  })
})
