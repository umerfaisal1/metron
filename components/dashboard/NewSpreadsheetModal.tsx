'use client'

interface NewSpreadsheetModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAI: () => void
  onSelectImport: () => void
  onSelectBlank: () => void
  onSelectTemplate: (templateName: string) => void
}

export default function NewSpreadsheetModal({
  isOpen,
  onClose,
  onSelectAI,
  onSelectImport,
  onSelectBlank,
  onSelectTemplate,
}: NewSpreadsheetModalProps) {
  if (!isOpen) return null

  const templates = [
    {
      title: 'SaaS Monthly Financial & Churn Model',
      category: 'Financial Modeling',
      desc: 'MRR breakdown, cohort retention, and churn forecasting with dynamic charts.',
      formulas: '32 formulas',
    },
    {
      title: 'Monthly Mess Food & Category Tracker',
      category: 'Personal & Operations',
      desc: 'Toggleable calendar for Rs. 500/day mess calculation and category breakdowns.',
      formulas: '16 formulas',
    },
    {
      title: 'Startup 24-Month Runway & Cash Burn',
      category: 'Executive & Board',
      desc: 'Scenario toggles (Conservative, Target, Aggressive) and runway charts.',
      formulas: '28 formulas',
    },
    {
      title: 'Marketing ROI & Multi-Channel Attribution',
      category: 'Growth & Ads',
      desc: 'Ad spend vs conversions, ROAS calculation, and attribution sparklines.',
      formulas: '18 formulas',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#D7E3DA] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-b border-[#E1EAE3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0D361C] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              +
            </div>
            <h3 className="text-sm font-bold text-zinc-900">
              Create New Spreadsheet
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 3 Core Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                onClose()
                onSelectAI()
              }}
              className="p-4 rounded-xl border border-emerald-300 bg-[#F2FAF5] hover:bg-[#E5F5EC] text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0D361C] text-white flex items-center justify-center mb-2.5 shadow-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C]">
                Create with AI
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Describe in plain English, AI builds formulas & charts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                onSelectImport()
              }}
              className="p-4 rounded-xl border border-[#DEE6E0] bg-white hover:bg-[#F7FAF8] text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAEFEA] text-[#0D361C] flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C]">
                Import XLSX / CSV
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Bring existing spreadsheets with formulas preserved.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                onSelectBlank()
              }}
              className="p-4 rounded-xl border border-[#DEE6E0] bg-white hover:bg-[#F7FAF8] text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAEFEA] text-[#0D361C] flex items-center justify-center mb-2.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C]">
                Blank Grid
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Start fresh with instant HyperFormula calculation.
              </p>
            </button>
          </div>

          {/* Templates Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Or Start from a Curated Template
              </span>
              <span className="text-[10px] text-zinc-400">4 templates available</span>
            </div>

            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.title}
                  onClick={() => {
                    onClose()
                    onSelectTemplate(tpl.title)
                  }}
                  className="p-3.5 rounded-xl border border-[#E5EAE7] hover:border-[#10B981]/60 bg-white hover:bg-[#F9FAF9] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C]">
                        {tpl.title}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{tpl.desc}</p>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <span className="text-[10px] font-mono text-zinc-400 block">{tpl.formulas}</span>
                    <span className="text-xs font-semibold text-[#0D361C] group-hover:translate-x-0.5 transition-transform inline-block">
                      Use →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
