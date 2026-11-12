import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai'
import {
  AIChartResponse,
  ChartRecommendation,
  SheetAnalysis,
  WorkbookAnalysisResult,
} from './types'

// Tool Declaration for Gemini Function Calling
const recommendChartsFunctionDeclaration: FunctionDeclaration = {
  name: 'recommend_spreadsheet_charts',
  description: 'Recommends 1 to 4 distinct, meaningful, professional charts for the analyzed spreadsheet data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      isSuitableForVisualization: {
        type: Type.BOOLEAN,
        description: 'Whether the spreadsheet data is suitable for visual charting.',
      },
      unsuitabilityReason: {
        type: Type.STRING,
        description: 'If not suitable, a clear explanation why visualization is not recommended.',
      },
      overallInsight: {
        type: Type.STRING,
        description: 'A 1-2 sentence high-level executive summary of the primary insights in this workbook.',
      },
      charts: {
        type: Type.ARRAY,
        description: 'Array of recommended chart configurations.',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'Unique identifier for the chart' },
            title: { type: Type.STRING, description: 'Clear, informative title for the chart' },
            description: { type: Type.STRING, description: 'Subtitle or brief explanation of what the chart displays' },
            chartType: {
              type: Type.STRING,
              enum: ['bar', 'line', 'pie', 'scatter', 'histogram', 'area'],
              description: 'The best chart type for this perspective',
            },
            xAxisColumn: { type: Type.STRING, description: 'Exact column name for the dimension/X-axis' },
            yAxisColumns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exact column name(s) for the metric/Y-axis',
            },
            aggregation: {
              type: Type.STRING,
              enum: ['sum', 'average', 'count', 'min', 'max', 'none'],
              description: 'Mathematical aggregation method to group metric values',
            },
            explanation: {
              type: Type.STRING,
              description: 'Reasoning explaining why this specific chart type and dimensions provide analytical value',
            },
            options: {
              type: Type.OBJECT,
              properties: {
                stacked: { type: Type.BOOLEAN },
                donut: { type: Type.BOOLEAN },
                smooth: { type: Type.BOOLEAN },
                horizontal: { type: Type.BOOLEAN },
              },
            },
          },
          required: ['id', 'title', 'chartType', 'xAxisColumn', 'yAxisColumns', 'aggregation', 'explanation'],
        },
      },
    },
    required: ['isSuitableForVisualization', 'overallInsight', 'charts'],
  },
}

// Deterministic rule-based recommender fallback
export function generateRuleBasedRecommendations(analysis: SheetAnalysis): AIChartResponse {
  if (!analysis.isSuitableForVisualization) {
    return {
      isSuitableForVisualization: false,
      unsuitabilityReason: analysis.unsuitabilityReason || 'Dataset lacks sufficient structure or numeric metrics for meaningful visualization.',
      overallInsight: 'No visualizations recommended for this spreadsheet.',
      charts: [],
    }
  }

  const quantCols = analysis.columns.filter((c) => c.detectedRole === 'quantitative')
  const tempCol = analysis.columns.find((c) => c.detectedRole === 'temporal')
  const catCols = analysis.columns.filter(
    (c) => c.detectedRole === 'categorical' && c.distinctCount >= 2 && c.distinctCount <= 25
  )

  const charts: ChartRecommendation[] = []

  // 1. If temporal column exists, create a time-series Line/Area chart
  if (tempCol && quantCols.length > 0) {
    // Pick the most relevant metric (prefer Daily Total, Total, Cost, Amount, Revenue)
    const preferredMetric =
      quantCols.find((c) => /total|cost|revenue|amount|spend|arr|mrr|price/i.test(c.title)) || quantCols[0]

    charts.push({
      id: 'time-series-trend',
      title: `${preferredMetric.title} Trend over ${tempCol.title}`,
      description: `Tracks temporal variation and daily spending/values across ${tempCol.title}`,
      chartType: 'area',
      xAxisColumn: tempCol.title,
      yAxisColumns: [preferredMetric.title],
      aggregation: 'none',
      explanation: `Line/Area charts are ideal for temporal progression along ${tempCol.title}, revealing momentum, peaks, and troughs.`,
      options: { smooth: true },
    })
  }

  // 2. If categorical column exists, create a Category Breakdown Bar or Pie chart
  if (catCols.length > 0 && quantCols.length > 0) {
    const primaryCat = catCols[0]
    const metricCol =
      quantCols.find((c) => !/running total|cumulative/i.test(c.title)) || quantCols[0]

    if (primaryCat.distinctCount >= 2 && primaryCat.distinctCount <= 7) {
      charts.push({
        id: 'category-pie-breakdown',
        title: `${metricCol.title} Share by ${primaryCat.title}`,
        description: `Proportional distribution across ${primaryCat.distinctCount} groups`,
        chartType: 'pie',
        xAxisColumn: primaryCat.title,
        yAxisColumns: [metricCol.title],
        aggregation: 'sum',
        explanation: `With ${primaryCat.distinctCount} distinct categories, a donut chart highlights relative budget/volume distribution without clutter.`,
        options: { donut: true },
      })
    }

    // Also a bar comparison
    charts.push({
      id: 'category-bar-comparison',
      title: `${metricCol.title} Comparison across ${primaryCat.title}`,
      description: `Ranked aggregate totals for each ${primaryCat.title}`,
      chartType: 'bar',
      xAxisColumn: primaryCat.title,
      yAxisColumns: [metricCol.title],
      aggregation: 'sum',
      explanation: `Bar charts provide precise comparative ranking across ${primaryCat.title} categories.`,
      options: { horizontal: primaryCat.distinctCount > 6 },
    })
  }

  // 3. If multiple quantitative metrics exist without category, create multi-metric comparison
  if (charts.length < 2 && quantCols.length >= 2) {
    const xCol = catCols[0]?.title || tempCol?.title || analysis.columns[0].title
    const metricsToPlot = quantCols.slice(0, 3).map((c) => c.title)

    charts.push({
      id: 'multi-metric-comparison',
      title: `${metricsToPlot.join(' vs ')} Comparison`,
      description: `Side-by-side metric comparison across ${xCol}`,
      chartType: 'bar',
      xAxisColumn: xCol,
      yAxisColumns: metricsToPlot,
      aggregation: 'sum',
      explanation: `Grouped bar chart allows immediate cross-metric evaluation for ${metricsToPlot.join(' and ')}.`,
      options: { stacked: false },
    })
  }

  // Ensure unique IDs
  const finalCharts = charts.slice(0, 3).map((chart, idx) => ({
    ...chart,
    id: `chart-${idx + 1}-${Date.now()}`,
  }))

  return {
    isSuitableForVisualization: true,
    overallInsight: `Spreadsheet contains ${analysis.rowCount} rows across ${quantCols.length} quantitative metrics and ${catCols.length + (tempCol ? 1 : 0)} dimensions. Visualizations focus on key distributions and trends.`,
    charts: finalCharts,
  }
}

