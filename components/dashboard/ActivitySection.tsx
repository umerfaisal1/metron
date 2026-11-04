'use client'

export default function ActivitySection() {
  const activities = [
    {
      id: 1,
      type: 'ai-gen',
      title: 'AI generated 3-way cashflow model',
      target: 'SaaS Runway & 3-Scenario Cash Burn.xlsx',
      time: '12m ago',
      details: 'Created 24 formulas with dynamic monthly scenario toggles (Bull / Base / Bear).',
      badge: 'AI Operation',
      badgeColor: 'bg-[#DDF7EA] text-[#0D361C] border border-[#BCEECD]',
      icon: (
        <svg className="w-4 h-4 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
    {
      id: 2,
      type: 'import',
      title: 'Imported 12,450 rows from CSV',
      target: 'Stripe_Billing_Export_Oct.csv',
      time: '1h ago',
      details: 'Auto-mapped columns: customer_id, gross_usd, net_revenue, fee_calc.',
      badge: 'Data Sync',
      badgeColor: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      icon: (
        <svg className="w-4 h-4 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
    },
    {
      id: 3,
      type: 'chart',
      title: 'Generated Customer Cohort Retention Heatmap',
      target: 'Customer Cohort Retention & Churn.xlsx',
      time: '3h ago',
      details: 'Configured color-scale matrix with 12-month cohort retention curves.',
      badge: 'Chart Built',
      badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      icon: (
        <svg className="w-4 h-4 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 4,
      type: 'calc',
      title: 'HyperFormula engine evaluated dependencies',
      target: 'Q4 Enterprise Sales Pipeline & CAC.xlsx',
      time: '5h ago',
      details: '148 rows calculated in 1.4 milliseconds. Zero circular references found.',
      badge: 'Recalculation',
      badgeColor: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      icon: (
        <svg className="w-4 h-4 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 5,
      type: 'share',
      title: 'Exported workbook with formulas intact',
      target: '2025 Marketing ROI & Attribution.xlsx',
      time: 'Yesterday',
      details: 'SheetJS export compiled with formula preservation and custom cell borders.',
      badge: 'Export',
      badgeColor: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      icon: (
        <svg className="w-4 h-4 text-[#0D361C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      ),
    },
  ]

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#EAEFEA]">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            Activity & Operations Log
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#0D361C]">
              Synced
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Recently edited files and completed AI operations
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-semibold text-[#0D361C] hover:underline cursor-pointer"
        >
          View Full Audit Trail →
        </button>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-2xl bg-white border border-[#E5EAE7] divide-y divide-zinc-100 shadow-xs overflow-hidden">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-4 sm:p-4.5 flex items-start justify-between gap-3 hover:bg-[#F9FAF9] transition-colors group cursor-pointer"
          >
            <div className="flex items-start gap-3 min-w-0">
              {/* Icon Container */}
              <div className="w-8 h-8 rounded-xl bg-[#F0F6F2] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#E5F2E9] transition-colors">
                {act.icon}
              </div>

              {/* Title & Detail */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="text-xs font-bold text-zinc-900 group-hover:text-[#0D361C] transition-colors">
                    {act.title}
                  </h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${act.badgeColor}`}>
                    {act.badge}
                  </span>
                </div>

                <div className="text-[11px] text-[#0D361C] font-medium truncate mb-1">
                  File: <span className="font-mono text-zinc-700">{act.target}</span>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  {act.details}
                </p>
              </div>
            </div>

            {/* Time */}
            <span className="text-[11px] text-zinc-400 font-mono whitespace-nowrap pl-2 flex-shrink-0">
              {act.time}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
