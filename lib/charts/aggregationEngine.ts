import type { EChartsOption } from 'echarts'
import { ChartRecommendation, ProcessedChartData } from './types'
import { isSummaryRow } from './analysisEngine'
import {
  parseNumericValue,
  evaluateGridFormulas,
  findBestColumnIndex,
} from './formulaEvaluator'

export const METRON_PALETTE = [
  '#107C41', // Metron Forest Green
  '#20B26B', // Vibrant Mint
  '#0284C7', // Sky Blue
  '#F59E0B', // Amber Gold
  '#8B5CF6', // Purple
  '#F43F5E', // Coral Rose
  '#0D9488', // Teal
  '#475569', // Slate
  '#EC4899', // Pink
  '#EAB308', // Yellow
]

// Determine unit prefix/suffix from column title
function detectUnit(title: string): { prefix: string; suffix: string } {
  const t = (title || '').toLowerCase()
  if (t.includes('rs.') || t.includes('rs ') || t.includes('(rs)')) return { prefix: 'Rs. ', suffix: '' }
  if (t.includes('$')) return { prefix: '$', suffix: '' }
  if (t.includes('€')) return { prefix: '€', suffix: '' }
  if (t.includes('£')) return { prefix: '£', suffix: '' }
  if (t.includes('%') || t.includes('percent')) return { prefix: '', suffix: '%' }
  return { prefix: '', suffix: '' }
}

