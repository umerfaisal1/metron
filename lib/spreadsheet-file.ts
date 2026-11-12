import * as XLSX from 'xlsx'
import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'

export interface SheetPreviewData {
  sheetName: string
  rowCount: number
  columnCount: number
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
  previewRows: Array<Array<string | number | boolean>>
}

export interface ParsedSpreadsheetWorkbook {
  fileName: string
  suggestedTitle: string
  fileType: 'xlsx' | 'xls' | 'csv'
  sheetNames: string[]
  getSheetData: (sheetName?: string) => SheetPreviewData
}

/**
 * Sanitizes a title from a file name (removes extension and replaces underscores/hyphens with spaces)
 */
export function extractTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '').trim()
  if (!withoutExt) return 'Imported Spreadsheet'
  return withoutExt.replace(/[_-]+/g, ' ')
}

/**
 * Normalizes tabular rows so that every row has the same number of columns,
 * handling empty cells, strings, numbers, and booleans.
 */
function normalizeRows(
  rawRows: Array<Array<unknown>>,
  colCount: number
): Array<Array<string | number | boolean>> {
  return rawRows.map((row) => {
    const safeRow: Array<string | number | boolean> = []
    for (let c = 0; c < colCount; c++) {
      const val = row[c]
      if (val === null || val === undefined) {
        safeRow.push('')
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        safeRow.push(val)
      } else {
        safeRow.push(String(val))
      }
    }
    return safeRow
  })
}

/**
 * Determines column header definitions and data types from parsed rows.
 */
function extractColumnsAndData(rawRows: Array<Array<unknown>>): {
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
} {
  if (!rawRows || rawRows.length === 0) {
    return {
      columns: [
        { title: 'A', type: 'text', width: 120 },
        { title: 'B', type: 'text', width: 120 },
        { title: 'C', type: 'text', width: 120 },
      ],
      data: [
        ['', '', ''],
        ['', '', ''],
      ],
    }
  }

  // Calculate maximum column count across all rows
  let maxCols = 0
  for (const row of rawRows) {
    if (Array.isArray(row) && row.length > maxCols) {
      maxCols = row.length
    }
  }

  if (maxCols === 0) {
    return {
      columns: [{ title: 'A', type: 'text', width: 120 }],
      data: [['']],
    }
  }

  // Row 0 is treated as header row
  const headerRow = (Array.isArray(rawRows[0]) ? rawRows[0] : []) as Array<unknown>
  const bodyRowsRaw = rawRows.slice(1)

  // Build column definitions
  const columns: ColumnDef[] = []
  for (let c = 0; c < maxCols; c++) {
    const rawTitle = headerRow[c]
    const titleStr = rawTitle !== null && rawTitle !== undefined && String(rawTitle).trim() !== ''
      ? String(rawTitle).trim()
      : `Column ${c + 1}`

    // Infer type by sampling body rows
    let numericCount = 0
    let sampledCount = 0
    for (let r = 0; r < Math.min(bodyRowsRaw.length, 25); r++) {
      const cell = bodyRowsRaw[r]?.[c]
      if (cell !== null && cell !== undefined && cell !== '') {
        sampledCount++
        if (typeof cell === 'number' || (!isNaN(Number(cell)) && !isNaN(parseFloat(String(cell))))) {
          numericCount++
        }
      }
    }

    const isNumeric = sampledCount > 0 && numericCount === sampledCount
    columns.push({
      title: titleStr,
      type: isNumeric ? 'numeric' : 'text',
      width: Math.max(100, Math.min(260, titleStr.length * 11 + 30)),
    })
  }

  const normalizedBody = normalizeRows(bodyRowsRaw, maxCols)
  const finalData = normalizedBody.length > 0 ? normalizedBody : [new Array(maxCols).fill('')]

  return { columns, data: finalData }
}

