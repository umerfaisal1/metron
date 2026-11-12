'use client'

import { useState } from 'react'

interface WelcomeSectionProps {
  userName?: string
  onCreateWithAI?: () => void
  onImportFile?: () => void
  onBlankSpreadsheet?: () => void
}

export default function WelcomeSection({
  userName = 'Usman',
  onCreateWithAI,
  onImportFile,
  onBlankSpreadsheet,
}: WelcomeSectionProps) {
  const [greeting] = useState(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })

  const actions = [
    {
      title: 'Create with AI',
      description: 'Describe any sheet in plain English. Metron builds formulas, tables & charts.',
      badge: 'Signature',
      badgeColor: 'bg-emerald-100 text-[#0D361C] border border-emerald-300/60',
      icon: (
        <svg className="w-5 h-5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      iconBg: 'bg-[#DDF7EA]',
      borderHover: 'hover:border-[#0D361C]/50 hover:shadow-md',
      onClick: onCreateWithAI,
      buttonText: 'Prompt AI →',
    },
    {
      title: 'Import Excel / CSV',
      description: 'Upload existing .xlsx, .csv, or Sheets files. Instant formula recalculation.',
      badge: 'Auto-convert',
      badgeColor: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      icon: (
        <svg className="w-5 h-5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
      iconBg: 'bg-[#F0F5F1]',
      borderHover: 'hover:border-emerald-600/40 hover:shadow-md',
      onClick: onImportFile,
      buttonText: 'Upload file →',
    },
    {
      title: 'Blank Spreadsheet',
      description: 'Start with a high-performance grid powered by the HyperFormula calculation engine.',
      badge: 'Clean Grid',
      badgeColor: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      icon: (
        <svg className="w-5 h-5 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      iconBg: 'bg-[#F0F5F1]',
      borderHover: 'hover:border-emerald-600/40 hover:shadow-md',
      onClick: onBlankSpreadsheet,
      buttonText: 'Start fresh →',
    },
  ]

  return (
    <section className="space-y-4">
      {/* Title & Concise Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-xl">
            Describe what you need. Metron generates working spreadsheet formulas, interactive tables,
            and executive charts in real time.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-[#0D361C] bg-[#EAF5EE] border border-[#CDE5D5] px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Workspace synced</span>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {actions.map((act) => (
          <div
            key={act.title}
            onClick={act.onClick}
            className={`p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EAE7] transition-all duration-200 cursor-pointer flex flex-col justify-between group ${act.borderHover}`}
          >
            <div>
              <div className="flex items-start justify-between mb-3.5">
                <div
                  className={`w-10 h-10 rounded-xl ${act.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
                >
                  {act.icon}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${act.badgeColor}`}>
                  {act.badge}
                </span>
              </div>

              <h2 className="text-sm font-bold text-zinc-900 mb-1 group-hover:text-[#0D361C] transition-colors">
                {act.title}
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                {act.description}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-[#0D361C] group-hover:translate-x-0.5 transition-transform">
              <span>{act.buttonText}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
