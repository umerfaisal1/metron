import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: list all spreadsheets for user or recently created
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

// POST: save or update a spreadsheet
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, title, prompt, columns, data, metadata } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (id && !id.startsWith('local-')) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('spreadsheets')
        .update({
          title: title || 'Untitled Spreadsheet',
          prompt: prompt || null,
          columns: columns || [],
          data: data || [],
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, spreadsheet: updated })
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
          metadata: metadata || {},
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, spreadsheet: inserted })
    }
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
