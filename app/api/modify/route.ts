import { NextResponse } from 'next/server'
import { modifySpreadsheetWithGemini } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { spreadsheet, instruction } = body

    if (!instruction || !spreadsheet) {
      return NextResponse.json({ error: 'Missing spreadsheet or instruction' }, { status: 400 })
    }

    const modified = await modifySpreadsheetWithGemini(spreadsheet, instruction)

    return NextResponse.json({
      success: true,
      spreadsheet: modified,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to modify spreadsheet' },
      { status: 500 }
    )
  }
}
