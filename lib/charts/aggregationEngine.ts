import type { EChartsOption } from 'echarts'
import { ChartRecommendation, ProcessedChartData } from './types'
import { parseNumericValue, isSummaryRow } from './analysisEngine'

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
  const t = title.toLowerCase()
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
  const colIndexMap = new Map<string, number>()
  columns.forEach((col, idx) => {
    colIndexMap.set(col.title.toLowerCase().trim(), idx)
  })

  // Exclude summary row if present
  let effectiveData = data
  if (data.length > 0 && isSummaryRow(data[data.length - 1])) {
    effectiveData = data.slice(0, data.length - 1)
  }

  const xColTitle = recommendation.xAxisColumn
  const xColIdx = colIndexMap.get(xColTitle.toLowerCase().trim()) ?? 0

  const yColTitles = recommendation.yAxisColumns
  const yColIndices = yColTitles.map((title) => ({
    title,
    idx: colIndexMap.get(title.toLowerCase().trim()) ?? -1,
  })).filter((item) => item.idx !== -1)

  if (yColIndices.length === 0) {
    // Fallback: pick first numeric column
    const fallbackIdx = columns.findIndex((c, i) => i !== xColIdx && c.type === 'numeric')
    if (fallbackIdx !== -1) {
      yColIndices.push({ title: columns[fallbackIdx].title, idx: fallbackIdx })
    }
  }

  // 1. Group & Aggregate Data
  const { chartType, aggregation } = recommendation

  let categories: string[] = []
  const seriesDataMap = new Map<string, number[]>()
  yColIndices.forEach((y) => seriesDataMap.set(y.title, []))

  // Pie chart aggregation (single metric vs category)
  if (chartType === 'pie') {
    const primaryY = yColIndices[0]
    const grouped = new Map<string, { sum: number; count: number }>()

    effectiveData.forEach((row) => {
      if (!Array.isArray(row)) return
      const catVal = String(row[xColIdx] ?? 'Uncategorized').trim()
      const rawVal = primaryY ? row[primaryY.idx] : null
      const numVal = parseNumericValue(rawVal) ?? 0

      const curr = grouped.get(catVal) || { sum: 0, count: 0 }
      curr.sum += numVal
      curr.count += 1
      grouped.set(catVal, curr)
    })

    // Take top 8 categories, group rest as "Other"
    const sortedEntries = Array.from(grouped.entries())
      .filter(([cat]) => cat !== '')
      .sort((a, b) => b[1].sum - a[1].sum)

    const pieData: Array<{ name: string; value: number }> = []
    let otherSum = 0

    sortedEntries.forEach(([cat, stats], idx) => {
      const val = aggregation === 'average' && stats.count > 0 ? parseFloat((stats.sum / stats.count).toFixed(2)) : parseFloat(stats.sum.toFixed(2))
      if (idx < 7) {
        pieData.push({ name: cat, value: val })
      } else {
        otherSum += val
      }
    })

    if (otherSum > 0) {
      pieData.push({ name: 'Other', value: parseFloat(otherSum.toFixed(2)) })
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
            ${params.marker} Value: <strong>${valFormatted}</strong> (${params.percent}%)
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
          center: ['50%', '52%'],
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

  // Scatter chart (X metric vs Y metric)
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
        top: '20%',
        right: '6%',
        bottom: '15%',
        left: '10%',
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

  // Bar, Line, or Area Chart Aggregation
  if (aggregation === 'none') {
    // Use raw rows
    categories = effectiveData.map((row) => (Array.isArray(row) ? String(row[xColIdx] ?? '') : ''))
    yColIndices.forEach((y) => {
      const vals = effectiveData.map((row) => (Array.isArray(row) ? parseNumericValue(row[y.idx]) ?? 0 : 0))
      seriesDataMap.set(y.title, vals)
    })
  } else {
    // Group by X dimension
    const groupedMap = new Map<string, Map<string, { sum: number; count: number; min: number; max: number }>>()

    effectiveData.forEach((row) => {
      if (!Array.isArray(row)) return
      const catVal = String(row[xColIdx] ?? 'Uncategorized').trim()
      if (!catVal) return

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

    // Limit categories if too many (keep first 20 or top 20 by first metric)
    if (categories.length > 25 && chartType === 'bar') {
      const primaryMetric = yColIndices[0].title
      categories.sort((a, b) => {
        const valA = groupedMap.get(a)?.get(primaryMetric)?.sum ?? 0
        const valB = groupedMap.get(b)?.get(primaryMetric)?.sum ?? 0
        return valB - valA
      })
      categories = categories.slice(0, 20)
    }

    // Populate series
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

  // Construct series configurations
  const isHorizontal = recommendation.options?.horizontal && chartType === 'bar'
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
      baseSeries.showSymbol = categories.length <= 30
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

  // Determine tooltip unit
  const primaryUnit = yColIndices[0] ? detectUnit(yColIndices[0].title) : { prefix: '', suffix: '' }

  const categoryAxis = {
    type: 'category' as const,
    data: categories,
    axisLabel: {
      rotate: categories.length > 8 && !isHorizontal ? 35 : 0,
      fontSize: 11,
      color: '#475569',
      formatter: (val: string) => (val.length > 18 ? `${val.substring(0, 16)}...` : val),
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
          const formatted = `${u.prefix}${p.value?.toLocaleString()}${u.suffix}`
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
      bottom: categories.length > 8 && !isHorizontal ? 60 : 35,
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