// AI Recommender using Gemini Function/Tool Calling
export async function recommendChartsWithAI(
  workbookAnalysis: WorkbookAnalysisResult,
  sampleRows: Array<Array<unknown>>
): Promise<AIChartResponse> {
  const activeSheet = workbookAnalysis.activeSheet

  if (!activeSheet.isSuitableForVisualization) {
    return {
      isSuitableForVisualization: false,
      unsuitabilityReason: activeSheet.unsuitabilityReason,
      overallInsight: 'No charts recommended for this dataset.',
      charts: [],
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.info('GEMINI_API_KEY missing, using deterministic rule-based chart recommender')
    return generateRuleBasedRecommendations(activeSheet)
  }

  // Build compact statistical profile to minimize token consumption
  const columnProfiles = activeSheet.columns.map((c) => ({
    index: c.index,
    title: c.title,
    detectedType: c.detectedType,
    detectedRole: c.detectedRole,
    distinctCount: c.distinctCount,
    sampleValues: c.sampleValues.slice(0, 3),
    stats: c.stats,
  }))

  const promptContext = {
    workbookTitle: workbookAnalysis.title,
    sheetName: activeSheet.sheetName,
    rowCount: activeSheet.rowCount,
    colCount: activeSheet.colCount,
    hasSummaryRow: activeSheet.hasSummaryRow,
    columns: columnProfiles,
    sampleRows: sampleRows.slice(0, 10),
  }

  const systemInstruction = `You are Metron's Senior Data Visualization and BI Architect.
Your task is to analyze spreadsheet structure and recommend 1 to 4 distinct, professional, impactful charts.

Guidelines:
1. SELECT THE BEST CHART TYPES:
   - "line" or "area" for temporal trends (Date, Day, Month, Year).
   - "bar" for categorical comparisons and rankings.
   - "pie" ONLY for parts-to-whole distributions with 3 to 7 categories.
   - "scatter" for correlation between two continuous metrics.
2. AVOID MISLEADING VISUALIZATIONS:
   - NEVER plot identifier columns (ID, SKU, serial number) as quantitative metrics.
   - NEVER plot running totals or cumulative sums in pie charts.
   - If there is a summary row (Total, Grand Total), do not plot it alongside individual line items.
3. Keep the recommendations meaningful, uncluttered, and insightful.
4. If data is unsuitable, set isSuitableForVisualization to false and state why.`

  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.5-flash']

  const ai = new GoogleGenAI({ apiKey })

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Analyze this spreadsheet and recommend the best visualization charts:\n${JSON.stringify(promptContext)}`,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [recommendChartsFunctionDeclaration] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY' as any,
              allowedFunctionNames: ['recommend_spreadsheet_charts'],
            },
          },
        },
      })

      // Check for function call in response
      const candidates = response.candidates
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts
        if (parts) {
          for (const part of parts) {
            if (part.functionCall && part.functionCall.name === 'recommend_spreadsheet_charts') {
              const args = part.functionCall.args as unknown as AIChartResponse
              if (args && Array.isArray(args.charts) && args.charts.length > 0) {
                // Ensure chart IDs
                args.charts = args.charts.map((c, i) => ({
                  ...c,
                  id: c.id || `ai-chart-${i + 1}-${Date.now()}`,
                }))
                return args
              }
            }
          }
        }
      }

      // Check if response text has JSON fallback
      const text = response.text?.trim()
      if (text) {
        try {
          const parsed = JSON.parse(text) as AIChartResponse
          if (parsed && Array.isArray(parsed.charts) && parsed.charts.length > 0) {
            return parsed
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn(`Chart AI model ${model} failed, trying next:`, err instanceof Error ? err.message : err)
    }
  }

  // Fallback to deterministic rule-based engine
  console.info('Falling back to rule-based chart recommender')
  return generateRuleBasedRecommendations(activeSheet)
}
