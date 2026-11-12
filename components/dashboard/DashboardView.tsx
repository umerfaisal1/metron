'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SignOutButton from '@/components/SignOutButton'
import { ColumnDef } from '@/components/spreadsheet/HandsontableEditor'

// Dynamically import HandsontableEditor with ssr disabled to guarantee DOM-only execution
const HandsontableEditor = dynamic(
  () => import('@/components/spreadsheet/HandsontableEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E2E8E4] p-8 text-zinc-400">
        <svg className="w-8 h-8 animate-spin text-[#0D361C] mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-medium text-zinc-500">Loading Handsontable engine...</span>
      </div>
    ),
  }
)

interface SpreadsheetRecord {
  id: string
  title: string
  prompt?: string | null
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
  metadata?: {
    summary?: string
    notes?: string
  }
  updated_at?: string
}

interface DashboardViewProps {
  userEmail?: string | null
  userName?: string
}

// Initial starter dataset (Monthly Expense & Mess Food Calculator from user requirements)
const INITIAL_SPREADSHEET: SpreadsheetRecord = {
  id: 'starter-1',
  title: 'Monthly Expense & Mess Food Calculator',
  prompt: 'Make me a custom monthly expense calculator with calendar days for mess food at Rs. 500/day, category totals, and overall expenditure.',
  columns: [
    { title: 'Date', type: 'text', width: 110 },
    { title: 'Day', type: 'text', width: 90 },
    { title: 'Mess Food (Rs. 500)', type: 'dropdown', source: ['YES', 'NO'], width: 150 },
    { title: 'Mess Cost (Rs.)', type: 'numeric', width: 120 },
    { title: 'Other Category', type: 'dropdown', source: ['Transportation', 'Shopping', 'Entertainment', 'Groceries', 'Utilities'], width: 140 },
    { title: 'Other Cost (Rs.)', type: 'numeric', width: 120 },
    { title: 'Daily Total (Rs.)', type: 'numeric', width: 130 },
  ],
  data: [
    ['2025-11-01', 'Saturday', 'YES', 500, 'Transportation', 350, 850],
    ['2025-11-02', 'Sunday', 'YES', 500, 'Shopping', 1200, 1700],
    ['2025-11-03', 'Monday', 'YES', 500, 'Entertainment', 600, 1100],
    ['2025-11-04', 'Tuesday', 'NO', 0, 'Groceries', 800, 800],
    ['2025-11-05', 'Wednesday', 'YES', 500, 'Transportation', 400, 900],
    ['2025-11-06', 'Thursday', 'YES', 500, 'Utilities', 1500, 2000],
    ['2025-11-07', 'Friday', 'NO', 0, 'Shopping', 950, 950],
    ['2025-11-08', 'Saturday', 'YES', 500, 'Transportation', 300, 800],
  ],
  metadata: {
    summary: 'Custom monthly expense tracker with daily mess toggle (Rs. 500) and categorized out-of-pocket expenses.',
    notes: 'You can edit any cell directly in Handsontable or type a new prompt to regenerate.',
  },
}

