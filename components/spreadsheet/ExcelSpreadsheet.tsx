'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import { registerAllModules } from 'handsontable/registry'
import { useSpreadsheetStore } from '@/lib/store/useSpreadsheetStore'
import ChartDashboard from '@/components/charts/ChartDashboard'
import { parseSpreadsheetBuffer } from '@/lib/spreadsheet/fileParser'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Zustand Store
  const {
    title,
    columns,
    data: gridData,
    activeView,
    charts,
    isGeneratingCharts,
    saveStatus,
    isSaving,
    setWorkbook,
    setTitle,
    setColumns,
    setActiveView,
    updateData,
    setSaveStatus,
    setIsSaving,
    generateAICharts,
  } = useSpreadsheetStore()

  // Active Ribbon Tab
  const [activeTab, setActiveTab] = useState<'home' | 'charts' | 'ai' | 'insert' | 'formulas'>('home')

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

  // Initialize Zustand store on mount
  useEffect(() => {
    setWorkbook({
      id: sheetId,
      title: initialTitle || 'Untitled Workbook',
      columns: initialColumns || [],
      data: initialData || [],
      metadata: initialMetadata || {},
    })
  }, [sheetId, initialTitle, initialColumns, initialData, initialMetadata, setWorkbook])

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
    if (activeView === 'charts') return // grid not mounted in pure charts view

    const initialRows = Array.isArray(initialData) && initialData.length > 0
      ? initialData.map((row) => (Array.isArray(row) ? [...row] : []))
      : [
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
        ]

    const colHeaders =
      Array.isArray(initialColumns) && initialColumns.length > 0
        ? initialColumns.map((c) => c.title || 'Column')
        : true

    const columnSettings =
      Array.isArray(initialColumns) && initialColumns.length > 0
        ? initialColumns.map((c) => {
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
        updateData(updated)
      },
      afterCreateRow: () => {
        updateData(hot.getData() as Array<Array<string | number | boolean>>)
      },
      afterRemoveRow: () => {
        updateData(hot.getData() as Array<Array<string | number | boolean>>)
      },
      afterCreateCol: () => {
        updateData(hot.getData() as Array<Array<string | number | boolean>>)
      },
      afterRemoveCol: () => {
        updateData(hot.getData() as Array<Array<string | number | boolean>>)
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
  }, [initialColumns, initialData, activeView, updateData, updateSelectionState])

  // Resize grid when view changes (e.g. split view)
  useEffect(() => {
    if (hotInstanceRef.current) {
      setTimeout(() => {
        hotInstanceRef.current?.render()
      }, 50)
    }
  }, [activeView])

  // Apply change from formula bar to active cell
  const handleFormulaBarApply = () => {
    if (!hotInstanceRef.current) return
    const { row, col } = activeCellCoords
    hotInstanceRef.current.setDataAtCell(row, col, formulaValue)
    updateData(hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>)
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
          updateData(mod.data)
          if (mod.title) setTitle(mod.title)
          setAiNotice(mod.summary || `Applied: "${text}"`)
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

  // File Import handler
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseSpreadsheetBuffer(buffer, file.name)

      setTitle(parsed.title)
      setColumns(parsed.activeSheet.columns)
      updateData(parsed.activeSheet.data)

      if (hotInstanceRef.current) {
        hotInstanceRef.current.loadData(parsed.activeSheet.data)
        hotInstanceRef.current.updateSettings({
          colHeaders: parsed.activeSheet.columns.map((c) => c.title),
        })
      }

      setAiNotice(`Imported ${file.name} (${parsed.activeSheet.data.length} rows)`)
    } catch (err) {
      console.error('Import error:', err)
      alert('Could not parse file. Please upload a valid .xlsx or .csv.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    setColumns([...columns, { title: `Column ${columns.length + 1}`, type: 'text' }])
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

  // AutoSum helper
  const handleAutoSum = () => {
    if (!hotInstanceRef.current) return
    const { row, col } = activeCellCoords
    const aboveCoord = toExcelCoord(0, col)
    const endCoord = toExcelCoord(Math.max(0, row - 1), col)
    const formulaStr = `=SUM(${aboveCoord}:${endCoord})`
    setFormulaValue(formulaStr)
    hotInstanceRef.current.setDataAtCell(row, col, formulaStr)
    updateData(hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>)
  }

  // Export CSV
  const handleExportCSV = () => {
    if (!hotInstanceRef.current) return
    const exportPlugin = hotInstanceRef.current.getPlugin('exportFile')
    if (exportPlugin) {
      exportPlugin.downloadFile('csv', {
        filename: title.replace(/\s+/g, '_'),
        columnHeaders: true,
        rowHeaders: false,
      })
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F3F2F1] text-[#242424] font-sans select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* 1. TOP EXCEL TITLE BAR */}
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

        {/* Center: View Switcher (Spreadsheet, Split, Charts) */}
        <div className="flex items-center bg-black/25 rounded-lg p-0.5 text-[11px] font-semibold text-white/90 border border-white/20">
          <button
            type="button"
            onClick={() => setActiveView('spreadsheet')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeView === 'spreadsheet' ? 'bg-white text-[#107C41] shadow-2xs font-bold' : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span>▦ Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('split')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              activeView === 'split' ? 'bg-white text-[#107C41] shadow-2xs font-bold' : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span>◫ Split View</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('charts')
              if (charts.length === 0) {
                generateAICharts()
              }
            }}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'charts' ? 'bg-white text-[#107C41] shadow-2xs font-bold' : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>📊 Charts</span>
            {charts.length > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded-full bg-[#107C41] text-white">
                {charts.length}
              </span>
            )}
          </button>
        </div>

        {/* Right: Import, Export & Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
            title="Import existing Excel or CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white text-[#107C41] hover:bg-zinc-100 font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* 2. EXCEL RIBBON TABS */}
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
          onClick={() => {
            setActiveTab('charts')
            if (activeView === 'spreadsheet') setActiveView('split')
            if (charts.length === 0) generateAICharts()
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'charts'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI Charts</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-[#107C41] font-bold">
            ECharts
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'ai'
              ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
              : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
          }`}
        >
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
            {/* Clipboard Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={handleUndo}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer"
                title="Undo"
              >
                ↺
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer"
                title="Redo"
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
                className="w-7 h-7 italic rounded hover:bg-[#F3F2F1] text-zinc-800 flex items-center justify-center font-serif text-sm cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
            </div>

            {/* Cells: Insert / Delete */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={handleInsertRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs transition-colors cursor-pointer"
                title="Insert row below active cell"
              >
                <span className="font-bold text-[#107C41]">+</span> Row
              </button>
              <button
                onClick={handleInsertCol}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs transition-colors cursor-pointer"
                title="Insert column"
              >
                <span className="font-bold text-[#107C41]">+</span> Column
              </button>
              <button
                onClick={handleDeleteRow}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs transition-colors cursor-pointer"
                title="Delete active row"
              >
                - Del Row
              </button>
              <button
                onClick={handleDeleteCol}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs transition-colors cursor-pointer"
                title="Delete active column"
              >
                - Del Col
              </button>
            </div>

            {/* AutoSum */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoSum}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#107C41]/10 hover:bg-[#107C41]/20 text-[#107C41] font-bold text-xs transition-colors cursor-pointer"
                title="Calculate SUM of column"
              >
                <span className="text-sm font-serif">Σ</span> AutoSum
              </button>
            </div>
          </div>
        )}

        {/* Charts Ribbon Toolbar */}
        {activeTab === 'charts' && (
          <div className="flex items-center gap-3 w-full justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (activeView === 'spreadsheet') setActiveView('split')
                  generateAICharts()
                }}
                disabled={isGeneratingCharts}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#107C41] hover:bg-[#0D6234] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
              >
                {isGeneratingCharts ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Analyzing Sheet…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate AI Charts</span>
                  </>
                )}
              </button>

              <div className="h-5 w-px bg-zinc-200" />

              <span className="text-[11px] text-zinc-500 font-medium">Layout View:</span>
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveView('split')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeView === 'split' ? 'bg-white text-[#107C41] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Split View (Side-by-Side)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('charts')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeView === 'charts' ? 'bg-white text-[#107C41] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Full Charts Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('spreadsheet')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    activeView === 'spreadsheet' ? 'bg-white text-[#107C41] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Spreadsheet Only
                </button>
              </div>
            </div>

            <div className="text-[11px] text-emerald-800 bg-[#EAF5EE] border border-emerald-300/60 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Real-time sync: Editing cells immediately updates charts</span>
            </div>
          </div>
        )}

        {/* AI Assistant Ribbon Toolbar */}
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
          </div>
        )}

        {/* Insert Ribbon Toolbar */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleInsertRow}
              className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"
            >
              + Insert Row Below
            </button>
            <button
              onClick={handleInsertCol}
              className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"
            >
              + Insert Column Right
            </button>

            <div className="h-5 w-px bg-zinc-200 mx-1" />

            <button
              onClick={() => {
                setActiveView('split')
                setActiveTab('charts')
                generateAICharts()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EAF5EE] hover:bg-[#DDF7EA] text-[#107C41] font-semibold text-xs border border-emerald-300/60 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>+ Insert Recommended Charts</span>
            </button>
          </div>
        )}

        {/* Formulas Ribbon Toolbar */}
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
                    updateData(hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>)
                  }
                }}
                className="px-3 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-mono text-xs font-bold text-[#107C41] cursor-pointer"
              >
                {fn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. EXCEL FORMULA BAR (fx) - Only shown if spreadsheet is visible */}
      {activeView !== 'charts' && (
        <div className="h-7 bg-white border-b border-[#D4D4D4] px-2 flex items-center gap-1.5 text-xs z-10 flex-shrink-0">
          <div className="w-16 h-5.5 px-2 bg-white border border-[#C8C6C4] flex items-center justify-center font-mono font-semibold text-zinc-800 text-[11px] shadow-2xs">
            {activeCellAddress}
          </div>

          <div className="flex items-center gap-0.5 text-zinc-400">
            <button
              onClick={() => {
                if (hotInstanceRef.current) {
                  const val = hotInstanceRef.current.getDataAtCell(activeCellCoords.row, activeCellCoords.col)
                  setFormulaValue(val ? String(val) : '')
                }
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-red-600 rounded text-xs cursor-pointer"
              title="Cancel"
            >
              ✕
            </button>
            <button
              onClick={handleFormulaBarApply}
              className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-emerald-700 rounded text-xs font-bold cursor-pointer"
              title="Enter"
            >
              ✓
            </button>
            <button
              onClick={handleAutoSum}
              className="w-6 h-5 flex items-center justify-center hover:bg-zinc-100 text-[#107C41] font-serif font-bold text-xs cursor-pointer"
              title="Insert Function"
            >
              fx
            </button>
          </div>

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
      )}

      {/* Optional AI Notice Banner */}
      {aiNotice && (
        <div className="px-3 py-1 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between flex-shrink-0">
          <span className="truncate">
            <strong className="font-semibold text-[#107C41]">AI Context:</strong> {aiNotice}
          </span>
          <button
            onClick={() => setAiNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5. MAIN WORKSPACE (Spreadsheet, Split, or Charts) */}
      <main className="flex-1 w-full overflow-hidden bg-white flex">
        {/* Handsontable Grid Section (Visible in 'spreadsheet' and 'split' modes) */}
        {activeView !== 'charts' && (
          <div
            className={`h-full overflow-hidden bg-white ${
              activeView === 'split' ? 'w-1/2 border-r border-[#D4D4D4]' : 'w-full'
            }`}
          >
            <div ref={containerRef} className="w-full h-full text-xs" />
          </div>
        )}

        {/* Charts Dashboard Section (Visible in 'charts' and 'split' modes) */}
        {activeView !== 'spreadsheet' && (
          <div className={`h-full overflow-hidden ${activeView === 'split' ? 'w-1/2' : 'w-full'}`}>
            <ChartDashboard />
          </div>
        )}
      </main>

      {/* 6. BOTTOM SHEET TAB BAR & STATUS BAR (Only shown if spreadsheet is visible) */}
      {activeView !== 'charts' && (
        <footer className="h-7 bg-[#F3F2F1] border-t border-[#D4D4D4] px-3 flex items-center justify-between text-[11px] text-zinc-600 z-10 flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="flex items-center px-4 py-1 bg-white border-t-2 border-[#107C41] text-[#107C41] font-bold shadow-2xs cursor-pointer">
              Sheet1
            </div>
            <button
              onClick={handleInsertRow}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 font-bold cursor-pointer"
              title="Add more rows"
            >
              +
            </button>
          </div>

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
      )}
    </div>
  )
}
