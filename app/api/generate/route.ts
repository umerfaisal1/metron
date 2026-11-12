import { NextResponse } from 'next/server'
import { generateSpreadsheetWithGemini } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const prompt = (body.prompt || '').trim()

    if (!prompt) {
      return NextResponse.json({ error: 'Please provide a prompt' }, { status: 400 })
    }

    // 1. Generate spreadsheet structure and data using Gemini API
    const generated = await generateSpreadsheetWithGemini(prompt)

    // 2. Persist to Supabase if possible
    let savedId: string | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('spreadsheets')
        .insert({
          user_id: user?.id || null,
          title: generated.title || 'Untitled Spreadsheet',
          prompt: prompt,
          columns: generated.columns || [],
          data: generated.data || [],
          metadata: {
            summary: generated.summary,
            ...generated.metadata,
          },
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        savedId = data.id
      } else if (error) {
        console.warn('Supabase insert warning:', error.message)
      }
    } catch (dbErr) {
      console.warn('Database save skipped:', dbErr)
    }

    return NextResponse.json({
      success: true,
      spreadsheet: {
        id: savedId || `local-${Date.now()}`,
        title: generated.title,
        summary: generated.summary,
        columns: generated.columns,
        data: generated.data,
        metadata: generated.metadata,
      },
    })
  } catch (err: unknown) {
    console.error('API /api/generate error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
