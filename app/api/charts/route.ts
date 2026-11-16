import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProcessedChartData } from '@/lib/charts/types'
import { mapRowToProcessedChart, chartToDbRow } from '@/lib/charts/chartPersistence'

export { mapRowToProcessedChart, chartToDbRow }

// GET /api/charts?spreadsheetId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const spreadsheetId = searchParams.get('spreadsheetId')

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheetId parameter' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .eq('spreadsheet_id', spreadsheetId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const charts = (data || []).map(mapRowToProcessedChart)
    return NextResponse.json({ success: true, charts })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch charts' },
      { status: 500 }
    )
  }
}

// POST /api/charts - Save or update chart(s)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { spreadsheetId, charts, chart } = body

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Determine charts list to process
    const chartsToSave: ProcessedChartData[] = Array.isArray(charts)
      ? charts
      : chart
      ? [chart]
      : []

    if (chartsToSave.length === 0) {
      return NextResponse.json({ success: true, count: 0, charts: [] })
    }

    // Map each ProcessedChartData into a database record
    const rows = chartsToSave.map((c) => chartToDbRow(c, spreadsheetId, user?.id || null))

    // Upsert with onConflict on unique constraint (spreadsheet_id, chart_id)
    // to strictly avoid duplicate entries!
    const { data: savedRows, error } = await supabase
      .from('charts')
      .upsert(rows, {
        onConflict: 'spreadsheet_id,chart_id',
      })
      .select('*')

    if (error) {
      console.error('Error upserting charts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update spreadsheet metadata snapshot as synchronized fallback
    try {
      const { data: sheet } = await supabase
        .from('spreadsheets')
        .select('metadata')
        .eq('id', spreadsheetId)
        .single()

      if (sheet) {
        const updatedMeta = {
          ...(sheet.metadata || {}),
          charts: chartsToSave,
          chartCount: chartsToSave.length,
          hasCharts: chartsToSave.length > 0,
        }
        await supabase
          .from('spreadsheets')
          .update({ metadata: updatedMeta })
          .eq('id', spreadsheetId)
      }
    } catch (metaErr) {
      console.warn('Could not update spreadsheet metadata chart snapshot:', metaErr)
    }

    const savedCharts = (savedRows || []).map(mapRowToProcessedChart)
    return NextResponse.json({ success: true, count: savedCharts.length, charts: savedCharts })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save charts' },
      { status: 500 }
    )
  }
}

// DELETE /api/charts?spreadsheetId=...&chartId=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const spreadsheetId = searchParams.get('spreadsheetId')
    const chartId = searchParams.get('chartId')

    if (!spreadsheetId || !chartId) {
      return NextResponse.json({ error: 'Missing spreadsheetId or chartId' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('charts')
      .delete()
      .eq('spreadsheet_id', spreadsheetId)
      .eq('chart_id', chartId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Synchronize spreadsheet metadata
    try {
      const { data: remaining } = await supabase
        .from('charts')
        .select('*')
        .eq('spreadsheet_id', spreadsheetId)

      const remainingCharts = (remaining || []).map(mapRowToProcessedChart)

      const { data: sheet } = await supabase
        .from('spreadsheets')
        .select('metadata')
        .eq('id', spreadsheetId)
        .single()

      if (sheet) {
        await supabase
          .from('spreadsheets')
          .update({
            metadata: {
              ...(sheet.metadata || {}),
              charts: remainingCharts,
              chartCount: remainingCharts.length,
              hasCharts: remainingCharts.length > 0,
            },
          })
          .eq('id', spreadsheetId)
      }
    } catch (metaErr) {
      console.warn('Metadata sync after chart delete skipped:', metaErr)
    }

    return NextResponse.json({ success: true, deletedChartId: chartId })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete chart' },
      { status: 500 }
    )
  }
}
