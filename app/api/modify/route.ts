import { NextResponse } from 'next/server'
import { runMetronAgent } from '@/lib/agent/metronAgent'
import { buildChartDataAndOption } from '@/lib/charts/aggregationEngine'
import { ProcessedChartData } from '@/lib/charts/types'
import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { spreadsheet, instruction } = body

    if (!instruction || !spreadsheet) {
      return NextResponse.json({ error: 'Missing spreadsheet or instruction' }, { status: 400 })
    }

    const agentResult = await runMetronAgent({
      task: 'modify',
      prompt: instruction,
      currentSpreadsheet: {
        title: spreadsheet.title || 'Untitled',
        columns: (spreadsheet.columns || []) as ColumnDef[],
        data: spreadsheet.data || [],
        metadata: spreadsheet.metadata || {},
      },
    })

    const finalSheet = agentResult.spreadsheet || spreadsheet

    let processedCharts: ProcessedChartData[] | undefined = undefined
    if (agentResult.charts && finalSheet) {
      processedCharts = agentResult.charts
        .map((rec) => {
          try {
            return buildChartDataAndOption(rec, finalSheet.columns, finalSheet.data)
          } catch {
            return null
          }
        })
        .filter((c): c is ProcessedChartData => c !== null)
    }

    return NextResponse.json({
      success: true,
      message: agentResult.message,
      steps: agentResult.stepsExecuted,
      spreadsheet: finalSheet,
      charts: processedCharts,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to modify spreadsheet' },
      { status: 500 }
    )
  }
}
