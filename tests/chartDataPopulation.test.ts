import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildChartDataAndOption } from '../lib/charts/aggregationEngine'
import { analyzeSheet } from '../lib/charts/analysisEngine'
import {
  evaluateGridFormulas,
  parseNumericValue,
  findBestColumnIndex,
} from '../lib/charts/formulaEvaluator'
import type { ChartRecommendation } from '../lib/charts/types'

describe('Chart Data Population & Formula Resolution (Fix Empty Charts)', () => {
  it('correctly parses varied currency, accounting parentheses, and number formats', () => {
    assert.equal(parseNumericValue('Rs. 500'), 500)
    assert.equal(parseNumericValue('Rs. 1,500.50'), 1500.5)
    assert.equal(parseNumericValue('$2,500'), 2500)
    assert.equal(parseNumericValue('€120'), 120)
    assert.equal(parseNumericValue('(500)'), -500)
    assert.equal(parseNumericValue('(1,200)'), -1200)
    assert.equal(parseNumericValue('10k'), 10000)
    assert.equal(parseNumericValue('1.5M'), 1500000)
    assert.equal(parseNumericValue('500/-'), 500)
    assert.equal(parseNumericValue('=500*3'), 1500)
  })

  it('evaluates cell references and arithmetic formulas in grid rows', () => {
    // Grid:
    // Row 0 (Excel 2): Daily Mess Count = 1, Rate = 500, Formula = "=A2*B2" -> 500
    // Row 1 (Excel 3): Daily Mess Count = 2, Rate = 500, Formula = "=A3*B3" -> 1000
    // Row 2 (Excel 4): Other = 300, Total = "=C2+C3" -> 1500
    const rawGrid = [
      [1, 500, '=A2*B2'],
      [2, 500, '=A3*B3'],
      [300, 0, '=C2+C3'],
    ]

    const evaluated = evaluateGridFormulas(rawGrid)
    assert.equal(evaluated[0][2], 500)
    assert.equal(evaluated[1][2], 1000)
    assert.equal(evaluated[2][2], 1500)
  })

  it('populates bar charts when calculated columns contain formula strings', () => {
    const columns = [
      { title: 'Date', type: 'text' },
      { title: 'Mess Count', type: 'numeric' },
      { title: 'Mess Cost (Rs.)', type: 'numeric' },
      { title: 'Other Expenses (Rs.)', type: 'numeric' },
      { title: 'Total Daily Expense (Rs.)', type: 'numeric' },
    ]

    // Rows where Mess Cost is calculated from count * 500, and Total Daily Expense is calculated with formula
    const data = [
      ['2025-11-01', 1, '=B2*500', 200, '=C2+D2'],
      ['2025-11-02', 0, '=B3*500', 450, '=C3+D3'],
      ['2025-11-03', 1, '=B4*500', 100, '=C4+D4'],
      ['2025-11-04', 1, '=B5*500', 300, '=C5+D5'],
    ]

    const recommendation: ChartRecommendation = {
      id: 'daily-expense-chart',
      title: 'Daily Expense Trend',
      description: 'Daily expenditures over time',
      chartType: 'bar',
      xAxisColumn: 'Date',
      // Notice: AI recommendation often omits units or slightly varies header text:
      yAxisColumns: ['Total Daily Expense'],
      aggregation: 'sum',
      explanation: 'Shows daily total expenses',
    }

    const result = buildChartDataAndOption(recommendation, columns, data)

    // Verify option has non-empty series with non-zero values
    const seriesList = result.echartsOption.series as any[]
    assert.ok(seriesList && seriesList.length > 0, 'Series list must not be empty')
    const primarySeries = seriesList[0]
    assert.ok(primarySeries.data && primarySeries.data.length === 4, 'Series data must have 4 data points')

    // Nov 1: 500 + 200 = 700
    // Nov 2: 0 + 450 = 450
    // Nov 3: 500 + 100 = 600
    // Nov 4: 500 + 300 = 800
    assert.deepEqual(primarySeries.data, [700, 450, 600, 800])
    assert.equal(result.calculatedPoints, 4)
  })

  it('matches columns flexibly when AI recommendation omits units or brackets', () => {
    const columns = [
      { title: 'Category Name', type: 'text' },
      { title: 'Mess Cost (Rs.)', type: 'numeric' },
      { title: 'Transport ($)', type: 'numeric' },
    ]

    const dummyData = [
      ['Food', 500, 20],
      ['Transport', 150, 10],
    ]

    // Test findBestColumnIndex (targetTitle, columns, data)
    assert.equal(findBestColumnIndex('Mess Cost', columns, dummyData), 1)
    assert.equal(findBestColumnIndex('Mess Cost (Rs.)', columns, dummyData), 1)
    assert.equal(findBestColumnIndex('mess cost (rs)', columns, dummyData), 1)
    assert.equal(findBestColumnIndex('Transport', columns, dummyData), 2)
    assert.equal(findBestColumnIndex('Category', columns, dummyData), 0)
  })

  it('guarantees pie chart has non-empty slices even when values are calculated from formulas', () => {
    const columns = [
      { title: 'Category', type: 'text' },
      { title: 'Amount (PKR)', type: 'numeric' },
    ]

    const data = [
      ['Mess Food', '=500*12'], // 6000
      ['Transport', '=250*4'],  // 1000
      ['Shopping', '=1500+500'], // 2000
      ['Utilities', 3000],
    ]

    const recommendation: ChartRecommendation = {
      id: 'category-breakdown',
      title: 'Expense Distribution',
      description: 'Breakdown of categories',
      chartType: 'pie',
      xAxisColumn: 'Category',
      yAxisColumns: ['Amount'],
      aggregation: 'sum',
      explanation: 'Proportion of spend per category',
    }

    const result = buildChartDataAndOption(recommendation, columns, data)
    const pieSeries = (result.echartsOption.series as any[])?.[0]
    assert.ok(pieSeries, 'Pie series must exist')
    assert.ok(pieSeries.data && pieSeries.data.length === 4, 'All 4 categories must have slices')

    const foodSlice = pieSeries.data.find((d: any) => d.name === 'Mess Food')
    assert.ok(foodSlice, 'Mess Food slice must exist')
    assert.equal(foodSlice.value, 6000)

    const transportSlice = pieSeries.data.find((d: any) => d.name === 'Transport')
    assert.ok(transportSlice, 'Transport slice must exist')
    assert.equal(transportSlice.value, 1000)
  })

  it('ensures analyzeSheet detects formula columns as quantitative metrics', () => {
    const columns = [
      { title: 'Date', type: 'text' },
      { title: 'Units', type: 'numeric' },
      { title: 'Revenue', type: 'text' }, // Raw type might be text due to formulas
    ]
    const data = [
      ['2025-11-01', 10, '=B2*100'],
      ['2025-11-02', 15, '=B3*100'],
      ['2025-11-03', 20, '=B4*100'],
    ]

    const analysis = analyzeSheet('Sales', columns, data)
    assert.equal(analysis.isSuitableForVisualization, true)

    const revenueCol = analysis.columns.find((c) => c.title === 'Revenue')
    assert.ok(revenueCol, 'Revenue column must be analyzed')
    assert.equal(revenueCol.detectedRole, 'quantitative')
    assert.equal(revenueCol.isNumeric, true)
    assert.ok(revenueCol.stats?.sum && revenueCol.stats.sum > 0, 'Stats sum must be evaluated')
    assert.equal(revenueCol.stats?.sum, 4500)
  })

  it('guarantees fallback series when yAxisColumns is completely unspecified or not matching', () => {
    const columns = [
      { title: 'Item', type: 'text' },
      { title: 'Quantity', type: 'numeric' },
      { title: 'Price', type: 'numeric' },
    ]
    const data = [
      ['Apples', 10, 2],
      ['Bananas', 20, 1.5],
      ['Oranges', 15, 3],
    ]

    const recommendation: ChartRecommendation = {
      id: 'fallback-test',
      title: 'Item Quantities',
      description: 'Quantities',
      chartType: 'bar',
      xAxisColumn: 'Item',
      yAxisColumns: ['NonExistentMetricColumn'], // AI hallucinated column name
      aggregation: 'sum',
      explanation: 'Fallback test',
    }

    const result = buildChartDataAndOption(recommendation, columns, data)
    const seriesList = result.echartsOption.series as any[]
    assert.ok(seriesList && seriesList.length > 0, 'Should fall back to numeric column and NOT produce empty chart')
    assert.ok(seriesList[0].data.length > 0, 'Series data must be populated')
    assert.ok(seriesList[0].data.some((val: number) => val > 0), 'Data points must be non-zero')
  })
})
