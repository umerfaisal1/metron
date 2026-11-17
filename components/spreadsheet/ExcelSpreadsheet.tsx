'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import { registerAllModules } from 'handsontable/registry'
import SpreadsheetImportModal from './SpreadsheetImportModal'
import { exportToXLSX, exportToCSV } from '@/lib/spreadsheet-file'
import { useSpreadsheetStore } from '@/lib/store/useSpreadsheetStore'
import ChartSlide from '@/components/charts/ChartSlide'
import { parseSpreadsheetBuffer } from '@/lib/spreadsheet/fileParser'
import { ProcessedChartData } from '@/lib/charts/types'

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
  initialCharts?: ProcessedChartData[]
}

export default function ExcelSpreadsheet({
  initialTitle,
  initialColumns,
  initialData,
  sheetId,
  initialPrompt,
  initialMetadata,
  initialCharts,
}: ExcelSpreadsheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotInstanceRef = useRef<Handsontable | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The outer scrollable slides container
  const slidesContainerRef = useRef<HTMLDivElement>(null)
  // Refs for each slide section so we can scroll to them
  const slideRefsRef = useRef<(HTMLElement | null)[]>([])

  // Sheet tab name
  const [sheetName, setSheetName] = useState<string>('Sheet1')

  // Zustand Store
  const {
    title,
    columns,
    data: gridData,
    charts,
    isGeneratingCharts,
    overallInsight,
    saveStatus,
    isSaving,
    setWorkbook,
    setTitle,
    setColumns,
    updateData,
    setSaveStatus,
    setIsSaving,
    setCharts,
    generateAICharts,
    removeChart,
  } = useSpreadsheetStore()

  // Track which slide is currently in view (0 = spreadsheet, 1+ = charts)
  const [activeSlide, setActiveSlide] = useState(0)

  // Import / Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Active Ribbon Tab
  const [activeTab, setActiveTab] = useState<'home' | 'ai' | 'insert' | 'formulas'>('home')

  // Formula bar state
  const [activeCellCoords, setActiveCellCoords] = useState<{ row: number; col: number }>({ row: 0, col: 0 })
  const [activeCellAddress, setActiveCellAddress] = useState<string>('A1')
  const [formulaValue, setFormulaValue] = useState<string>('')

  // Bottom status bar selection metrics
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
      charts: initialCharts || [],
    })
  }, [sheetId, initialTitle, initialColumns, initialData, initialMetadata, initialCharts, setWorkbook])

  // ── Slide navigation ────────────────────────────────────────────────────────

  // Total slides: 1 spreadsheet + N charts
  const totalSlides = 1 + charts.length

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefsRef.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // IntersectionObserver to track which slide is active (for nav dots)
  useEffect(() => {
    const container = slidesContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.slideIndex)
            if (!isNaN(idx)) setActiveSlide(idx)
          }
        })
      },
      { root: container, threshold: 0.5 }
    )

    // We observe via a second pass once refs are set
    const slides = container.querySelectorAll('[data-slide-index]')
    slides.forEach((s) => observer.observe(s))

    return () => observer.disconnect()
  // Re-run when chart count changes so new chart slides get observed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts.length])

  // ── Handsontable ────────────────────────────────────────────────────────────

  const toExcelCoord = (row: number, col: number) => {
    let colStr = ''
    let c = col
    while (c >= 0) {
      colStr = String.fromCharCode((c % 26) + 65) + colStr
      c = Math.floor(c / 26) - 1
    }
    return `${colStr}${row + 1}`
  }

  const updateSelectionState = useCallback((r1: number, c1: number, r2?: number, c2?: number) => {
    if (!hotInstanceRef.current) return
    const hot = hotInstanceRef.current

    setActiveCellCoords({ row: r1, col: c1 })
    setActiveCellAddress(toExcelCoord(r1, c1))
    const val = hot.getDataAtCell(r1, c1)
    setFormulaValue(val !== null && val !== undefined ? String(val) : '')

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

  useEffect(() => {
    if (!containerRef.current) return

    const initialRows =
      Array.isArray(initialData) && initialData.length > 0
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialColumns, initialData, updateData, updateSelectionState])

  // ── Formula bar ─────────────────────────────────────────────────────────────

  const handleFormulaBarApply = () => {
    if (!hotInstanceRef.current) return
    const { row, col } = activeCellCoords
    hotInstanceRef.current.setDataAtCell(row, col, formulaValue)
    updateData(hotInstanceRef.current.getData() as Array<Array<string | number | boolean>>)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

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
          charts,
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

  // ── AI Modify ───────────────────────────────────────────────────────────────

  const handleAiModify = async (instructionToRun?: string) => {
    const text = (instructionToRun || aiInstruction).trim()
    if (!text) return

    setIsAiProcessing(true)
    setAiNotice('Metron Agent is working on your spreadsheet…')

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

          let noticeMsg = json.message || mod.summary || `Applied: "${text}"`
          if (Array.isArray(json.steps) && json.steps.length > 0) {
            const toolNames = json.steps.map((s: { toolName: string }) => s.toolName).join(', ')
            noticeMsg = `Agent [${toolNames}]: ${noticeMsg}`
          }
          setAiNotice(noticeMsg)
          setAiInstruction('')

          if (hotInstanceRef.current) {
            hotInstanceRef.current.loadData(mod.data)
            hotInstanceRef.current.updateSettings({
              colHeaders: mod.columns.map((c: ColumnDef) => c.title || 'Column'),
            })
          }
        }

        if (Array.isArray(json.charts) && json.charts.length > 0) {
          setCharts(json.charts)
          // Scroll to first chart slide
          setTimeout(() => scrollToSlide(1), 300)
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

  // ── Import ──────────────────────────────────────────────────────────────────

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

  // ── Table Actions ───────────────────────────────────────────────────────────

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
    if (hot?.undo) hot.undo()
    else hot?.getPlugin?.('undoRedo')?.undo()
  }

  const handleRedo = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hot = hotInstanceRef.current as any
    if (hot?.redo) hot.redo()
    else hot?.getPlugin?.('undoRedo')?.redo()
  }

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

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExportXLSX = () => {
    setIsExportMenuOpen(false)
    const hot = hotInstanceRef.current
    const currentData = hot ? (hot.getData() as Array<Array<string | number | boolean>>) : gridData
    try {
      exportToXLSX({ title, sheetName, columns, data: currentData })
      setFeedbackNotice({ type: 'success', message: `Exported as "${title || 'spreadsheet'}.xlsx"` })
    } catch (err: unknown) {
      setFeedbackNotice({ type: 'error', message: err instanceof Error ? err.message : 'Export failed.' })
    }
  }

  const handleExportCSV = () => {
    setIsExportMenuOpen(false)
    const hot = hotInstanceRef.current
    const currentData = hot ? (hot.getData() as Array<Array<string | number | boolean>>) : gridData
    try {
      exportToCSV({ title, columns, data: currentData })
      setFeedbackNotice({ type: 'success', message: `Exported as "${title || 'spreadsheet'}.csv"` })
    } catch (err: unknown) {
      setFeedbackNotice({ type: 'error', message: err instanceof Error ? err.message : 'Export failed.' })
    }
  }

  // ── Import Complete ─────────────────────────────────────────────────────────

  const handleImportComplete = (result: {
    sheetName: string
    columns: ColumnDef[]
    data: Array<Array<string | number | boolean>>
    newTitle?: string
  }) => {
    setColumns(result.columns)
    updateData(result.data)
    if (result.newTitle) setTitle(result.newTitle)
    if (result.sheetName) setSheetName(result.sheetName)
    setSaveStatus('Unsaved edits')

    if (hotInstanceRef.current) {
      hotInstanceRef.current.loadData(result.data)
      hotInstanceRef.current.updateSettings({
        colHeaders: result.columns.map((c) => c.title || 'Column'),
        columns: result.columns.map((c) => {
          if (c.type === 'dropdown' && Array.isArray(c.source)) return { type: 'dropdown', source: c.source }
          if (c.type === 'numeric') return { type: 'numeric' }
          return { type: 'text' }
        }),
      })
    }

    setFeedbackNotice({
      type: 'success',
      message: `Imported "${result.sheetName}" (${result.data.length} rows, ${result.columns.length} columns)`,
    })
  }

  // ── Generate charts and scroll to them ─────────────────────────────────────

  const handleGenerateCharts = async () => {
    await generateAICharts()
    setTimeout(() => scrollToSlide(1), 400)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F3F2F1] text-[#242424] font-sans select-none">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />

      {/* ── 1. TOP TITLE BAR ──────────────────────────────────────────────── */}
      <header className="h-10 bg-[#107C41] text-white px-3 flex items-center justify-between text-xs shadow-xs z-30 flex-shrink-0">
        {/* Left: Back + file name */}
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

          <div className="hidden sm:flex items-center gap-1 text-white/80">
            <button onClick={handleSave} className="p-1 rounded hover:bg-white/20 transition-colors" title="Save">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            <button onClick={handleUndo} className="p-1 rounded hover:bg-white/20 transition-colors" title="Undo">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4" />
              </svg>
            </button>
            <button onClick={handleRedo} className="p-1 rounded hover:bg-white/20 transition-colors" title="Redo">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          <div className="h-4 w-px bg-white/30 hidden sm:block" />

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

          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            <span>{saveStatus}</span>
          </div>
        </div>

        {/* Center: slide nav dots */}
        <div className="flex items-center gap-1.5">
          {/* Dot for spreadsheet slide */}
          <button
            type="button"
            onClick={() => scrollToSlide(0)}
            title="Spreadsheet"
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              activeSlide === 0 ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
            }`}
          />
          {/* Dots for chart slides */}
          {charts.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToSlide(i + 1)}
              title={`Chart ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                activeSlide === i + 1 ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
          {charts.length > 0 && (
            <span className="text-white/60 text-[10px] ml-1 font-mono">
              {activeSlide === 0 ? 'Sheet' : `Chart ${activeSlide}/${charts.length}`}
            </span>
          )}
        </div>

        {/* Right: Import / Export / Save */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0D6234] hover:bg-[#0A4F2A] font-semibold text-[11px] transition-colors cursor-pointer"
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
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 z-50 text-xs text-zinc-800">
                  <button
                    type="button"
                    onClick={handleExportXLSX}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#107C41] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-5 h-5 rounded bg-emerald-100 text-[#107C41] flex items-center justify-center font-bold text-[10px]">XLS</span>
                    <div>
                      <div className="font-semibold text-xs">Excel Workbook</div>
                      <div className="text-[10px] text-zinc-400">Download .xlsx</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#107C41] flex items-center gap-2 cursor-pointer transition-colors border-t border-zinc-100"
                  >
                    <span className="w-5 h-5 rounded bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-[10px]">CSV</span>
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

      {/* ── Feedback Banner ────────────────────────────────────────────────── */}
      {feedbackNotice && (
        <div
          role="status"
          className={`px-3 py-1.5 border-b text-[11px] flex items-center justify-between flex-shrink-0 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedbackNotice.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <span className="truncate">{feedbackNotice.message}</span>
          <button type="button" onClick={() => setFeedbackNotice(null)} className="ml-2 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 2. RIBBON TABS ────────────────────────────────────────────────── */}
      <div className="bg-[#FAF9F8] border-b border-[#E1DFDD] px-3 pt-1 flex items-center gap-1 text-xs font-medium z-20 flex-shrink-0">
        {(['home', 'ai', 'insert', 'formulas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-t text-xs font-semibold transition-colors cursor-pointer border-b-2 capitalize ${
              activeTab === tab
                ? 'text-[#107C41] border-[#107C41] bg-white font-bold shadow-2xs'
                : 'text-zinc-600 border-transparent hover:bg-zinc-200/60'
            }`}
          >
            {tab === 'ai' ? (
              <span className="flex items-center gap-1.5">
                AI Assistant
                <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-[#107C41] font-bold">Gemini</span>
              </span>
            ) : (
              tab.charAt(0).toUpperCase() + tab.slice(1)
            )}
          </button>
        ))}
      </div>

      {/* ── 3. RIBBON ACTION TOOLBAR ──────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E1DFDD] px-3 py-1.5 min-h-[52px] flex items-center gap-4 text-xs z-20 flex-shrink-0 overflow-x-auto">
        {/* Home */}
        {activeTab === 'home' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 pr-3 border-r border-[#E1DFDD]">
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs cursor-pointer">
                <svg className="w-3.5 h-3.5 text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import
              </button>
              <button onClick={handleExportXLSX} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs cursor-pointer">
                <svg className="w-3.5 h-3.5 text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                XLSX
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F2F1] text-zinc-700 font-medium text-xs cursor-pointer">
                <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                CSV
              </button>
            </div>

            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button onClick={handleUndo} className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer" title="Undo">↺</button>
              <button onClick={handleRedo} className="p-1.5 rounded hover:bg-[#F3F2F1] text-zinc-700 cursor-pointer" title="Redo">↻</button>
            </div>

            <div className="flex items-center gap-1 pr-3 border-r border-[#E1DFDD]">
              <button
                onClick={() => { const hot = hotInstanceRef.current; if (!hot) return; const sel = hot.getSelectedLast(); if (!sel) return; hot.setCellMeta(sel[0], sel[1], 'className', 'htBold'); hot.render() }}
                className="w-7 h-7 font-bold rounded hover:bg-[#F3F2F1] text-zinc-800 flex items-center justify-center font-serif text-sm cursor-pointer" title="Bold"
              >B</button>
              <button
                onClick={() => { const hot = hotInstanceRef.current; if (!hot) return; const sel = hot.getSelectedLast(); if (!sel) return; hot.setCellMeta(sel[0], sel[1], 'className', 'htItalic'); hot.render() }}
                className="w-7 h-7 italic rounded hover:bg-[#F3F2F1] text-zinc-800 flex items-center justify-center font-serif text-sm cursor-pointer" title="Italic"
              >I</button>
            </div>

            <div className="flex items-center gap-1.5 pr-3 border-r border-[#E1DFDD]">
              <button onClick={handleInsertRow} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"><span className="font-bold text-[#107C41]">+</span> Row</button>
              <button onClick={handleInsertCol} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer"><span className="font-bold text-[#107C41]">+</span> Col</button>
              <button onClick={handleDeleteRow} className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs cursor-pointer">– Row</button>
              <button onClick={handleDeleteCol} className="flex items-center gap-1 px-2 py-1 rounded bg-[#F3F2F1] hover:bg-red-50 hover:text-red-700 font-medium text-xs cursor-pointer">– Col</button>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={handleAutoSum} className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#107C41]/10 hover:bg-[#107C41]/20 text-[#107C41] font-bold text-xs cursor-pointer">
                <span className="text-sm font-serif">Σ</span> AutoSum
              </button>
            </div>
          </div>
        )}

        {/* AI Assistant */}
        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col gap-2 w-full py-0.5">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAiModify() }}
                  placeholder="Ask Metron Agent to edit spreadsheet or create charts…"
                  disabled={isAiProcessing}
                  className="w-full px-3 py-1.5 rounded border border-[#C8C6C4] bg-[#FAF9F8] text-xs focus:bg-white focus:outline-none focus:border-[#107C41] focus:ring-1 focus:ring-[#107C41]"
                />
              </div>
              <button
                onClick={() => handleAiModify()}
                disabled={isAiProcessing || !aiInstruction.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#107C41] hover:bg-[#0D6234] text-white font-semibold text-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {isAiProcessing ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Agent Working…</span>
                  </>
                ) : (
                  <>
                    <span>Run Agent</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-zinc-400 font-medium text-[10px]">Quick:</span>
              {[
                ['Add a 15% Tax column', '+ Tax'],
                ['Add a Summary Total row at the bottom', 'Σ Totals'],
                ['Create executive charts for this data', '📊 Charts'],
              ].map(([prompt, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAiModify(prompt)}
                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-emerald-50 hover:text-[#107C41] text-zinc-600 border border-zinc-200 transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium hidden md:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gemini Tool Calling
              </span>
            </div>
          </div>
        )}

        {/* Insert */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleInsertRow} className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer">+ Insert Row Below</button>
            <button onClick={handleInsertCol} className="px-3 py-1.5 rounded bg-[#F3F2F1] hover:bg-[#E1DFDD] font-medium text-xs cursor-pointer">+ Insert Column Right</button>
            <div className="h-5 w-px bg-zinc-200 mx-1" />
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#107C41]/10 hover:bg-[#107C41]/20 text-[#107C41] font-semibold text-xs cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import File
            </button>
            <button
              onClick={handleGenerateCharts}
              disabled={isGeneratingCharts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EAF5EE] hover:bg-[#DDF7EA] text-[#107C41] font-semibold text-xs border border-emerald-300/60 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingCharts ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )}
              {isGeneratingCharts ? 'Generating…' : '+ AI Charts'}
            </button>
          </div>
        )}

        {/* Formulas */}
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

      {/* ── 4. FORMULA BAR ────────────────────────────────────────────────── */}
      {/* Always visible — spreadsheet is always the first slide */}
      <div className="h-7 bg-white border-b border-[#D4D4D4] px-2 flex items-center gap-1.5 text-xs z-10 flex-shrink-0">
        <div className="w-16 h-5.5 px-2 bg-white border border-[#C8C6C4] flex items-center justify-center font-mono font-semibold text-zinc-800 text-[11px] shadow-2xs">
          {activeCellAddress}
        </div>
        <div className="flex items-center gap-0.5 text-zinc-400">
          <button onClick={() => { if (hotInstanceRef.current) { const val = hotInstanceRef.current.getDataAtCell(activeCellCoords.row, activeCellCoords.col); setFormulaValue(val ? String(val) : '') } }} className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-red-600 rounded text-xs cursor-pointer" title="Cancel">✕</button>
          <button onClick={handleFormulaBarApply} className="w-5 h-5 flex items-center justify-center hover:bg-zinc-100 hover:text-emerald-700 rounded text-xs font-bold cursor-pointer" title="Enter">✓</button>
          <button onClick={handleAutoSum} className="w-6 h-5 flex items-center justify-center hover:bg-zinc-100 text-[#107C41] font-serif font-bold text-xs cursor-pointer" title="Insert Function">fx</button>
        </div>
        <div className="flex-1 h-5.5 relative">
          <input
            type="text"
            value={formulaValue}
            onChange={(e) => setFormulaValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFormulaBarApply() }}
            onBlur={handleFormulaBarApply}
            className="w-full h-full px-2 text-xs font-mono text-zinc-900 bg-transparent border-none focus:outline-none focus:bg-white"
            placeholder="Type value or formula (e.g. =SUM(A1:A10))"
          />
        </div>
      </div>

      {/* ── AI Notice ─────────────────────────────────────────────────────── */}
      {aiNotice && (
        <div className="px-3 py-1 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between flex-shrink-0">
          <span className="truncate">
            <strong className="font-semibold text-[#107C41]">AI:</strong> {aiNotice}
          </span>
          <button onClick={() => setAiNotice(null)} className="text-emerald-600 hover:text-emerald-800 ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── 5. SLIDES CONTAINER ───────────────────────────────────────────── */}
      {/*
        overflow-y-auto + snap-y mandatory = vertical scroll snap
        Each slide is h-full (100% of this container)
      */}
      <div
        ref={slidesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* ── SLIDE 0: Spreadsheet ─────────────────────────────────────── */}
        <section
          ref={(el) => { slideRefsRef.current[0] = el }}
          data-slide-index={0}
          className="relative flex flex-col bg-white"
          style={{ height: '100%', scrollSnapAlign: 'start' }}
        >
          {/* Grid */}
          <div className="flex-1 overflow-hidden">
            <div ref={containerRef} className="w-full h-full text-xs" />
          </div>

          {/* Footer: Sheet tabs + status + scroll-to-charts hint */}
          <footer className="h-7 bg-[#F3F2F1] border-t border-[#D4D4D4] px-3 flex items-center justify-between text-[11px] text-zinc-600 z-10 flex-shrink-0">
            <div className="flex items-center gap-1">
              <div className="flex items-center px-4 py-1 bg-white border-t-2 border-[#107C41] text-[#107C41] font-bold shadow-2xs cursor-pointer select-none truncate max-w-xs">
                {sheetName}
              </div>
              <button type="button" onClick={handleInsertRow} className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 font-bold cursor-pointer" title="Add row">+</button>
            </div>

            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="flex items-center gap-4 font-mono text-[11px]">
                {selectionStats.hasNumbers && (
                  <>
                    <span>Avg: <strong className="text-zinc-800">{selectionStats.avg}</strong></span>
                    <span>Sum: <strong className="text-zinc-800">{selectionStats.sum}</strong></span>
                  </>
                )}
                <span>Count: <strong className="text-zinc-800">{selectionStats.count}</strong></span>
                <span className="hidden sm:inline text-zinc-400">|</span>
                <span className="hidden sm:inline font-sans text-emerald-800 font-semibold">Ready</span>
              </div>

              {/* Scroll-down hint (only when charts exist) */}
              {charts.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToSlide(1)}
                  className="flex items-center gap-1 text-[10px] text-[#107C41] font-semibold hover:underline cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {charts.length} chart{charts.length !== 1 ? 's' : ''} ↓
                </button>
              )}
            </div>
          </footer>
        </section>

        {/* ── SLIDES 1..N: One per chart ───────────────────────────────── */}
        {charts.map((chart, i) => (
          <section
            key={chart.recommendation.id}
            ref={(el) => { slideRefsRef.current[i + 1] = el }}
            data-slide-index={i + 1}
            style={{ height: '100%', scrollSnapAlign: 'start' }}
          >
            <ChartSlide
              chart={chart}
              index={i}
              total={charts.length}
              overallInsight={overallInsight}
              onRemove={removeChart}
              onScrollUp={() => scrollToSlide(i)} // prev slide
              onScrollDown={() => scrollToSlide(i + 2)} // next chart slide
            />
          </section>
        ))}

        {/* ── Empty charts state (after spreadsheet slide) ─────────────── */}
        {charts.length === 0 && !isGeneratingCharts && (
          <section
            ref={(el) => { slideRefsRef.current[1] = el }}
            data-slide-index={1}
            className="flex items-center justify-center bg-gradient-to-br from-[#F8FAF8] to-[#F0F7F0]"
            style={{ height: '100%', scrollSnapAlign: 'start' }}
          >
            <div className="text-center space-y-5 p-10 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#EAF5EE] text-[#107C41] mx-auto flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">No Charts Yet</h3>
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                  Metron AI will analyze your data and create beautiful chart slides automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateCharts}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#107C41] hover:bg-[#0D6234] shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate AI Charts
              </button>
            </div>
          </section>
        )}

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {isGeneratingCharts && (
          <section
            className="flex items-center justify-center bg-gradient-to-br from-[#F8FAF8] to-[#F0F7F0]"
            style={{ height: '100%', scrollSnapAlign: 'start' }}
          >
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-200 border-t-[#107C41] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-zinc-700">Analyzing data &amp; generating charts…</p>
              <p className="text-xs text-zinc-400">Metron Agent is evaluating distributions and building visualizations</p>
            </div>
          </section>
        )}
      </div>

      {/* ── Right-side slide dots (floating) ──────────────────────────────── */}
      {totalSlides > 1 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToSlide(i)}
              title={i === 0 ? 'Spreadsheet' : `Chart ${i}`}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer shadow-sm ${
                activeSlide === i
                  ? 'bg-[#107C41] scale-150'
                  : 'bg-zinc-300 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      )}

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
