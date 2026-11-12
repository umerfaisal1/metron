'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import { registerAllModules } from 'handsontable/registry'
import { exportToXLSX, exportToCSV } from '@/lib/spreadsheet-file'

// Register all Handsontable modules
registerAllModules()

export interface ColumnDef {
  title: string
  type?: string
  source?: string[]
  width?: number
}

interface HandsontableEditorProps {
  data: Array<Array<string | number | boolean>>
  columns: ColumnDef[]
  onDataChange?: (newData: Array<Array<string | number | boolean>>) => void
  readOnly?: boolean
  className?: string
}

export default function HandsontableEditor({
  data,
  columns,
  onDataChange,
  readOnly = false,
  className = '',
}: HandsontableEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotInstanceRef = useRef<Handsontable | null>(null)
  const [selectedCellInfo, setSelectedCellInfo] = useState<string>('A1')
  const [cellValue, setCellValue] = useState<string>('')
  const [rowCount, setRowCount] = useState<number>(data?.length || 0)
  const [colCount, setColCount] = useState<number>(columns?.length || 0)

  // Stable callback for data changes
  const handleDataChange = useCallback(
    (hot: Handsontable) => {
      const currentData = hot.getData() as Array<Array<string | number | boolean>>
      setRowCount(currentData.length)
      if (currentData[0]) setColCount(currentData[0].length)
      onDataChange?.(currentData)
    },
    [onDataChange]
  )

  // Helper to convert (row, col) to Excel-style (e.g. 0, 1 -> B1)
  const getCellCoordName = (row: number, col: number) => {
    let colName = ''
    let c = col
    while (c >= 0) {
      colName = String.fromCharCode((c % 26) + 65) + colName
      c = Math.floor(c / 26) - 1
    }
    return `${colName}${row + 1}`
  }

  useEffect(() => {
    if (!containerRef.current) return

    // Clone data to avoid mutating props directly
    const initialData = Array.isArray(data) && data.length > 0
      ? data.map((row) => (Array.isArray(row) ? [...row] : []))
      : [
          ['', '', ''],
          ['', '', ''],
        ]

    const colHeaders =
      Array.isArray(columns) && columns.length > 0
        ? columns.map((c) => c.title || 'Column')
        : true

    const columnSettings =
      Array.isArray(columns) && columns.length > 0
        ? columns.map((c) => {
            if (c.type === 'dropdown' && Array.isArray(c.source)) {
              return { type: 'dropdown', source: c.source }
            }
            if (c.type === 'numeric') {
              return { type: 'numeric' }
            }
            return { type: 'text' }
          })
        : undefined

    // Destroy any existing instance
    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy()
      hotInstanceRef.current = null
    }

    // Initialize Handsontable
    const hot = new Handsontable(containerRef.current, {
      data: initialData,
      colHeaders,
      columns: columnSettings,
      rowHeaders: true,
      licenseKey: 'non-commercial-and-evaluation',
      readOnly,
      width: '100%',
      height: 480,
      rowHeights: 32,
      stretchH: 'all',
      autoWrapRow: true,
      autoWrapCol: true,
      manualColumnResize: true,
      manualRowResize: true,
      contextMenu: !readOnly,
      outsideClickDeselects: false,
      selectionMode: 'multiple',
      className: 'ht-theme-main metron-handsontable',
      afterSelection: (row, col) => {
        const coord = getCellCoordName(row, col)
        setSelectedCellInfo(coord)
        const val = hot.getDataAtCell(row, col)
        setCellValue(val !== null && val !== undefined ? String(val) : '')
      },
      afterChange: (changes, source) => {
        if (source === 'loadData') return
        handleDataChange(hot)
      },
      afterCreateRow: () => handleDataChange(hot),
      afterRemoveRow: () => handleDataChange(hot),
      afterCreateCol: () => handleDataChange(hot),
      afterRemoveCol: () => handleDataChange(hot),
    })

    hotInstanceRef.current = hot
    setRowCount(initialData.length)
    setColCount(initialData[0] ? initialData[0].length : 0)

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy()
        hotInstanceRef.current = null
      }
    }
  }, [data, columns, readOnly, handleDataChange])

  // Toolbar Actions
  const handleAddRow = () => {
    if (!hotInstanceRef.current) return
    const rowIdx = hotInstanceRef.current.countRows()
    hotInstanceRef.current.alter('insert_row_below', rowIdx - 1)
  }

  const handleAddCol = () => {
    if (!hotInstanceRef.current) return
    const colIdx = hotInstanceRef.current.countCols()
    hotInstanceRef.current.alter('insert_col_end', colIdx)
  }

  const handleDeleteSelected = () => {
    if (!hotInstanceRef.current) return
    const selected = hotInstanceRef.current.getSelected()
    if (!selected || selected.length === 0) return
    const [startRow, , endRow] = selected[0]
    const minRow = Math.min(startRow, endRow)
    const amount = Math.abs(endRow - startRow) + 1
    hotInstanceRef.current.alter('remove_row', minRow, amount)
  }

  const handleExportXLSX = () => {
    if (!hotInstanceRef.current) return
    const currentData = hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>
    exportToXLSX({
      title: 'metron_spreadsheet',
      columns,
      data: currentData,
    })
  }

  const handleExportCSV = () => {
    if (!hotInstanceRef.current) return
    const currentData = hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>
    exportToCSV({
      title: 'metron_spreadsheet',
      columns,
      data: currentData,
    })
  }

  return (
    <div className={`flex flex-col rounded-2xl bg-white border border-[#E2E8E4] shadow-xs overflow-hidden ${className}`}>
      {/* Formula & Toolbar Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FAFBF9] border-b border-[#EAEFEA] text-xs">
        {/* Left: Active Cell & Value preview */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="px-2.5 py-1 rounded-md bg-white border border-[#DCE4DE] font-mono font-bold text-[#0D361C] shadow-2xs">
            {selectedCellInfo}
          </div>
          <span className="text-zinc-300 font-mono font-bold">fx</span>
          <div className="px-3 py-1 rounded-md bg-white border border-[#E5EBE6] text-zinc-700 font-mono text-xs truncate max-w-xs sm:max-w-md shadow-2xs">
            {cellValue || <span className="text-zinc-300 italic">empty cell</span>}
          </div>
        </div>

        {/* Right: Quick Table Operations */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F7F4] border border-[#DEE6E0] text-zinc-700 hover:text-[#0D361C] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Row</span>
            </button>

            <button
              type="button"
              onClick={handleAddCol}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F7F4] border border-[#DEE6E0] text-zinc-700 hover:text-[#0D361C] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Column</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 border border-[#DEE6E0] hover:border-red-200 text-zinc-600 hover:text-red-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={handleExportXLSX}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F7F4] border border-[#DEE6E0] text-zinc-700 hover:text-[#0D361C] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              title="Export as Excel (.xlsx)"
              aria-label="Export as Excel (.xlsx)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>XLSX</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F7F4] border border-[#DEE6E0] text-zinc-700 hover:text-[#0D361C] text-xs font-medium shadow-2xs transition-colors cursor-pointer"
              title="Export as CSV (.csv)"
              aria-label="Export as CSV (.csv)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Handsontable Container */}
      <div className="relative w-full overflow-hidden bg-white">
        <div ref={containerRef} className="w-full text-xs" />
      </div>

      {/* Grid Footer Bar */}
      <div className="px-4 py-2 bg-[#FAFBF9] border-t border-[#EAEFEA] flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{rowCount} rows</span>
          <span>•</span>
          <span>{colCount} columns</span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">Handsontable Free Edition</span>
        </div>
        <span className="hidden sm:inline">Double-click or type to edit any cell • Right-click for options</span>
      </div>
    </div>
  )
}
