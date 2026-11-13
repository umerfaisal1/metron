'use client'

import { useRef } from 'react'
import EChartCard from './EChartCard'
import { useSpreadsheetStore } from '@/lib/store/useSpreadsheetStore'
import { parseSpreadsheetBuffer } from '@/lib/spreadsheet/fileParser'

export default function ChartDashboard() {
  const {
    title,
    columns,
    data,
    charts,
    isGeneratingCharts,
    chartError,
    overallInsight,
    isSuitableForVisualization,
    unsuitabilityReason,
    generateAICharts,
    removeChart,
    setWorkbook,
  } = useSpreadsheetStore()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle Excel / CSV File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseSpreadsheetBuffer(buffer, file.name)

      // Update store with parsed workbook
      setWorkbook({
        title: parsed.title,
        columns: parsed.activeSheet.columns,
        data: parsed.activeSheet.data,
        metadata: {
          filename: parsed.filename,
          sheetCount: parsed.sheets.length,
          sheets: parsed.sheets.map((s) => s.name),
        },
      })

      // Automatically trigger AI chart generation on new data
      setTimeout(() => {
        generateAICharts()
      }, 100)
    } catch (err) {
      console.error('File parsing error:', err)
      alert('Failed to parse spreadsheet file. Please verify it is a valid .xlsx or .csv file.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8FAF8] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Controls Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8E4]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-extrabold text-[#0D1F14] tracking-tight">
              AI Visualization Dashboard
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#107C41]">
              {charts.length} {charts.length === 1 ? 'Chart' : 'Charts'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Analyzing <strong className="text-zinc-700">{title}</strong> ({data.length} rows • {columns.length} columns)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F2F7F4] border border-[#DEE6E0] text-zinc-700 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => generateAICharts()}
            disabled={isGeneratingCharts || data.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#107C41] hover:bg-[#0D6234] active:bg-[#0A4F2A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            {isGeneratingCharts ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Analyzing & Generating…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{charts.length > 0 ? 'Regenerate AI Charts' : 'Auto-Generate Charts'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error or Unsuitability Alert */}
      {chartError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{chartError}</span>
          </div>
          <button
            onClick={() => generateAICharts()}
            className="text-red-700 font-semibold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!isSuitableForVisualization && unsuitabilityReason && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold text-amber-950 mb-1">Data Unsuitable for Charting</h4>
            <p className="text-amber-800 leading-relaxed">{unsuitabilityReason}</p>
          </div>
        </div>
      )}

      {/* Executive Overall Insight Card */}
      {overallInsight && isSuitableForVisualization && (
        <div className="p-4 rounded-xl bg-[#EAF5EE] border border-[#CDE5D5] text-[#0D361C] text-xs flex items-start gap-3 shadow-2xs">
          <div className="w-6 h-6 rounded-lg bg-[#107C41] text-white flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
            AI
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#0D361C] mb-0.5">Executive Data Insight</h4>
            <p className="text-zinc-700 leading-relaxed">{overallInsight}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGeneratingCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
              <div className="h-5 bg-zinc-200 rounded w-1/3" />
              <div className="h-3 bg-zinc-100 rounded w-1/2" />
              <div className="h-64 bg-zinc-50 rounded-xl flex items-center justify-center text-xs text-zinc-400">
                Evaluating distributions & rendering Apache ECharts…
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isGeneratingCharts && charts.length === 0 && isSuitableForVisualization && (
        <div className="p-12 rounded-2xl bg-white border border-[#E2E8E4] text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5EE] text-[#107C41] mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">No Visualizations Generated Yet</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Metron AI can automatically detect categories, numeric metrics, and dates to build the most suitable visualizations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateAICharts()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#107C41] hover:bg-[#0D6234] shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Analyze & Generate Charts</span>
          </button>
        </div>
      )}

      {/* Main Charts Grid */}
      {!isGeneratingCharts && charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart) => (
            <EChartCard
              key={chart.recommendation.id}
              chart={chart}
              onRemove={removeChart}
            />
          ))}
        </div>
      )}
    </div>
  )
}