export function buildChartDataAndOption(
  recommendation: ChartRecommendation,
  columns: Array<{ title: string; type?: string }>,
  data: Array<Array<unknown>>
): ProcessedChartData {
  // 1. Evaluate formula cells in data so downstream aggregations operate on real numbers
  const evaluatedData = evaluateGridFormulas(data)

  // 2. Exclude summary/total row from plotting if present at bottom
  let effectiveData = evaluatedData
  if (effectiveData.length > 1 && isSummaryRow(effectiveData[effectiveData.length - 1])) {
    effectiveData = effectiveData.slice(0, effectiveData.length - 1)
  }

  // 3. Resolve Y (Metric) Columns with smart fuzzy matching
  const requestedY = Array.isArray(recommendation.yAxisColumns) && recommendation.yAxisColumns.length > 0
    ? recommendation.yAxisColumns
    : ['Value']

  const yColIndices: Array<{ title: string; idx: number }> = []
  const usedYIndices = new Set<number>()

  for (const reqTitle of requestedY) {
    const matchedIdx = findBestColumnIndex(reqTitle, columns, effectiveData, {
      isQuantitative: true,
      excludeIndices: usedYIndices,
    })
    if (matchedIdx !== -1) {
      yColIndices.push({
        title: columns[matchedIdx]?.title || reqTitle,
        idx: matchedIdx,
      })
      usedYIndices.add(matchedIdx)
    }
  }

  // Fallback: If no Y columns matched, find the best quantitative columns in data
  if (yColIndices.length === 0) {
    const fallbackIdx = findBestColumnIndex('', columns, effectiveData, {
      isQuantitative: true,
    })
    if (fallbackIdx !== -1) {
      yColIndices.push({
        title: columns[fallbackIdx]?.title || 'Metric',
        idx: fallbackIdx,
      })
      usedYIndices.add(fallbackIdx)
    }
  }

  // Final fallback: any column with numbers
  if (yColIndices.length === 0) {
    for (let c = 0; c < columns.length; c++) {
      let numCount = 0
      for (const row of effectiveData) {
        if (Array.isArray(row) && parseNumericValue(row[c]) !== null) numCount++
      }
      if (numCount > 0) {
        yColIndices.push({ title: columns[c]?.title || `Column ${c + 1}`, idx: c })
        usedYIndices.add(c)
        break
      }
    }
  }

  // 4. Resolve X (Dimension) Column with smart fuzzy matching
  const isTemporal = recommendation.chartType === 'line' || recommendation.chartType === 'area'
  let xColIdx = findBestColumnIndex(recommendation.xAxisColumn, columns, effectiveData, {
    isTemporal,
    isCategorical: true,
    excludeIndices: usedYIndices,
  })

  // Fallback: find any column not used as Y
  if (xColIdx === -1) {
    for (let c = 0; c < columns.length; c++) {
      if (!usedYIndices.has(c)) {
        xColIdx = c
        break
      }
    }
    if (xColIdx === -1) xColIdx = 0
  }

  const xColTitle = columns[xColIdx]?.title || recommendation.xAxisColumn || 'Category'

  // 5. Aggregate Data
  const { chartType, aggregation } = recommendation

  let categories: string[] = []
  const seriesDataMap = new Map<string, number[]>()
  yColIndices.forEach((y) => seriesDataMap.set(y.title, []))

  // ── Pie chart aggregation (single metric vs category) ──────────────────────
  if (chartType === 'pie') {
    const primaryY = yColIndices[0]
    const grouped = new Map<string, { sum: number; count: number }>()

    effectiveData.forEach((row) => {
      if (!Array.isArray(row)) return
      const catVal = String(row[xColIdx] ?? 'Uncategorized').trim()
      if (!catVal) return

      const rawVal = primaryY ? row[primaryY.idx] : null
      const numVal = parseNumericValue(rawVal) ?? 0

      const curr = grouped.get(catVal) || { sum: 0, count: 0 }
      curr.sum += numVal
      curr.count += 1
      grouped.set(catVal, curr)
    })

    // Check if all sums are 0; if so, fallback to counting items per category
    const totalSum = Array.from(grouped.values()).reduce((acc, v) => acc + Math.abs(v.sum), 0)
    const useCount = totalSum === 0 || aggregation === 'count'

    // Sort categories descending by value
    const sortedEntries = Array.from(grouped.entries())
      .filter(([cat]) => cat !== '')
      .sort((a, b) => (useCount ? b[1].count - a[1].count : b[1].sum - a[1].sum))

    const pieData: Array<{ name: string; value: number }> = []
    let otherVal = 0

    sortedEntries.forEach(([cat, stats], idx) => {
      let val = useCount
        ? stats.count
        : aggregation === 'average' && stats.count > 0
        ? parseFloat((stats.sum / stats.count).toFixed(2))
        : parseFloat(stats.sum.toFixed(2))

      val = Math.max(0, val) // Pie charts require non-negative values

      if (idx < 7) {
        pieData.push({ name: cat, value: val })
      } else {
        otherVal += val
      }
    })

    if (otherVal > 0) {
      pieData.push({ name: 'Other', value: parseFloat(otherVal.toFixed(2)) })
    }

    const unit = primaryY ? detectUnit(primaryY.title) : { prefix: '', suffix: '' }

    const echartsOption: EChartsOption = {
      title: {
        text: recommendation.title,
        subtext: recommendation.description,
        left: 'center',
        top: 8,
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
        subtextStyle: { fontSize: 11, color: '#64748B' },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const valFormatted = `${unit.prefix}${params.value?.toLocaleString()}${unit.suffix}`
          return `<div style="font-family: inherit; font-size: 12px;">
            <strong>${params.name}</strong><br/>
            ${params.marker} ${primaryY ? primaryY.title : 'Value'}: <strong>${valFormatted}</strong> (${params.percent}%)
          </div>`
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 8,
        left: 'center',
        type: 'scroll',
        textStyle: { fontSize: 11, color: '#475569' },
      },
      color: recommendation.colorPalette || METRON_PALETTE,
      series: [
        {
          name: primaryY ? primaryY.title : 'Value',
          type: 'pie',
          radius: recommendation.options?.donut ? ['42%', '72%'] : '65%',
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: recommendation.options?.donut ? 6 : 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            fontSize: 11,
            color: '#334155',
          },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' },
          },
          data: pieData,
        },
      ],
    }

    return {
      recommendation,
      echartsOption,
      calculatedPoints: pieData.length,
    }
  }

  // ── Scatter chart (X metric vs Y metric) ──────────────────────────────────
  if (chartType === 'scatter') {
    const primaryY = yColIndices[0]
    const scatterPoints: Array<[number, number]> = []

    effectiveData.forEach((row) => {
      if (!Array.isArray(row)) return
      const xVal = parseNumericValue(row[xColIdx])
      const yVal = primaryY ? parseNumericValue(row[primaryY.idx]) : null
      if (xVal !== null && yVal !== null) {
        scatterPoints.push([xVal, yVal])
      }
    })

    const xUnit = detectUnit(xColTitle)
    const yUnit = primaryY ? detectUnit(primaryY.title) : { prefix: '', suffix: '' }

    const echartsOption: EChartsOption = {
      title: {
        text: recommendation.title,
        subtext: recommendation.description,
        left: 'center',
        top: 8,
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
        subtextStyle: { fontSize: 11, color: '#64748B' },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const pt = params.data as [number, number]
          return `<div style="font-family: inherit; font-size: 12px;">
            ${xColTitle}: <strong>${xUnit.prefix}${pt[0]?.toLocaleString()}${xUnit.suffix}</strong><br/>
            ${primaryY?.title}: <strong>${yUnit.prefix}${pt[1]?.toLocaleString()}${yUnit.suffix}</strong>
          </div>`
        },
      },
      grid: {
        top: '18%',
        right: '6%',
        bottom: '15%',
        left: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: xColTitle,
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
      },
      yAxis: {
        type: 'value',
        name: primaryY ? primaryY.title : 'Value',
        splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
      },
      color: recommendation.colorPalette || METRON_PALETTE,
      series: [
        {
          name: `${xColTitle} vs ${primaryY?.title}`,
          type: 'scatter',
          symbolSize: 10,
          data: scatterPoints,
          itemStyle: { color: METRON_PALETTE[0] },
        },
      ],
    }

    return {
      recommendation,
      echartsOption,
      calculatedPoints: scatterPoints.length,
    }
  }

  // ── Bar, Line, or Area Chart Aggregation ──────────────────────────────────
  if (aggregation === 'none') {
    // Direct row-by-row plotting without grouping
    categories = effectiveData.map((row, idx) => {
      if (!Array.isArray(row)) return `Row ${idx + 1}`
      const val = row[xColIdx]
      return val !== null && val !== undefined && String(val).trim() !== ''
        ? String(val).trim()
        : `Row ${idx + 1}`
    })

    yColIndices.forEach((y) => {
      const vals = effectiveData.map((row) => {
        if (!Array.isArray(row)) return 0
        return parseNumericValue(row[y.idx]) ?? 0
      })
      seriesDataMap.set(y.title, vals)
    })
  } else {
    // Group by X dimension
    const groupedMap = new Map<string, Map<string, { sum: number; count: number; min: number; max: number }>>()

    effectiveData.forEach((row, idx) => {
      if (!Array.isArray(row)) return
      let catVal = String(row[xColIdx] ?? '').trim()
      if (!catVal) catVal = `Item ${idx + 1}`

      if (!groupedMap.has(catVal)) {
        groupedMap.set(catVal, new Map())
      }
      const yMap = groupedMap.get(catVal)!

      yColIndices.forEach((y) => {
        const val = parseNumericValue(row[y.idx]) ?? 0
        const curr = yMap.get(y.title) || { sum: 0, count: 0, min: val, max: val }
        curr.sum += val
        curr.count += 1
        curr.min = Math.min(curr.min, val)
        curr.max = Math.max(curr.max, val)
        yMap.set(y.title, curr)
      })
    })

    categories = Array.from(groupedMap.keys())

    // If too many categories in a bar chart, sort by first metric and take top 20
    if (categories.length > 25 && chartType === 'bar' && yColIndices.length > 0) {
      const primaryMetric = yColIndices[0].title
      categories.sort((a, b) => {
        const valA = groupedMap.get(a)?.get(primaryMetric)?.sum ?? 0
        const valB = groupedMap.get(b)?.get(primaryMetric)?.sum ?? 0
        return valB - valA
      })
      categories = categories.slice(0, 20)
    }

    // Populate series values
    yColIndices.forEach((y) => {
      const seriesVals = categories.map((cat) => {
        const stats = groupedMap.get(cat)?.get(y.title)
        if (!stats) return 0
        if (aggregation === 'average') return stats.count > 0 ? parseFloat((stats.sum / stats.count).toFixed(2)) : 0
        if (aggregation === 'count') return stats.count
        if (aggregation === 'min') return stats.min
        if (aggregation === 'max') return stats.max
        return parseFloat(stats.sum.toFixed(2))
      })
      seriesDataMap.set(y.title, seriesVals)
    })
  }

  // Fallback check: if categories are empty, create default indices
  if (categories.length === 0) {
    categories = effectiveData.map((_, i) => `Point ${i + 1}`)
    yColIndices.forEach((y) => {
      seriesDataMap.set(y.title, effectiveData.map((r) => parseNumericValue(Array.isArray(r) ? r[y.idx] : null) ?? 0))
    })
  }

  // 6. Build series configurations
  const isHorizontal = Boolean(recommendation.options?.horizontal && chartType === 'bar')
  const isArea = chartType === 'area'
  const actualChartType = isArea ? 'line' : chartType

  const series = yColIndices.map((y, idx) => {
    const dataVals = seriesDataMap.get(y.title) || []
    const color = (recommendation.colorPalette && recommendation.colorPalette[idx]) || METRON_PALETTE[idx % METRON_PALETTE.length]

    const baseSeries: any = {
      name: y.title,
      type: actualChartType,
      data: dataVals,
      itemStyle: { color },
      emphasis: { focus: 'series' },
    }

    if (actualChartType === 'line') {
      baseSeries.smooth = recommendation.options?.smooth ?? true
      baseSeries.showSymbol = categories.length <= 35
      baseSeries.symbolSize = 6
      if (isArea) {
        baseSeries.areaStyle = {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color },
              { offset: 1, color: 'rgba(255, 255, 255, 0.05)' },
            ],
          },
        }
      }
    }

    if (actualChartType === 'bar') {
      baseSeries.barMaxWidth = 45
      baseSeries.itemStyle = {
        color,
        borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
      }
      if (recommendation.options?.stacked) {
        baseSeries.stack = 'total'
      }
    }

    return baseSeries
  })

  // 7. Axes & Layout
  const primaryUnit = yColIndices[0] ? detectUnit(yColIndices[0].title) : { prefix: '', suffix: '' }

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    axisLabel: {
      rotate: categories.length > 7 && !isHorizontal ? 30 : 0,
      fontSize: 11,
      color: '#475569',
      formatter: (val: string) => (val && val.length > 20 ? `${val.substring(0, 18)}…` : val),
    },
    axisTick: { alignWithLabel: true },
    splitLine: { show: false },
  }

  const valueAxis = {
    type: 'value' as const,
    name: yColIndices.length === 1 ? yColIndices[0].title : '',
    nameTextStyle: { fontSize: 11, color: '#64748B' },
    splitLine: { lineStyle: { type: 'dashed' as const, color: '#E2E8F0' } },
    axisLabel: {
      fontSize: 11,
      color: '#64748B',
      formatter: (val: number) => `${primaryUnit.prefix}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}${primaryUnit.suffix}`,
    },
  }

  const echartsOption: EChartsOption = {
    title: {
      text: recommendation.title,
      subtext: recommendation.description,
      left: 'left',
      top: 8,
      textStyle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
      subtextStyle: { fontSize: 11, color: '#64748B' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: actualChartType === 'line' ? 'line' : 'shadow' },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const header = `<strong>${params[0].axisValueLabel}</strong><br/>`
        const lines = params.map((p: any) => {
          const u = detectUnit(p.seriesName)
          const formatted = typeof p.value === 'number'
            ? `${u.prefix}${p.value.toLocaleString()}${u.suffix}`
            : p.value
          return `${p.marker} ${p.seriesName}: <strong>${formatted}</strong>`
        })
        return `<div style="font-family: inherit; font-size: 12px; line-height: 1.5;">${header}${lines.join('<br/>')}</div>`
      },
    },
    legend: {
      data: yColIndices.map((y) => y.title),
      top: 10,
      right: 10,
      type: 'scroll',
      textStyle: { fontSize: 11, color: '#475569' },
    },
    grid: {
      top: 60,
      right: 20,
      bottom: categories.length > 7 && !isHorizontal ? 65 : 35,
      left: 15,
      containLabel: true,
    },
    toolbox: {
      feature: {
        saveAsImage: { title: 'Save Image', pixelRatio: 2 },
        restore: { title: 'Reset' },
      },
      right: 15,
      top: 8,
      iconStyle: { borderColor: '#94A3B8' },
    },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    color: recommendation.colorPalette || METRON_PALETTE,
    series,
  }

  return {
    recommendation,
    echartsOption,
    calculatedPoints: categories.length,
  }
}
