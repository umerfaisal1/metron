import * as XLSX from 'xlsx'
import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'

export interface ParsedWorksheet {
  name: string
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
}

export interface ParsedWorkbook {
  filename: string
  title: string
  sheets: ParsedWorksheet[]
  activeSheet: ParsedWorksheet
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array, filename: string): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheets: ParsedWorksheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue

    // Convert sheet to 2D array
    const rawRows = XLSX.utils.sheet_to_json<Array<string | number | boolean | Date>>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    })

    if (rawRows.length === 0) continue

    // First row is assumed to be headers
    const headerRow = rawRows[0] as Array<unknown>
    const dataRows = rawRows.slice(1) as Array<Array<unknown>>

    // Build columns
    const columns: ColumnDef[] = headerRow.map((colName, idx) => {
      const title = colName ? String(colName).trim() : `Column ${idx + 1}`

      // Infer type from sample data
      let numericCount = 0
      let totalSampled = 0

      for (let r = 0; r < Math.min(dataRows.length, 20); r++) {
        const val = dataRows[r]?.[idx]
        if (val !== null && val !== undefined && val !== '') {
          totalSampled++
          if (typeof val === 'number') numericCount++
        }
      }

      const isNumeric = totalSampled > 0 && numericCount / totalSampled >= 0.7
      return {
        title,
        type: isNumeric ? 'numeric' : 'text',
        width: Math.max(110, Math.min(240, title.length * 10 + 30)),
      }
    })

    // Format any Date objects in rows to YYYY-MM-DD
    const cleanedRows: Array<Array<string | number | boolean>> = dataRows.map((row) =>
      columns.map((_, colIdx) => {
        const cell = row[colIdx]
        if (cell instanceof Date && !isNaN(cell.getTime())) {
          return cell.toISOString().split('T')[0]
        }
        if (typeof cell === 'number' || typeof cell === 'boolean') {
          return cell
        }
        return cell !== undefined && cell !== null ? String(cell) : ''
      })
    )

    sheets.push({
      name: sheetName,
      columns,
      data: cleanedRows,
    })
  }

  const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
  const activeSheet = sheets[0] || {
    name: 'Sheet1',
    columns: [{ title: 'A', type: 'text', width: 120 }],
    data: [['']],
  }

  return {
    filename,
    title: cleanTitle,
    sheets,
    activeSheet,
  }
}
