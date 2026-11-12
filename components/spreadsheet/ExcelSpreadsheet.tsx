'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import { registerAllModules } from 'handsontable/registry'
import SpreadsheetImportModal from './SpreadsheetImportModal'
import { exportToXLSX, exportToCSV } from '@/lib/spreadsheet-file'

registerAllModules()

export interface ColumnDef {
  title: string
  type?: string
  source?: string[]
  width?: number
}

interface ExcelSpreadsheetProps {
  initialTitle: string
  initialColumns: ColumnDef[]
  initialData: Array<Array<string | number | boolean>>
  sheetId?: string
  initialPrompt?: string | null
  initialMetadata?: {
    summary?: string
    notes?: string
  }
}

export default function ExcelSpreadsheet({
  initialTitle,
  initialColumns,
  initialData,
  sheetId,
  initialPrompt,
  initialMetadata,
}: ExcelSpreadsheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotInstanceRef = useRef<Handsontable | null>(null)

  // Sheet state
  const [title, setTitle] = useState(initialTitle || 'Untitled Workbook')
  const [sheetName, setSheetName] = useState<string>('Sheet1')
  const [columns, setColumns] = useState<ColumnDef[]>(initialColumns || [])
  const [gridData, setGridData] = useState<Array<Array<string | number | boolean>>>(initialData || [])
  const [saveStatus, setSaveStatus] = useState<string>('Saved to Cloud')
  const [isSaving, setIsSaving] = useState(false)

  // Import / Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Active Ribbon Tab
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'formulas' | 'ai'>('home')

  // Formula bar state
  const [activeCellCoords, setActiveCellCoords] = useState<{ row: number; col: number }>({ row: 0, col: 0 })
  const [activeCellAddress, setActiveCellAddress] = useState<string>('A1')
  const [formulaValue, setFormulaValue] = useState<string>('')

  // Bottom status bar selection metrics (Sum, Average, Count)
  const [selectionStats, setSelectionStats] = useState<{ count: number; sum: number; avg: number; hasNumbers: boolean }>({
    count: 0,
    sum: 0,
    avg: 0,
    hasNumbers: false,
  })

  // AI Assistant state
  const [aiInstruction, setAiInstruction] = useState('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [aiNotice, setAiNotice] = useState<string | null>(initialMetadata?.summary || null)

  // Convert (row, col) to Excel-style (e.g. 0, 0 -> A1, 1, 2 -> C2)
  const toExcelCoord = (row: number, col: number) => {
    let colStr = ''
    let c = col
    while (c >= 0) {
      colStr = String.fromCharCode((c % 26) + 65) + colStr
      c = Math.floor(c / 26) - 1
    }
    return `${colStr}${row + 1}`
  }

  // Update formula bar & selection stats when selection changes
  const updateSelectionState = useCallback((r1: number, c1: number, r2?: number, c2?: number) => {
    if (!hotInstanceRef.current) return
    const hot = hotInstanceRef.current

    // Active cell
    setActiveCellCoords({ row: r1, col: c1 })
    setActiveCellAddress(toExcelCoord(r1, c1))
    const val = hot.getDataAtCell(r1, c1)
    setFormulaValue(val !== null && val !== undefined ? String(val) : '')

    // Range stats
    const minRow = Math.min(r1, r2 ?? r1)
    const maxRow = Math.max(r1, r2 ?? r1)
    const minCol = Math.min(c1, c2 ?? c1)
    const maxCol = Math.max(c1, c2 ?? c1)

    let count = 0
    let sum = 0
    let numericCount = 0

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        count++
        const cellVal = hot.getDataAtCell(r, c)
        if (cellVal !== null && cellVal !== undefined && cellVal !== '') {
          const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^0-9.-]+/g, ''))
          if (!isNaN(num)) {
            sum += num
            numericCount++
          }
        }
      }
    }

    setSelectionStats({
      count,
      sum,
      avg: numericCount > 0 ? parseFloat((sum / numericCount).toFixed(2)) : 0,
      hasNumbers: numericCount > 0,
    })
  }, [])

  // Initialize Handsontable
  useEffect(() => {
    if (!containerRef.current) return

    const initialRows = Array.isArray(gridData) && gridData.length > 0
      ? gridData.map((row) => (Array.isArray(row) ? [...row] : []))
      : [
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
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

    if (hotInstanceRef.current) {
      hotInstanceRef.current.destroy()
      hotInstanceRef.current = null
    }

    const hot = new Handsontable(containerRef.current, {
      data: initialRows,
      colHeaders,
      columns: columnSettings,
      rowHeaders: true,
      licenseKey: 'non-commercial-and-evaluation',
      width: '100%',
      height: '100%',
      rowHeights: 26,
      stretchH: 'all',
      autoWrapRow: true,
      autoWrapCol: true,
      manualColumnResize: true,
      manualRowResize: true,
      contextMenu: true,
      outsideClickDeselects: false,
      selectionMode: 'multiple',
      fillHandle: true,
      className: 'ht-theme-main metron-excel-grid',
      afterSelection: (r, c, r2, c2) => {
        updateSelectionState(r, c, r2, c2)
      },
      afterChange: (changes, source) => {
        if (source === 'loadData') return
        const updated = hot.getData() as Array<Array<string | number | boolean>>
        setGridData(updated)
        setSaveStatus('Unsaved edits')
      },
      afterCreateRow: () => {
        setGridData(hot.getData() as Array<Array<string | number | boolean>>)
        setSaveStatus('Unsaved edits')
      },
      afterRemoveRow: () => {
        setGridData(hot.getData() as Array<Array<string | number | boolean>>)
        setSaveStatus('Unsaved edits')
      },
      afterCreateCol: () => {
        setGridData(hot.getData() as Array<Array<string | number | boolean>>)
        setSaveStatus('Unsaved edits')
      },
      afterRemoveCol: () => {
        setGridData(hot.getData() as Array<Array<string | number | boolean>>)
        setSaveStatus('Unsaved edits')
      },
    })

    hotInstanceRef.current = hot
    updateSelectionState(0, 0)

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy()
        hotInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, updateSelectionState])

  // Apply change from formula bar to active cell
  const handleFormulaBarApply = () => {
    if (!hotInstanceRef.current) return
    const { row, col } = activeCellCoords
    hotInstanceRef.current.setDataAtCell(row, col, formulaValue)
    setSaveStatus('Unsaved edits')
  }

  // Save to Supabase
  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('Saving...')

    try {
      const hot = hotInstanceRef.current
      const currentData = hot ? hot.getData() : gridData

      const res = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sheetId,
          title,
          prompt: initialPrompt,
          columns,
          data: currentData,
          metadata: {
            summary: aiNotice,
            ...initialMetadata,
          },
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setSaveStatus('Saved to Cloud')
      } else {
        throw new Error(json.error || 'Failed to save')
      }
    } catch (e: unknown) {
      console.error(e)
      setSaveStatus('Error saving')
    } finally {
      setIsSaving(false)
    }
  }

  // AI Modification handler
  const handleAiModify = async (instructionToRun?: string) => {
    const text = (instructionToRun || aiInstruction).trim()
    if (!text) return

    setIsAiProcessing(true)
    setAiNotice('Gemini is modifying your spreadsheet…')

    try {
      const hot = hotInstanceRef.current
      const currentData = hot ? hot.getData() : gridData

      const res = await fetch('/api/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheet: {
            title,
            columns,
            data: currentData,
            metadata: initialMetadata,
          },
          instruction: text,
        }),
      })

      const json = await res.json()

      if (res.ok && json.spreadsheet) {
        const mod = json.spreadsheet
        if (mod.columns && mod.data) {
          setColumns(mod.columns)
          setGridData(mod.data)
          if (mod.title) setTitle(mod.title)
          setAiNotice(mod.summary || `Applied: "${text}"`)
          setSaveStatus('Unsaved edits')
          setAiInstruction('')

          if (hotInstanceRef.current) {
            hotInstanceRef.current.loadData(mod.data)
            hotInstanceRef.current.updateSettings({
              colHeaders: mod.columns.map((c: ColumnDef) => c.title || 'Column'),
            })
          }
        }
      } else {
        throw new Error(json.error || 'Could not modify spreadsheet')
      }
    } catch (err: unknown) {
      setAiNotice(err instanceof Error ? err.message : 'AI edit failed')
    } finally {
      setIsAiProcessing(false)
    }
  }

  // Quick Table Actions
  const handleInsertRow = () => {
    if (!hotInstanceRef.current) return
    const sel = hotInstanceRef.current.getSelectedLast()
    const r = sel ? sel[0] + 1 : hotInstanceRef.current.countRows()
    hotInstanceRef.current.alter('insert_row_below', r - 1)
  }

  const handleInsertCol = () => {
    if (!hotInstanceRef.current) return
    const sel = hotInstanceRef.current.getSelectedLast()
    const c = sel ? sel[1] + 1 : hotInstanceRef.current.countCols()
    hotInstanceRef.current.alter('insert_col_end', c)
    setColumns((prev) => [...prev, { title: `Column ${prev.length + 1}`, type: 'text' }])
  }

  const handleDeleteRow = () => {
    if (!hotInstanceRef.current) return
    const sel = hotInstanceRef.current.getSelectedLast()
    if (!sel) return
    hotInstanceRef.current.alter('remove_row', sel[0], 1)
  }

  const handleDeleteCol = () => {
    if (!hotInstanceRef.current) return
    const sel = hotInstanceRef.current.getSelectedLast()
    if (!sel) return
    hotInstanceRef.current.alter('remove_col', sel[1], 1)
  }

  const handleUndo = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hot = hotInstanceRef.current as any
    if (hot?.undo) {
      hot.undo()
    } else {
      hot?.getPlugin?.('undoRedo')?.undo()
    }
  }

  const handleRedo = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hot = hotInstanceRef.current as any
    if (hot?.redo) {
      hot.redo()
    } else {
      hot?.getPlugin?.('undoRedo')?.redo()
    }
  }

  // Quick AutoSum: adds SUM formula to selected column or active cell
  const handleAutoSum = () => {
    if (!hotInstanceRef.current) return
    const { row, col } = activeCellCoords
    const aboveCoord = toExcelCoord(0, col)
    const endCoord = toExcelCoord(Math.max(0, row - 1), col)
    const formulaStr = `=SUM(${aboveCoord}:${endCoord})`
    setFormulaValue(formulaStr)
    hotInstanceRef.current.setDataAtCell(row, col, formulaStr)
    setSaveStatus('Unsaved edits')
  }

  // Export XLSX
  const handleExportXLSX = () => {
    setIsExportMenuOpen(false)
    const hot = hotInstanceRef.current
    const currentData = hot
      ? (hot.getData() as Array<Array<string | number | boolean>>)
      : gridData

    try {
      exportToXLSX({
        title,
        sheetName,
        columns,
        data: currentData,
      })
      setFeedbackNotice({
        type: 'success',
        message: `Workbook exported as "${title || 'spreadsheet'}.xlsx" successfully.`,
      })
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export Excel file.',
      })
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    setIsExportMenuOpen(false)
    const hot = hotInstanceRef.current
    const currentData = hot
      ? (hot.getData() as Array<Array<string | number | boolean>>)
      : gridData

    try {
      exportToCSV({
        title,
        columns,
        data: currentData,
      })
      setFeedbackNotice({
        type: 'success',
        message: `Sheet exported as "${title || 'spreadsheet'}.csv" successfully.`,
      })
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export CSV file.',
      })
    }
  }

  // Import Complete Handler
  const handleImportComplete = (result: {
    sheetName: string
    columns: ColumnDef[]
    data: Array<Array<string | number | boolean>>
    newTitle?: string
  }) => {
    setColumns(result.columns)
    setGridData(result.data)
    if (result.newTitle) {
      setTitle(result.newTitle)
    }
    if (result.sheetName) {
      setSheetName(result.sheetName)
    }
    setSaveStatus('Unsaved edits')

    if (hotInstanceRef.current) {
      hotInstanceRef.current.loadData(result.data)
      hotInstanceRef.current.updateSettings({
        colHeaders: result.columns.map((c) => c.title || 'Column'),
        columns: result.columns.map((c) => {
          if (c.type === 'dropdown' && Array.isArray(c.source)) {
            return { type: 'dropdown', source: c.source }
          }
          if (c.type === 'numeric') {
            return { type: 'numeric' }
          }
          return { type: 'text' }
        }),
      })
    }

    setFeedbackNotice({
      type: 'success',
      message: `Worksheet "${result.sheetName}" imported successfully (${result.data.length} rows, ${result.columns.length} columns). Marked as unsaved.`,
    })
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F3F2F1] text-[#242424] font-sans select-none">
      {/* 1. TOP EXCEL TITLE BAR (Forest Green #107C41 / Metron Brand) */}
      <header className="h-10 bg-[#107C41] text-white px-3 flex items-center justify-between text-xs shadow-xs z-30 flex-shrink-0">
        {/* Left: Back & File name */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors"
            title="Return to Metron Dashboard"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Dashboard</span>
          </Link>

          {/* Quick Access Icons */}
          <div className="hidden sm:flex items-center gap-1 text-white/80">
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title="Save (Ctrl+S)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            <button
              onClick={handleUndo}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          <div className="h-4 w-px bg-white/30 hidden sm:block" />

          {/* Editable File Title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="bg-transparent hover:bg-white/15 focus:bg-white focus:text-zinc-900 px-2 py-0.5 rounded font-bold text-xs truncate max-w-xs transition-colors border border-transparent focus:border-white focus:outline-none"
            />
            <span className="text-white/70 text-[11px] font-mono hidden md:inline">.xlsx</span>
          </div>

          {/* AutoSave Indicator */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            <span>{saveStatus}</span>
          </div>
        </div>

        {/* Center: Search / What to do */}
        <div className="hidden md:flex items-center gap-1.5 bg-black/20 hover:bg-black/30 rounded px-2.5 py-1 text-white/90 text-xs w-64 transition-colors">
          <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px] text-white/70">Tell me what you want to do</span>
        </div>

        {/* Right: Import, Export & Save Actions */}
        <div className="flex items-center gap-2">
          {/* Import Action */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            aria-label="Import spreadsheet from .xlsx or .csv"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
            title="Import Excel (.xlsx) or CSV (.csv) file"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              aria-label="Export spreadsheet"
              aria-expanded={isExportMenuOpen}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
              title="Export current worksheet as XLSX or CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
              <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 z-50 text-xs text-zinc-800"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportXLSX}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#107C41] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-5 h-5 rounded bg-emerald-100 text-[#107C41] flex items-center justify-center font-bold text-[10px]">
                      XLS
                    </span>
                    <div>
                      <div className="font-semibold text-xs">Excel Workbook</div>
                      <div className="text-[10px] text-zinc-400">Download .xlsx</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#107C41] flex items-center gap-2 cursor-pointer transition-colors border-t border-zinc-100"
                  >
                    <span className="w-5 h-5 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-[10px]">
                      CSV
                    </span>
                    <div>
                      <div className="font-semibold text-xs">CSV (Comma-delimited)</div>
                      <div className="text-[10px] text-zinc-400">Download .csv</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white text-[#107C41] hover:bg-zinc-100 font-bold text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Accessible Feedback Notice Banner */}
      {feedbackNotice && (
        <div
          role="status"
          className={`px-3 py-1.5 border-b text-[11px] flex items-center justify-between flex-shrink-0 transition-all ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedbackNotice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {feedbackNotice.type === 'success' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            )}
            {feedbackNotice.type === 'error' && (
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            )}
            {feedbackNotice.type === 'info' && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <span className="truncate">{feedbackNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            aria-label="Dismiss notification"
            className="text-zinc-500 hover:text-zinc-800 ml-2 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. EXCEL RIBBON TABS (Home, Insert, Formulas, AI Assistant) */}
      <div className="bg-[#FAF9F8] border-b border-[#E1DFDD] px-3 pt-1 flex items-center gap-1 text-xs font-medium z-20 flex-shrink-0">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'home'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
          Home
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'ai'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI Assistant</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-[#107C41] font-bold">Gemini</span>
        </button>

        <button
          onClick={() => setActiveTab('insert')}
          className={`px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'insert'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
          Insert
        </button>

        <button
          onClick={() => setActiveTab('formulas')}
          className={`px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'formulas'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
          Formulas
        </button>
      </div>

      {/* 3. RIBBON ACTION TOOLBAR */}
      <div className="bg-white border-b border-[#E1DFDD] px-3 py-1.5 min-h-[52px] flex items-center gap-4 text-xs z-20 flex-shrink-0 overflow-x-auto">
        {activeTab === 'home' && (
          <div className="flex items-center gap-3">
            {/* Import & Export Group */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-[#E1DFDD]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
                title="Import Excel (.xlsx) or CSV (.csv)"
                aria-label="Import spreadsheet file"
              >
                <svg className="w-3.5 h-3.5 text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import</span>
              </button>
              <button
                type="button"
                onClick={handleExportXLSX}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
                title="Export as Excel .xlsx"
                aria-label="Export as Excel (.xlsx)"
              >
                <svg className="w-3.5 h-3.5 text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>XLSX</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
                title="Export as CSV .csv"
                aria-label="Export as CSV (.csv)"
              >
                <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>CSV</span>
              </button>
            </div>

            {/* Clipboard Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={handleUndo}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer"
                title="Undo"
                aria-label="Undo last action"
              >
                ↺
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer"
                title="Redo"
                aria-label="Redo last action"
              >
                ↻
              </button>
            </div>

            {/* Font / Formatting Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={() => {
                  const hot = hotInstanceRef.current
                  if (!hot) return
                  const sel = hot.getSelectedLast()
                  if (!sel) return
                  const [r1, c1] = sel
                  hot.setCellMeta(r1, c1, 'className', 'htBold')
                  hot.render()
                }}
                className="w-7 h-7 font-bold rounded hover:bg-[#F3F2F1] text-zinc-800 flex items-center justify-center font-serif text-sm cursor-pointer"
                title="Bold (Ctrl+B)"
                aria-label="Format Bold"
              >
                B
              </button>
              <button
                onClick={() => {
                  const hot = hotInstanceRef.current
                  if (!hot) return
                  const sel = hot.getSelectedLast()
                  if (!sel) return
                  const [r1, c1] = sel
                  hot.setCellMeta(r1, c1, 'className', 'htItalic')
                  hot.render()
                }}
                className="w-7 h-7 italic rounded hover:bg-[#F3F2F1] text-zinc-800 flex items-center justify-center font-serif text-sm"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={() => {
                  const hot = hotInstanceRef.current
                  if (!hot) return
                  const sel = hot.getSelectedLast()
                  if (!sel) return
                  hot.setCellMeta(sel[0], sel[1], 'className', 'htLeft')
                  hot.render()
                }}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700"
                title="Align Left"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const hot = hotInstanceRef.current
                  if (!hot) return
                  const sel = hot.getSelectedLast()
                  if (!sel) return
                  hot.setCellMeta(sel[0], sel[1], 'className', 'htCenter')
                  hot.render()
                }}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700"
                title="Align Center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const hot = hotInstanceRef.current
                  if (!hot) return
                  const sel = hot.getSelectedLast()
                  if (!sel) return
                  hot.setCellMeta(sel[0], sel[1], 'className', 'htRight')
                  hot.render()
                }}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700"
                title="Align Right"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
                </svg>
              </button>
            </div>

            {/* Cells: Insert / Delete */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={handleInsertRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs transition-colors"
                title="Insert row below active cell"
              >
                <span className="font-bold text-[#107C41]">+</span> Row
              </button>
              <button
                onClick={handleInsertCol}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs transition-colors"
                title="Insert column"
              >
                <span className="font-bold text-[#107C41]">+</span> Column
              </button>
              <button
                onClick={handleDeleteRow}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs transition-colors"
                title="Delete active row"
              >
                - Del Row
              </button>
              <button
                onClick={handleDeleteCol}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs transition-colors"
                title="Delete active column"
              >
                - Del Col
              </button>
            </div>

            {/* AutoSum */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoSum}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#107C41]/10 hover:bg-[#107C41]/20 text-[#107C41] font-bold text-xs transition-colors"
                title="Calculate SUM of column"
              >
                <span className="text-sm font-serif">Σ</span> AutoSum
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAiModify()
                }}
                placeholder="Ask Gemini to edit this spreadsheet (e.g. 'Add a column for notes', 'Calculate totals at bottom', 'Add 15% tax column')"
                disabled={isAiProcessing}
                className="w-full px-3 py-1.5 rounded border border-[#C8C6C4] bg-[#FAF9F8] text-xs focus:bg-white focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41]"
              />
            </div>

            <button
              onClick={() => handleAiModify()}
              disabled={isAiProcessing || !aiInstruction.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#107C41] hover:bg-[#0D6234] text-white font-semibold text-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isAiProcessing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Apply with AI</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Quick Suggestions */}
            <div className="hidden xl:flex items-center gap-1 text-[11px]">
              {['Add Total Row', 'Add Tax (5%)', 'Sort rows by cost'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleAiModify(s)}
                  className="px-2 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] text-zinc-700 text-[10px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insert' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-[#E1DFDD]">
              <button
                type="button"
                onClick={handleInsertRow}
                className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"
              >
                + Insert Row Below
              </button>
              <button
                type="button"
                onClick={handleInsertCol}
                className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"
              >
                + Insert Column Right
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#107C41]/10 hover:bg-[#107C41]/20 text-[#107C41] font-semibold text-xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import File (.xlsx / .csv)</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="flex items-center gap-2">
            {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF'].map((fn) => (
              <button
                key={fn}
                onClick={() => {
                  const formula = `=${fn}()`
                  setFormulaValue(formula)
                  if (hotInstanceRef.current) {
                    const { row, col } = activeCellCoords
                    hotInstanceRef.current.setDataAtCell(row, col, formula)
                  }
                }}
                className="px-3 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-mono text-xs font-bold text-[#107C41]"
              >
                {fn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. EXCEL FORMULA BAR (fx) */}
      <div className="h-7 bg-white border-b border-[#D4D4D4] px-2 flex items-center gap-1.5 text-xs z-10 flex-shrink-0">
        {/* Cell Name Box */}
        <div className="w-16 h-5.5 px-2 bg-white border border-[#C8C6C4] flex items-center justify-center font-mono font-semibold text-zinc-800 text-[11px] shadow-2xs">
          {activeCellAddress}
        </div>

        {/* Function Helper Icons */}
        <div className="flex items-center gap-0.5 text-zinc-400">
          <button
            onClick={() => {
              if (hotInstanceRef.current) {
                const val = hotInstanceRef.current.getDataAtCell(activeCellCoords.row, activeCellCoords.col)
                setFormulaValue(val ? String(val) : '')
              }
            }}
            className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-red-600 rounded text-xs"
            title="Cancel"
          >
            ✕
          </button>
          <button
            onClick={handleFormulaBarApply}
            className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-emerald-700 rounded text-xs font-bold"
            title="Enter"
          >
            ✓
          </button>
          <button
            onClick={handleAutoSum}
            className="w-6 h-5 flex items-center justify-center hover:bg-zinc-100 text-[#107C41] font-serif font-bold text-xs"
            title="Insert Function"
          >
            fx
          </button>
        </div>

        {/* Formula Input Box */}
        <div className="flex-1 h-5.5 relative">
          <input
            type="text"
            value={formulaValue}
            onChange={(e) => setFormulaValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFormulaBarApply()
            }}
            onBlur={handleFormulaBarApply}
            className="w-full h-full px-2 text-xs font-mono text-zinc-900 bg-transparent border-none focus:outline-none focus:bg-white"
            placeholder="Type value or formula (e.g. =SUM(A1:A10))"
          />
        </div>
      </div>

      {/* Optional AI Notice Banner */}
      {aiNotice && (
        <div className="px-3 py-1 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between flex-shrink-0">
          <span className="truncate">
            <strong className="font-semibold text-[#107C41]">AI Context:</strong> {aiNotice}
          </span>
          <button
            onClick={() => setAiNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5. MAIN HANDSONTABLE GRID (MS Excel Styling) */}
      <main className="flex-1 w-full overflow-hidden bg-white relative">
        <div ref={containerRef} className="w-full h-full text-xs" />
      </main>

      {/* 6. BOTTOM SHEET TAB BAR & STATUS BAR */}
      <footer className="h-7 bg-[#F3F2F1] border-t border-[#D4D4D4] px-3 flex items-center justify-between text-[11px] text-zinc-600 z-10 flex-shrink-0">
        {/* Left: Sheet Tabs */}
        <div className="flex items-center gap-1">
          <div
            className="flex items-center px-4 py-1 bg-white border-t-2 border-[#107C41] text-[#107C41] font-bold shadow-2xs cursor-pointer select-none truncate max-w-xs"
            title={`Active Sheet: ${sheetName}`}
          >
            {sheetName}
          </div>
          <button
            onClick={handleInsertRow}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 font-bold cursor-pointer"
            title="Add more rows"
            aria-label="Add more rows"
          >
            +
          </button>
        </div>

        {/* Right: Excel Selection Statistics (Average, Count, Sum) */}
        <div className="flex items-center gap-4 font-mono text-[11px]">
          {selectionStats.hasNumbers && (
            <>
              <span>
                Average: <strong className="text-zinc-800">{selectionStats.avg}</strong>
              </span>
              <span>
                Sum: <strong className="text-zinc-800">{selectionStats.sum}</strong>
              </span>
            </>
          )}
          <span>
            Count: <strong className="text-zinc-800">{selectionStats.count}</strong>
          </span>
          <span className="hidden sm:inline text-zinc-400">|</span>
          <span className="hidden sm:inline font-sans text-emerald-800 font-semibold">Ready</span>
        </div>
      </footer>

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentTitle={title}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