export default function DashboardView({
  userEmail = 'usman@metron.ai',
  userName = 'Usman',
}: DashboardViewProps) {
  const [activeSheet, setActiveSheet] = useState<SpreadsheetRecord>(INITIAL_SPREADSHEET)
  const [promptInput, setPromptInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('Ready')
  const [savedSheets, setSavedSheets] = useState<SpreadsheetRecord[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(INITIAL_SPREADSHEET.title)

  // Fetch saved spreadsheets from Supabase on load
  const loadSavedSpreadsheets = useCallback(async () => {
    try {
      const res = await fetch('/api/spreadsheets')
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.spreadsheets) && json.spreadsheets.length > 0) {
          setSavedSheets(json.spreadsheets)
        }
      }
    } catch (e) {
      console.warn('Could not load saved spreadsheets from Supabase:', e)
    }
  }, [])

  useEffect(() => {
    loadSavedSpreadsheets()
  }, [loadSavedSpreadsheets])

  // Handle Gemini prompt generation
  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || promptInput).trim()
    if (!promptToUse) return

    setIsGenerating(true)
    setSaveStatus('Generating via Gemini API...')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse, saveToDb: true }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate spreadsheet')
      }

      if (json.spreadsheet) {
        const newSheet: SpreadsheetRecord = {
          id: json.spreadsheet.id || `sheet-${Date.now()}`,
          title: json.spreadsheet.title || 'Untitled Spreadsheet',
          prompt: promptToUse,
          columns: json.spreadsheet.columns || [],
          data: json.spreadsheet.data || [],
          metadata: {
            summary: json.spreadsheet.summary,
            notes: json.spreadsheet.metadata?.notes,
          },
        }

        setActiveSheet(newSheet)
        setTempTitle(newSheet.title)
        setSaveStatus('Saved to Supabase')
        loadSavedSpreadsheets()
      }
    } catch (err: unknown) {
      console.error('Generation error:', err)
      alert(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setSaveStatus('Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle cell data changes inside Handsontable
  const handleGridDataChange = (newData: Array<Array<string | number | boolean>>) => {
    setActiveSheet((prev) => ({
      ...prev,
      data: newData,
    }))
    setSaveStatus('Unsaved edits')
  }

  // Save active spreadsheet changes to Supabase
  const handleSaveToDatabase = async () => {
    setIsSaving(true)
    setSaveStatus('Saving to Supabase...')

    try {
      const res = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeSheet.id,
          title: activeSheet.title,
          prompt: activeSheet.prompt,
          columns: activeSheet.columns,
          data: activeSheet.data,
          metadata: activeSheet.metadata,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        if (json.spreadsheet?.id) {
          setActiveSheet((prev) => ({ ...prev, id: json.spreadsheet.id }))
        }
        setSaveStatus('Saved to Supabase')
        loadSavedSpreadsheets()
      } else {
        throw new Error(json.error || 'Failed to save')
      }
    } catch (err: unknown) {
      console.error('Save error:', err)
      setSaveStatus('Error saving')
    } finally {
      setIsSaving(false)
    }
  }

  // Load a spreadsheet from list
  const handleSelectSheet = (sheet: SpreadsheetRecord) => {
    setActiveSheet(sheet)
    setTempTitle(sheet.title)
    setSaveStatus('Loaded from Cloud')
    setSidebarOpen(false)
  }

  // Delete a spreadsheet
  const handleDeleteSheet = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this spreadsheet?')) return

    try {
      await fetch(`/api/spreadsheets?id=${id}`, { method: 'DELETE' })
      setSavedSheets((prev) => prev.filter((s) => s.id !== id))
      if (activeSheet.id === id) {
        setActiveSheet(INITIAL_SPREADSHEET)
        setTempTitle(INITIAL_SPREADSHEET.title)
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Start fresh blank spreadsheet
  const handleNewBlankSheet = () => {
    const blank: SpreadsheetRecord = {
      id: `local-${Date.now()}`,
      title: 'Blank Spreadsheet',
      prompt: null,
      columns: [
        { title: 'A', type: 'text', width: 120 },
        { title: 'B', type: 'text', width: 120 },
        { title: 'C', type: 'text', width: 120 },
        { title: 'D', type: 'text', width: 120 },
        { title: 'E', type: 'text', width: 120 },
      ],
      data: [
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
      ],
      metadata: {
        summary: 'Blank spreadsheet grid with live cell editing.',
      },
    }
    setActiveSheet(blank)
    setTempTitle(blank.title)
    setSaveStatus('Unsaved')
  }

  const suggestedPrompts = [
    'Monthly expense calculator with Rs. 500/day mess food toggle and category totals',
    'Q4 Enterprise Sales Pipeline with deal sizes, win probabilities, and weighted ARR',
    'Startup 12-month runway and cash burn forecast with hiring plans',
    'Marketing campaign ROI tracker with ad spend, conversions, and CAC',
  ]

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#0D1F14] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur border-b border-[#E5EAE7] px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Logo & Saved Sheets Drawer Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="relative h-8 w-28">
              <Image
                src="/logo.png"
                alt="Metron Logo"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F7F4] hover:bg-[#EAEFEA] border border-[#DEE6E0] text-[#0D361C] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>My Sheets</span>
            {savedSheets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0D361C] text-white text-[10px]">
                {savedSheets.length}
              </span>
            )}
          </button>
        </div>

        {/* Center: Inline Title Editor */}
        <div className="hidden md:flex items-center gap-2 max-w-md">
          {editingTitle ? (
            <input
              type="text"
              value={tempTitle}
              autoFocus
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={() => {
                setActiveSheet((prev) => ({ ...prev, title: tempTitle }))
                setEditingTitle(false)
                setSaveStatus('Unsaved edits')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveSheet((prev) => ({ ...prev, title: tempTitle }))
                  setEditingTitle(false)
                  setSaveStatus('Unsaved edits')
                }
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#0D361C] bg-[#F7FAF7] focus:outline-none"
            />
          ) : (
            <div
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#F2F6F3] text-xs font-bold text-zinc-900 cursor-pointer truncate"
              title="Click to rename"
            >
              <span className="truncate">{activeSheet.title}</span>
              <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}

          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              saveStatus.includes('Saved')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : saveStatus.includes('Unsaved')
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}
          >
            {saveStatus}
          </span>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F4F7F4] border border-[#DCE4DE] text-zinc-800 transition-colors shadow-2xs cursor-pointer"
          >
            {isSaving ? (
              <svg className="w-3.5 h-3.5 animate-spin text-[#0D361C]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            <span className="hidden sm:inline">Save to Supabase</span>
            <span className="sm:hidden">Save</span>
          </button>

          <button
            type="button"
            onClick={handleNewBlankSheet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0D361C] hover:bg-[#144D28] text-white transition-colors shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Blank</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#E5EAE7]">
            <span className="text-xs font-medium text-zinc-600">{userName}</span>
            <SignOutButton className="p-1 border-0 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg text-xs" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Core MVP Feature: AI Spreadsheet Prompt Bar */}
        <section className="rounded-2xl bg-gradient-to-b from-[#F2F8F4] via-[#F8FAF8] to-white border border-[#D7E4DC] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#0D361C] text-white flex items-center justify-center text-xs shadow-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                AI Spreadsheet Generator
              </h2>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#DCE4DE] text-[11px] font-medium text-emerald-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gemini API Engine</span>
            </div>
          </div>

          {/* Prompt Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleGenerate()
            }}
            className="flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Describe what spreadsheet you want to generate in plain English…"
                disabled={isGenerating}
                className="w-full px-4 py-3 rounded-xl border border-[#D9E3DC] bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0D361C]/20 focus:border-[#0D361C] text-xs sm:text-sm shadow-xs transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !promptInput.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] active:bg-[#082211] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating Sheet...</span>
                </>
              ) : (
                <>
                  <span>Generate with AI</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Suggested Quick Prompts */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-zinc-400 font-medium mr-1">Quick ideas:</span>
            {suggestedPrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPromptInput(s)
                  handleGenerate(s)
                }}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EEF5F0] border border-[#DEE6E0] hover:border-emerald-400 text-zinc-600 hover:text-[#0D361C] text-[11px] transition-colors cursor-pointer text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Spreadsheet Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              {activeSheet.title}
              <span className="text-[10px] font-semibold text-emerald-800 bg-[#DDF7EA] border border-emerald-300 px-2 py-0.5 rounded-full">
                Handsontable Grid
              </span>
            </h1>
            {activeSheet.metadata?.summary && (
              <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
                {activeSheet.metadata.summary}
              </p>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
            <span>Powered by Handsontable (Free CE)</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Editable Grid</span>
          </div>
        </div>

        {/* Live Editable Handsontable Component */}
        <HandsontableEditor
          key={activeSheet.id}
          data={activeSheet.data}
          columns={activeSheet.columns}
          onDataChange={handleGridDataChange}
        />
      </div>

      {/* Slide-Over Drawer: My Saved Spreadsheets from Supabase */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-2xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E5EAE7] flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#EAEFEA] flex items-center justify-between bg-[#F8FAF8]">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">My Saved Spreadsheets</h3>
                <p className="text-[11px] text-zinc-500">Stored in Supabase PostgreSQL</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sheets List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {savedSheets.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  <p>No saved spreadsheets yet in Supabase.</p>
                  <p className="mt-1">Click &ldquo;Save to Supabase&rdquo; on the current sheet to store it.</p>
                </div>
              ) : (
                savedSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    onClick={() => handleSelectSheet(sheet)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between group ${
                      activeSheet.id === sheet.id
                        ? 'bg-[#F2FAF5] border-emerald-300 ring-1 ring-emerald-300'
                        : 'bg-white hover:bg-[#F9FAF9] border-[#E5EAE7]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C] truncate">
                        {sheet.title}
                      </h4>
                      {sheet.prompt && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          &ldquo;{sheet.prompt}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1.5">
                        <span>{Array.isArray(sheet.data) ? sheet.data.length : 0} rows</span>
                        <span>•</span>
                        <span>{Array.isArray(sheet.columns) ? sheet.columns.length : 0} cols</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSheet(e, sheet.id)}
                      className="text-zinc-300 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                      title="Delete spreadsheet"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#EAEFEA] bg-[#FAFBF9]">
              <button
                type="button"
                onClick={() => {
                  handleNewBlankSheet()
                  setSidebarOpen(false)
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
