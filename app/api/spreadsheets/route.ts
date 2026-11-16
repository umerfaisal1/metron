import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapRowToProcessedChart, chartToDbRow } from '@/lib/charts/chartPersistence'
import { ProcessedChartData } from '@/lib/charts/types'

// GET: list all spreadsheets or get single spreadsheet by ?id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (id) {
      const { data, error } = await supabase
        .from('spreadsheets')
        .select('id, title, prompt, columns, data, metadata, created_at, updated_at')
        .eq('id', id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Spreadsheet not found' }, { status: 404 })
      }

      // Fetch persistent charts for this spreadsheet
      let charts: ProcessedChartData[] = []
      try {
        const { data: chartRows } = await supabase
          .from('charts')
          .select('*')
          .eq('spreadsheet_id', id)
          .order('created_at', { ascending: true })

        if (chartRows && chartRows.length > 0) {
          charts = chartRows.map(mapRowToProcessedChart)
        } else if (Array.isArray(data.metadata?.charts)) {
          charts = data.metadata.charts
        }
      } catch (chartErr) {
        console.warn('Could not fetch charts for spreadsheet:', chartErr)
        if (Array.isArray(data.metadata?.charts)) {
          charts = data.metadata.charts
        }
      }

      return NextResponse.json({
        spreadsheet: {
          ...data,
          charts,
        },
      })
    }

    let query = supabase
      .from('spreadsheets')
      .select('id, title, prompt, columns, data, metadata, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (user?.id) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ spreadsheets: data || [] })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch spreadsheets' },
      { status: 500 }
    )
  }
}

// POST: save or update a spreadsheet and synchronize its charts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, title, prompt, columns, data, metadata, charts } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Consolidate metadata with chart snapshot
    const chartList: ProcessedChartData[] = Array.isArray(charts) ? charts : []
    const updatedMetadata = {
      ...(metadata || {}),
      ...(Array.isArray(charts)
        ? {
            charts: chartList,
            chartCount: chartList.length,
            hasCharts: chartList.length > 0,
          }
        : {}),
    }

    let targetSpreadsheet: any = null

    if (id && !id.startsWith('local-')) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('spreadsheets')
        .update({
          title: title || 'Untitled Spreadsheet',
          prompt: prompt || null,
          columns: columns || [],
          data: data || [],
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      targetSpreadsheet = updated
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from('spreadsheets')
        .insert({
          user_id: user?.id || null,
          title: title || 'Untitled Spreadsheet',
          prompt: prompt || null,
          columns: columns || [],
          data: data || [],
          metadata: updatedMetadata,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      targetSpreadsheet = inserted
    }

    // Synchronize normalized charts table if charts array was explicitly supplied
    if (Array.isArray(charts) && targetSpreadsheet?.id) {
      const spreadsheetId = targetSpreadsheet.id
      try {
        if (charts.length === 0) {
          // All charts were removed by the user
          await supabase.from('charts').delete().eq('spreadsheet_id', spreadsheetId)
        } else {
          const activeChartIds = charts.map((c: ProcessedChartData) => c.recommendation.id)

          // Delete any obsolete charts no longer present in active state
          if (activeChartIds.length > 0) {
            // Delete charts not in activeChartIds for this spreadsheet
            const { data: existingRows } = await supabase
              .from('charts')
              .select('chart_id')
              .eq('spreadsheet_id', spreadsheetId)

            if (existingRows && existingRows.length > 0) {
              const toDelete = existingRows
                .map((r) => r.chart_id)
                .filter((cid) => !activeChartIds.includes(cid))

              for (const delId of toDelete) {
                await supabase
                  .from('charts')
                  .delete()
                  .eq('spreadsheet_id', spreadsheetId)
                  .eq('chart_id', delId)
              }
            }
          }

          // Map each ProcessedChartData into a DB record and upsert
          const chartRows = charts.map((c: ProcessedChartData) =>
            chartToDbRow(c, spreadsheetId, user?.id || null)
          )

          const { error: upsertErr } = await supabase
            .from('charts')
            .upsert(chartRows, {
              onConflict: 'spreadsheet_id,chart_id',
            })

          if (upsertErr) {
            console.error('Error upserting charts in spreadsheet POST:', upsertErr)
          }
        }
      } catch (syncErr) {
        console.warn('Failed to sync charts during spreadsheet save:', syncErr)
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheet: {
        ...targetSpreadsheet,
        charts: chartList,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save spreadsheet' },
      { status: 500 }
    )
  }
}

// DELETE: remove a spreadsheet
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing spreadsheet id' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('spreadsheets').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete spreadsheet' },
      { status: 500 }
    )
  }
}