/**
 * Client-side file parser for XLSX, XLS, and CSV files using SheetJS.
 * Validates file format and extracts sheets without sending file data to servers or external APIs.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetWorkbook> {
  if (!file) {
    throw new Error('No file provided for import.')
  }

  const name = file.name || 'spreadsheet'
  const lowerName = name.toLowerCase()
  const isXlsx = lowerName.endsWith('.xlsx')
  const isXls = lowerName.endsWith('.xls')
  const isCsv = lowerName.endsWith('.csv')

  if (!isXlsx && !isXls && !isCsv) {
    throw new Error(
      `Unsupported file type for "${file.name}". Please upload a Microsoft Excel (.xlsx, .xls) or Comma Separated Values (.csv) file.`
    )
  }

  if (file.size === 0) {
    throw new Error(`The file "${file.name}" is empty (0 bytes). Please choose a valid spreadsheet file.`)
  }

  // Maximum allowed file size for client-side parsing: 25MB to prevent browser tab crashes
  const MAX_SIZE_BYTES = 25 * 1024 * 1024
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 25 MB for browser processing.`
    )
  }

  const buffer = await file.arrayBuffer()
  let workbook: XLSX.WorkBook

  try {
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      dense: false,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to parse "${file.name}". The file may be corrupt or encrypted. Details: ${errorMsg}`
    )
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`The workbook "${file.name}" does not contain any sheets.`)
  }

  const fileType: 'xlsx' | 'xls' | 'csv' = isCsv ? 'csv' : isXls ? 'xls' : 'xlsx'
  const suggestedTitle = extractTitleFromFileName(name)

  return {
    fileName: name,
    suggestedTitle,
    fileType,
    sheetNames: workbook.SheetNames,
    getSheetData: (targetSheetName?: string): SheetPreviewData => {
      const selectedName = targetSheetName && workbook.SheetNames.includes(targetSheetName)
        ? targetSheetName
        : workbook.SheetNames[0]

      const worksheet = workbook.Sheets[selectedName]
      if (!worksheet) {
        throw new Error(`Worksheet "${selectedName}" could not be found in "${file.name}".`)
      }

      // SheetJS sheet_to_json with header: 1 returns 2D array: any[][]
      const rawRows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      })

      const { columns, data } = extractColumnsAndData(rawRows)

      return {
        sheetName: selectedName,
        rowCount: data.length,
        columnCount: columns.length,
        columns,
        data,
        previewRows: data.slice(0, 5),
      }
    },
  }
}

/**
 * Triggers a browser download for a Blob or File
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  a.setAttribute('aria-hidden', 'true')
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Export current spreadsheet data & columns to a native .xlsx Excel workbook.
 */
export function exportToXLSX(options: {
  title: string
  sheetName?: string
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
}): void {
  const { title, sheetName = 'Sheet1', columns, data } = options

  const headers = columns && columns.length > 0
    ? columns.map((c, i) => c.title || `Column ${i + 1}`)
    : (data[0] || []).map((_, i) => `Column ${i + 1}`)

  const rows: Array<Array<string | number | boolean>> = [headers, ...(data || [])]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Configure column widths if specified
  if (columns && columns.length > 0) {
    worksheet['!cols'] = columns.map((c) => ({
      wch: Math.max(12, Math.min(40, (c.title?.length || 10) + 4)),
    }))
  }

  // Sanitize sheet name for Excel (max 31 chars, no invalid characters \ / ? * : [ ])
  const safeSheetName = sheetName
    .replace(/[\\/?*:[\]]/g, '')
    .trim()
    .slice(0, 31) || 'Sheet1'

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName)

  const sanitizedFileName = (title.trim() || 'metron_spreadsheet')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .concat('.xlsx')

  const arrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  triggerBrowserDownload(blob, sanitizedFileName)
}

/**
 * Export current spreadsheet data & columns to a standard RFC 4180-compliant .csv file.
 * Handles commas, quotes, and newlines accurately.
 */
export function exportToCSV(options: {
  title: string
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
}): void {
  const { title, columns, data } = options

  const headers = columns && columns.length > 0
    ? columns.map((c, i) => c.title || `Column ${i + 1}`)
    : (data[0] || []).map((_, i) => `Column ${i + 1}`)

  const rows: Array<Array<string | number | boolean>> = [headers, ...(data || [])]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)

  const sanitizedFileName = (title.trim() || 'metron_spreadsheet')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .concat('.csv')

  // Prepend UTF-8 BOM so Excel and text editors open UTF-8 CSV without character corruption
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  triggerBrowserDownload(blob, sanitizedFileName)
}
