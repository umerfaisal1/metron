'use client'

import { useState, useEffect } from 'react'

interface AISheetPreviewModalProps {
  isOpen: boolean
  prompt: string
  onClose: () => void
}

export default function AISheetPreviewModal({
  isOpen,
  prompt,
  onClose,
}: AISheetPreviewModalProps) {
  const [step, setStep] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'grid' | 'formulas' | 'chart'>('grid')

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      const t1 = setTimeout(() => setStep(2), 700)
      const t2 = setTimeout(() => setStep(3), 1500)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [isOpen, prompt])

  if (!isOpen) return null

  // Generated sample data based on prompt
  const isMessPrompt = prompt.toLowerCase().includes('mess') || prompt.toLowerCase().includes('food')

  const sheetData = isMessPrompt
    ? {
        title: 'Monthly Mess Food & Expense Tracker.metron',
        columns: ['A: Date', 'B: Day', 'C: Mess Food (Rs. 500)', 'D: Category', 'E: Cost', 'F: Running Total'],
        rows: [
          ['2025-11-01', 'Sat', 'YES', 'Mess Base', 'Rs. 500', 'Rs. 500'],
          ['2025-11-02', 'Sun', 'YES', 'Mess Base + Fruit', 'Rs. 750', 'Rs. 1,250'],
          ['2025-11-03', 'Mon', 'NO', 'Transportation', 'Rs. 320', 'Rs. 1,570'],
          ['2025-11-04', 'Tue', 'YES', 'Mess Base', 'Rs. 500', 'Rs. 2,070'],
          ['2025-11-05', 'Wed', 'YES', 'Shopping / Mess', 'Rs. 1,400', 'Rs. 3,470'],
          ['2025-11-06', 'Thu', 'NO', 'Dining Out', 'Rs. 850', 'Rs. 4,320'],
          ['2025-11-07', 'Fri', 'YES', 'Mess Base', 'Rs. 500', 'Rs. 4,820'],
        ],
        formulas: [
          { cell: 'E2', formula: '=IF(C2="YES", 500, 0) + D2_EXTRA' },
          { cell: 'F2', formula: '=SUM(E$2:E2)' },
          { cell: 'TOTAL', formula: '=SUM(E2:E31)' },
        ],
      }
    : {
        title: 'AI Revenue & Churn Analysis.metron',
        columns: ['A: Month', 'B: New MRR', 'C: Expansion MRR', 'D: Churned MRR', 'E: Net Growth', 'F: Total ARR'],
        rows: [
          ['Oct 2025', '$42,000', '$14,500', '-$4,200', '$52,300', '$1,480,000'],
          ['Nov 2025', '$48,000', '$16,200', '-$3,900', '$60,300', '$1,540,300'],
          ['Dec 2025', '$54,000', '$19,000', '-$4,500', '$68,500', '$1,608,800'],
          ['Jan 2026', '$62,000', '$22,400', '-$4,100', '$80,300', '$1,689,100'],
          ['Feb 2026', '$71,000', '$26,100', '-$3,800', '$93,300', '$1,782,400'],
          ['Mar 2026', '$84,000', '$31,000', '-$4,000', '$111,000', '$1,893,400'],
        ],
        formulas: [
          { cell: 'E2', formula: '=B2 + C2 - D2' },
          { cell: 'F2', formula: '=F1 + (E2 * 12)' },
          { cell: 'GROWTH', formula: '=(E7-E2)/E2' },
        ],
      }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-[#D7E3DA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-b border-[#E1EAE3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0D361C] text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                {sheetData.title}
                <span className="text-[10px] font-semibold text-emerald-800 bg-[#DDF7EA] border border-emerald-300 px-2 py-0.5 rounded-full">
                  AI Generated
                </span>
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-md">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-[#EAEFEA] flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 1 ? 'bg-[#0D361C] text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                ✓
              </span>
              <span className={step >= 1 ? 'font-semibold text-zinc-900' : 'text-zinc-400'}>
                Schema & Structure
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 2 ? 'bg-[#0D361C] text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {step >= 2 ? '✓' : '2'}
              </span>
              <span className={step >= 2 ? 'font-semibold text-zinc-900' : 'text-zinc-400'}>
                HyperFormula Formulas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 3 ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {step >= 3 ? '✓' : '3'}
              </span>
              <span className={step >= 3 ? 'font-semibold text-emerald-800' : 'text-zinc-400'}>
                Interactive Visualization
              </span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F2F6F3] rounded-lg border border-[#E0E7E2]">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'grid' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-500'
              }`}
            >
              Spreadsheet View
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'formulas' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-500'
              }`}
            >
              Formula Engine
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'chart' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-500'
              }`}
            >
              Chart Analysis
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F9FAF9]">
          {activeTab === 'grid' && (
            <div className="rounded-xl border border-[#DDE5E0] bg-white overflow-hidden shadow-xs">
              {/* Formula Bar Mockup */}
              <div className="px-4 py-2 bg-[#F6F8F6] border-b border-[#E5EAE7] flex items-center gap-3 text-xs font-mono">
                <span className="font-bold text-[#0D361C]">E2</span>
                <span className="text-zinc-400">|</span>
                <span className="text-emerald-800 font-semibold">{sheetData.formulas[0].formula}</span>
              </div>

              {/* Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F0F5F1] text-[#0D361C] border-b border-[#DCE4DE] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-[#E2EAE4] w-10 text-center text-zinc-400">
                        #
                      </th>
                      {sheetData.columns.map((col, idx) => (
                        <th key={idx} className="py-2.5 px-4 border-r border-[#E2EAE4] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9EFEA] font-mono text-zinc-800">
                    {sheetData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F4FAF6] transition-colors">
                        <td className="py-2 px-3 border-r border-[#EAEFEA] text-center text-zinc-400 bg-[#FAFCFA]">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-4 border-r border-[#EAEFEA] whitespace-nowrap ${
                              cell === 'YES'
                                ? 'text-emerald-700 font-bold'
                                : cell === 'NO'
                                ? 'text-zinc-400'
                                : ''
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'formulas' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8E4] shadow-xs">
                <h4 className="text-xs font-bold text-zinc-900 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  HyperFormula Dependency Tree
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {sheetData.formulas.map((f, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#F5F8F5] border border-[#E5EBE6] flex items-center justify-between">
                      <span className="font-bold text-[#0D361C]">{f.cell}</span>
                      <span className="text-emerald-800 font-semibold">{f.formula}</span>
                      <span className="text-[10px] text-zinc-400 bg-white px-2 py-0.5 rounded border border-zinc-200">
                        Active Recalculation
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="p-6 rounded-xl bg-white border border-[#E2E8E4] shadow-xs text-center">
              <h4 className="text-xs font-bold text-zinc-900 mb-1">
                Automated Visual Chart
              </h4>
              <p className="text-xs text-zinc-500 mb-4">
                Rendered with Apache ECharts configuration schema
              </p>
              <div className="h-44 w-full bg-[#F6FAF7] rounded-xl border border-[#E2EAE4] flex items-center justify-center p-4">
                <div className="flex items-end gap-6 h-32">
                  {[45, 60, 52, 75, 88, 95, 110].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-8 rounded-t-md bg-gradient-to-t from-[#0D361C] to-[#20B26B] transition-all duration-300 hover:opacity-90"
                        style={{ height: `${h}px` }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500">D{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-white border-t border-[#EAEFEA] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready to edit inside Metron spreadsheet workspace</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={() => {
                alert('Spreadsheet generated and ready! You can now edit in Metron.')
                onClose()
              }}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Open in Spreadsheet Editor</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
