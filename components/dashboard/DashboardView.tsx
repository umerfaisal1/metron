'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SignOutButton from '@/components/SignOutButton'
import ImportModal from '@/components/dashboard/ImportModal'

interface SpreadsheetSummary {
  id: string
  title: string
  prompt?: string | null
  columns?: Array<{ title: string; type?: string; width?: number }>
  data?: Array<Array<string | number | boolean>>
  created_at?: string
  updated_at?: string
  metadata?: {
    summary?: string
    notes?: string
  }
}

interface DashboardViewProps {
  userEmail?: string | null
  userName?: string
}

export default function DashboardView({
  userEmail = 'usman@metron.ai',
  userName = 'Usman',
}: DashboardViewProps) {
  const router = useRouter()
  const [promptInput, setPromptInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedSheets, setSavedSheets] = useState<SpreadsheetSummary[]>([])
  const [loadingSheets, setLoadingSheets] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Fetch saved spreadsheets from Supabase
  useEffect(() => {
    let isMounted = true
    const fetchSheets = async () => {
      try {
        const res = await fetch('/api/spreadsheets')
        if (res.ok) {
          const json = await res.json()
          if (isMounted && Array.isArray(json.spreadsheets)) {
            setSavedSheets(json.spreadsheets)
          }
        }
      } catch (e) {
        console.warn('Could not load saved spreadsheets from Supabase:', e)
      } finally {
        if (isMounted) {
          setLoadingSheets(false)
        }
      }
    }

    fetchSheets()
    return () => {
      isMounted = false
    }
  }, [])

  // Generate spreadsheet with Gemini and navigate to /sheets/[id]
  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || promptInput).trim()
    if (!promptToUse) return

    setIsGenerating(true)

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

      if (json.spreadsheet?.id) {
        // Navigate to the newly generated spreadsheet page
        router.push(`/sheets/${json.spreadsheet.id}`)
      }
    } catch (err: unknown) {
      console.error('Generation error:', err)
      alert(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setIsGenerating(false)
    }
  }

  // Create a blank sheet and navigate to /sheets/[id]
  const handleCreateBlank = async () => {
    try {
      const res = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Blank Workbook',
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
          metadata: { summary: 'Blank spreadsheet grid with live cell editing.' },
        }),
      })

      const json = await res.json()
      if (res.ok && json.spreadsheet?.id) {
        router.push(`/sheets/${json.spreadsheet.id}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Delete spreadsheet
  const handleDeleteSheet = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this spreadsheet?')) return

    try {
      await fetch(`/api/spreadsheets?id=${id}`, { method: 'DELETE' })
      setSavedSheets((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const suggestedPrompts = [
    {
      title: 'Monthly Mess Food & Expense Tracker',
      prompt: 'Make me a custom monthly expense calculator with calendar days for mess food at Rs. 500/day, category totals, and overall expenditure.',
      tag: 'Personal Finance',
    },
    {
      title: 'Q4 Enterprise Sales Pipeline',
      prompt: 'Q4 Enterprise Sales Pipeline with deal sizes, win probabilities, owners, and weighted ARR calculations.',
      tag: 'Sales & Revenue',
    },
    {
      title: 'Startup 12-Month Runway & Burn Forecast',
      prompt: 'Startup 12-month runway and cash burn forecast with monthly burn rate and runway calculation.',
      tag: 'Finance & Planning',
    },
    {
      title: 'Marketing Campaign ROI & Attribution',
      prompt: 'Marketing campaign ROI tracker with ad spend, lead conversions, CAC, and channel revenue.',
      tag: 'Marketing',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#0D1F14] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur border-b border-[#E5EAE7] px-4 sm:px-8 flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F4F7F4] border border-[#DCE4DE] text-zinc-800 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Spreadsheet</span>
          </button>

          <button
            onClick={handleCreateBlank}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F4F7F4] border border-[#DCE4DE] text-zinc-800 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Blank Workbook</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E5EAE7]">
            <div className="w-7 h-7 rounded-full bg-[#0D361C] text-white flex items-center justify-center font-bold text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-zinc-700" title={userEmail || undefined}>{userName}</span>
            <SignOutButton className="p-1 border-0 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg text-xs" />
          </div>
        </div>
      </header>

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Welcome Headline */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF5EE] text-[#0D361C] border border-[#CDE5D5] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Spreadsheet Generator
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0D1F14]">
            Describe any spreadsheet. Metron generates it.
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            Enter your requirements in plain English. Gemini builds live columns, calculations, and formulas,
            opening directly in an Excel-style interactive workspace.
          </p>
        </div>

        {/* AI Prompt Input Card (The Star of MVP) */}
        <section className="rounded-2xl bg-white border border-[#D7E4DC] p-5 sm:p-7 shadow-sm transition-all focus-within:border-[#0D361C] focus-within:ring-3 focus-within:ring-[#0D361C]/10">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleGenerate()
            }}
            className="space-y-4"
          >
            <div className="relative">
              <textarea
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
                disabled={isGenerating}
                placeholder="Describe your spreadsheet in plain English… e.g. 'Make me a monthly expense calculator with calendar days for mess food at Rs. 500/day, category totals, and overall expenditure.'"
                className="w-full resize-none text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none leading-relaxed bg-transparent"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#EDF2EE]">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Powered by Gemini API & Handsontable</span>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !promptInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] active:bg-[#082211] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generating Spreadsheet…</span>
                  </>
                ) : (
                  <>
                    <span>Generate & Open in Excel</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Suggested Quick Prompts Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Try a Popular Prompt
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedPrompts.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setPromptInput(item.prompt)
                  handleGenerate(item.prompt)
                }}
                className="p-4 rounded-xl bg-white border border-[#E5EAE7] hover:border-[#107C41] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-zinc-900 group-hover:text-[#107C41] transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-[#EAF5EE] px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-end text-[11px] font-semibold text-[#107C41] group-hover:translate-x-0.5 transition-transform">
                  Generate →
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Spreadsheets List */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAEFEA]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                Your Spreadsheets
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAEFEA] text-[#0D361C]">
                {savedSheets.length}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">Stored in Supabase PostgreSQL</span>
          </div>

          {loadingSheets ? (
            <div className="py-12 text-center text-xs text-zinc-400">Loading your spreadsheets…</div>
          ) : savedSheets.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-[#E5EAE7] text-center space-y-2">
              <p className="text-xs font-semibold text-zinc-700">No saved spreadsheets yet</p>
              <p className="text-[11px] text-zinc-400">
                Type a prompt above or click one of the popular ideas to create your first spreadsheet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedSheets.map((sheet) => (
                <Link
                  key={sheet.id}
                  href={`/sheets/${sheet.id}`}
                  className="p-4 rounded-xl bg-white border border-[#E5EAE7] hover:border-[#107C41] hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded bg-[#EAF5EE] text-[#107C41] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          X
                        </span>
                        <h3 className="text-xs font-bold text-zinc-900 group-hover:text-[#107C41] truncate transition-colors">
                          {sheet.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSheet(e, sheet.id)}
                        className="text-zinc-300 hover:text-red-600 p-1 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {sheet.prompt && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mb-3">
                        &ldquo;{sheet.prompt}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>
                      {Array.isArray(sheet.data) ? sheet.data.length : 0} rows • {Array.isArray(sheet.columns) ? sheet.columns.length : 0} cols
                    </span>
                    <span className="text-[#107C41] font-semibold group-hover:underline">
                      Open Excel View →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Dashboard Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
