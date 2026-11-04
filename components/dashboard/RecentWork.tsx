'use client'

import { useState } from 'react'

interface SpreadsheetFile {
  id: string
  title: string
  type: 'xlsx' | 'metron' | 'csv'
  lastEdited: string
  editedBy: string
  rows: number
  formulas: number
  starred: boolean
  sampleData: {
    headers: string[]
    rows: (string | number)[][]
  }
}

interface RecentWorkProps {
  onOpenFile?: (file: SpreadsheetFile) => void
}

export default function RecentWork({ onOpenFile }: RecentWorkProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'shared' | 'recent'>('all')

  const [files, setFiles] = useState<SpreadsheetFile[]>([
    {
      id: '1',
      title: 'Q4 Enterprise Sales Pipeline & CAC.xlsx',
      type: 'xlsx',
      lastEdited: '12m ago',
      editedBy: 'Usman',
      rows: 148,
      formulas: 14,
      starred: true,
      sampleData: {
        headers: ['Stage', 'Deals', 'ARR Value', 'Win %'],
        rows: [
          ['Discovery', 24, '$380,000', '22%'],
          ['Demo / POC', 18, '$520,000', '48%'],
          ['Proposal', 11, '$440,000', '74%'],
          ['Closing', 7, '$290,000', '91%'],
        ],
      },
    },
    {
      id: '2',
      title: '2025 Marketing ROI & Attribution.metron',
      type: 'metron',
      lastEdited: '2h ago',
      editedBy: 'Metron AI',
      rows: 840,
      formulas: 22,
      starred: true,
      sampleData: {
        headers: ['Channel', 'Ad Spend', 'Leads', 'ROAS'],
        rows: [
          ['Google Search', '$14,200', '1,420', '4.8x'],
          ['LinkedIn B2B', '$18,900', '890', '3.6x'],
          ['Product Hunt', '$2,400', '2,100', '7.2x'],
          ['Organic SEO', '$4,000', '3,400', '9.4x'],
        ],
      },
    },
    {
      id: '3',
      title: 'Global Team Compensation & Equity.csv',
      type: 'csv',
      lastEdited: 'Yesterday',
      editedBy: 'Usman',
      rows: 92,
      formulas: 8,
      starred: false,
      sampleData: {
        headers: ['Dept', 'Headcount', 'Base Salary', 'Equity %'],
        rows: [
          ['Engineering', 14, '$1,820,000', '3.40%'],
          ['Product & AI', 6, '$840,000', '1.80%'],
          ['Sales & Ops', 8, '$920,000', '1.20%'],
          ['Marketing', 5, '$490,000', '0.75%'],
        ],
      },
    },
    {
      id: '4',
      title: 'SaaS Runway & 3-Scenario Cash Burn.xlsx',
      type: 'xlsx',
      lastEdited: '3 days ago',
      editedBy: 'Usman',
      rows: 360,
      formulas: 36,
      starred: true,
      sampleData: {
        headers: ['Month', 'Cash In', 'Net Burn', 'Runway'],
        rows: [
          ['Oct 2025', '$84,000', '-$32,400', '18.4 mo'],
          ['Nov 2025', '$92,000', '-$30,100', '19.2 mo'],
          ['Dec 2025', '$104,000', '-$26,800', '21.0 mo'],
          ['Jan 2026', '$118,000', '-$22,500', '23.6 mo'],
        ],
      },
    },
    {
      id: '5',
      title: 'Monthly Expense & Mess Food Tracker.metron',
      type: 'metron',
      lastEdited: 'Oct 28',
      editedBy: 'Usman',
      rows: 31,
      formulas: 12,
      starred: false,
      sampleData: {
        headers: ['Day', 'Mess (Rs.500)', 'Category', 'Daily Total'],
        rows: [
          ['Day 01', 'ON', 'Transport', 'Rs. 950'],
          ['Day 02', 'ON', 'Shopping', 'Rs. 2,400'],
          ['Day 03', 'OFF', 'Dining', 'Rs. 1,100'],
          ['Day 04', 'ON', 'Utilities', 'Rs. 500'],
        ],
      },
    },
    {
      id: '6',
      title: 'Customer Cohort Retention & Churn.xlsx',
      type: 'xlsx',
      lastEdited: 'Oct 24',
      editedBy: 'Usman',
      rows: 1240,
      formulas: 16,
      starred: false,
      sampleData: {
        headers: ['Cohort', 'Size', 'Month 1', 'Month 3'],
        rows: [
          ['2025 Q1', 480, '94.2%', '84.6%'],
          ['2025 Q2', 620, '95.1%', '86.2%'],
          ['2025 Q3', 790, '96.4%', '88.1%'],
          ['2025 Q4', 940, '97.0%', '89.4%'],
        ],
      },
    },
  ])

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f))
    )
  }

  const filteredFiles = files.filter((f) => {
    if (activeTab === 'starred') return f.starred
    if (activeTab === 'shared') return f.type === 'metron'
    return true
  })

  return (
    <section className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#EAEFEA]">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            Recent Work
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#0D361C]">
              {filteredFiles.length} Spreadsheets
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Open, analyze, or continue editing your recent spreadsheets
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F2F6F3] rounded-xl border border-[#E0E7E2] self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'starred', label: 'Starred' },
            { id: 'shared', label: 'Metron Native' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'starred' | 'shared')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => onOpenFile?.(file)}
            className="group relative rounded-2xl bg-white border border-[#E5EAE7] hover:border-[#10B981]/60 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
          >
            {/* Top Bar with Star & File Type Badge */}
            <div className="p-4 pb-2.5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 tracking-wider ${
                    file.type === 'metron'
                      ? 'bg-[#DDF7EA] text-[#0D361C] border border-[#BCEECD]'
                      : file.type === 'xlsx'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  {file.type}
                </span>
                <h3 className="text-xs font-bold text-zinc-900 truncate group-hover:text-[#0D361C] transition-colors">
                  {file.title}
                </h3>
              </div>

              {/* Star Button */}
              <button
                type="button"
                onClick={(e) => toggleStar(e, file.id)}
                className="text-zinc-300 hover:text-amber-400 transition-colors p-1 flex-shrink-0 cursor-pointer"
                aria-label={file.starred ? 'Unstar file' : 'Star file'}
              >
                <svg
                  className={`w-4 h-4 ${file.starred ? 'text-amber-400 fill-amber-400' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            </div>

            {/* Realistic Micro Spreadsheet Thumbnail */}
            <div className="mx-4 my-1.5 p-2.5 rounded-xl bg-[#F6FAF7] border border-[#E2EAE4] font-mono text-[10px] select-none group-hover:bg-[#EFF7F2] transition-colors">
              {/* Formula Bar Mockup */}
              <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-[#E1ECE3] text-[9px] text-zinc-400">
                <span className="font-bold text-[#0D361C]">fx</span>
                <span className="truncate text-zinc-600">=SUMIFS(C2:C10, B2:B10, &quot;&gt;0&quot;)</span>
              </div>

              {/* Table Grid Mockup */}
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[#0D361C]/70 border-b border-[#E2EAE4]">
                    {file.sampleData.headers.map((h, idx) => (
                      <th key={idx} className="pb-1 font-semibold truncate pr-1">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFE8]">
                  {file.sampleData.rows.slice(0, 3).map((row, rIdx) => (
                    <tr key={rIdx} className="text-zinc-600">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-0.5 truncate pr-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card Footer Details */}
            <div className="p-4 pt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{file.lastEdited}</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-500">
                <span>{file.rows} rows</span>
                <span>•</span>
                <span className="text-[#0D361C] font-semibold">{file.formulas} formulas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
