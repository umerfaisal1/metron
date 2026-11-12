import ExcelSpreadsheet from '@/components/spreadsheet/ExcelSpreadsheet'
import { createClient } from '@/lib/supabase/server'

export const instant = false

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SheetPage({ params }: PageProps) {
  const { id } = await params

  let title = 'Monthly Expense & Mess Food Calculator'
  let columns = [
    { title: 'Date', type: 'text', width: 110 },
    { title: 'Day', type: 'text', width: 90 },
    { title: 'Mess Food (Rs. 500)', type: 'dropdown', source: ['YES', 'NO'], width: 150 },
    { title: 'Mess Cost (Rs.)', type: 'numeric', width: 120 },
    { title: 'Other Category', type: 'dropdown', source: ['Transportation', 'Shopping', 'Entertainment', 'Groceries', 'Utilities'], width: 140 },
    { title: 'Other Cost (Rs.)', type: 'numeric', width: 120 },
    { title: 'Daily Total (Rs.)', type: 'numeric', width: 130 },
  ]
  let data: Array<Array<string | number | boolean>> = [
    ['2025-11-01', 'Saturday', 'YES', 500, 'Transportation', 350, 850],
    ['2025-11-02', 'Sunday', 'YES', 500, 'Shopping', 1200, 1700],
    ['2025-11-03', 'Monday', 'YES', 500, 'Entertainment', 600, 1100],
    ['2025-11-04', 'Tuesday', 'NO', 0, 'Groceries', 800, 800],
    ['2025-11-05', 'Wednesday', 'YES', 500, 'Transportation', 400, 900],
    ['2025-11-06', 'Thursday', 'YES', 500, 'Utilities', 1500, 2000],
    ['2025-11-07', 'Friday', 'NO', 0, 'Shopping', 950, 950],
    ['2025-11-08', 'Saturday', 'YES', 500, 'Transportation', 300, 800],
  ]
  let prompt: string | null = null
  let metadata: { summary?: string; notes?: string } = {
    summary: 'Loaded interactive spreadsheet. Edit cells directly or use the AI Assistant tab to modify.',
  }

  // Fetch record from Supabase if not a temporary demo ID
  if (id && !id.startsWith('demo-') && !id.startsWith('starter-') && !id.startsWith('local-')) {
    try {
      const supabase = await createClient()
      const { data: record, error } = await supabase
        .from('spreadsheets')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && record) {
        if (record.title) title = record.title
        if (Array.isArray(record.columns) && record.columns.length > 0) columns = record.columns
        if (Array.isArray(record.data) && record.data.length > 0) data = record.data
        if (record.prompt) prompt = record.prompt
        if (record.metadata) metadata = record.metadata
      }
    } catch (e) {
      console.warn('Could not fetch sheet from Supabase:', e)
    }
  }

  return (
    <ExcelSpreadsheet
      sheetId={id}
      initialTitle={title}
      initialColumns={columns}
      initialData={data}
      initialPrompt={prompt}
      initialMetadata={metadata}
    />
  )
}
