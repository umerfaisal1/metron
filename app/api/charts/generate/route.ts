import { NextResponse } from 'next/server'
import { analyzeWorkbook } from '@/lib/charts/analysisEngine'
import { recommendChartsWithAI } from '@/lib/charts/aiChartEngine'
import { buildChartDataAndOption } from '@/lib/charts/aggregationEngine'
import { ProcessedChartData } from '@/lib/charts/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title = 'Workbook', columns = [], data = [] } = body

    if (!Array.isArray(columns) || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid payload: columns and data arrays are required.' },
        { status: 400 }
      )
    }

    // 1. Analyze workbook structure & data types
    const workbookAnalysis = analyzeWorkbook(
      title,
      [{ name: 'Sheet1', columns, data }],
      0
    )

    const activeSheet = workbookAnalysis.activeSheet

    if (!activeSheet.isSuitableForVisualization) {
      return NextResponse.json({
        success: true,
        isSuitableForVisualization: false,
        unsuitabilityReason: activeSheet.unsuitabilityReason,
        overallInsight: 'No visualizations recommended for this spreadsheet.',
        analysis: activeSheet,
        charts: [],
      })
    }

    // 2. Recommend charts using Gemini Function Calling (with rule-based fallback)
    const aiResponse = await recommendChartsWithAI(workbookAnalysis, data)

    if (!aiResponse.isSuitableForVisualization || !aiResponse.charts || aiResponse.charts.length === 0) {
      return NextResponse.json({
        success: true,
        isSuitableForVisualization: false,
        unsuitabilityReason: aiResponse.unsuitabilityReason || 'No suitable chart perspectives found for this dataset.',
        overallInsight: aiResponse.overallInsight || 'Data structure does not support meaningful charting.',
        analysis: activeSheet,
        charts: [],
      })
    }

    // 3. Deterministically aggregate data and build complete ECharts options
    const processedCharts: ProcessedChartData[] = aiResponse.charts
      .map((recommendation) => {
        try {
          return buildChartDataAndOption(recommendation, columns, data)
        } catch (err) {
          console.warn(`Error building chart ${recommendation.id}:`, err)
          return null
        }
      })
      .filter((chart): chart is ProcessedChartData => chart !== null)

    return NextResponse.json({
      success: true,
      isSuitableForVisualization: true,
      overallInsight: aiResponse.overallInsight,
      analysis: activeSheet,
      charts: processedCharts,
    })
  } catch (err: unknown) {
    console.error('API /api/charts/generate error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate charts' },
      { status: 500 }
    )
  }
}
