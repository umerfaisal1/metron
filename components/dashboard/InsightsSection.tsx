'use client'

import { useState } from 'react'

export default function InsightsSection() {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'cac' | 'burn'>('revenue')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  // Chart data points (Months: May -> Oct)
  const chartDatasets = {
    revenue: {
      title: 'Monthly Recurring Revenue (MRR) vs AI Forecast',
      unit: '$',
      actual: [54, 62, 71, 79, 94, 108],
      forecast: [52, 60, 68, 82, 92, 112],
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      growth: '+21.4% MoM',
      insight: 'Enterprise Tier expanded by 34% driven by AI custom spreadsheet automation.',
    },
    cac: {
      title: 'Customer Acquisition Cost (CAC) Efficiency',
      unit: '$',
      actual: [480, 440, 390, 360, 310, 280],
      forecast: [490, 450, 410, 375, 340, 305],
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      growth: '-41.6% (Optimized)',
      insight: 'Product-led viral spreadsheet templates drove 58% of new user signups with $0 paid ad spend.',
    },
    burn: {
      title: 'Net Cash Burn & Projected Runway (Months)',
      unit: 'mo ',
      actual: [12.4, 13.8, 15.2, 16.9, 18.4, 21.2],
      forecast: [12.0, 13.5, 14.8, 16.2, 17.8, 20.5],
      labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      growth: '+8.8 mo added',
      insight: 'Scenario B projection extends current runway to Q4 2026 without additional equity dilution.',
    },
  }

  const currentData = chartDatasets[activeMetric]

  // Scaled coordinates for SVG Chart (ViewBox 600 x 200)
  // Max value calculation
  const maxVal = Math.max(...currentData.actual, ...currentData.forecast) * 1.15
  const minVal = Math.min(...currentData.actual, ...currentData.forecast) * 0.85

  const pointsActual = currentData.actual.map((val, idx) => {
    const x = 50 + idx * 100
    const y = 170 - ((val - minVal) / (maxVal - minVal)) * 130
    return { x, y, val }
  })

  const pointsForecast = currentData.forecast.map((val, idx) => {
    const x = 50 + idx * 100
    const y = 170 - ((val - minVal) / (maxVal - minVal)) * 130
    return { x, y, val }
  })

  const actualPath = pointsActual.reduce(
    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  )

  const forecastPath = pointsForecast.reduce(
    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  )

  const areaPath = `${actualPath} L ${pointsActual[pointsActual.length - 1].x} 175 L ${pointsActual[0].x} 175 Z`

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#EAEFEA]">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            Intelligence & Data Insights
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EAF5EE] text-[#0D361C]">
              Real-time
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Interactive sample charts and automated statistical summaries
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F2F6F3] rounded-xl border border-[#E0E7E2]">
          {[
            { id: 'revenue', label: 'Revenue & Forecast' },
            { id: 'cac', label: 'CAC Efficiency' },
            { id: 'burn', label: 'Runway Simulation' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMetric(tab.id as 'revenue' | 'cac' | 'burn')
                setHoveredPoint(null)
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeMetric === tab.id
                  ? 'bg-white text-[#0D361C] shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Chart + Automated Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Chart Container (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E5EAE7] p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Chart Title & Stat Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  {currentData.title}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold tracking-tight text-zinc-900">
                    {currentData.unit}
                    {hoveredPoint !== null
                      ? currentData.actual[hoveredPoint]
                      : currentData.actual[currentData.actual.length - 1]}
                    {activeMetric === 'revenue' ? 'k' : ''}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {currentData.growth}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D361C]" />
                  <span>Actual Data</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#20B26B] border border-dashed border-[#0D361C]" />
                  <span>AI Predicted</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="relative w-full h-52 bg-[#FBFDFB] rounded-xl border border-[#EDF3EE] p-2 overflow-hidden">
              <svg
                viewBox="0 0 600 190"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20B26B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#20B26B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="40" x2="550" y2="40" stroke="#E5ECE7" strokeDasharray="3 3" />
                <line x1="50" y1="100" x2="550" y2="100" stroke="#E5ECE7" strokeDasharray="3 3" />
                <line x1="50" y1="160" x2="550" y2="160" stroke="#E5ECE7" />

                {/* Gradient Area Fill */}
                <path d={areaPath} fill="url(#areaGradient)" />

                {/* Forecast Line (Dashed) */}
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="#20B26B"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Actual Line (Solid Forest Green) */}
                <path d={actualPath} fill="none" stroke="#0D361C" strokeWidth="2.5" />

                {/* Data Points */}
                {pointsActual.map((pt, idx) => (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === idx ? 6 : 4}
                      fill="#0D361C"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint(idx)}
                    />
                    {/* Month Label */}
                    <text
                      x={pt.x}
                      y="182"
                      textAnchor="middle"
                      className="text-[11px] font-sans fill-zinc-400 font-medium"
                    >
                      {currentData.labels[idx]}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {currentData.insight}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Calculated via HyperFormula</span>
          </div>
        </div>

        {/* Automated AI Insights Sidebar (1 Col) */}
        <div className="space-y-3">
          {/* Card 1: Anomaly Alert */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EAE7] hover:border-[#10B981]/50 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Anomaly Detected
              </span>
              <span className="text-[10px] text-zinc-400">Row 42</span>
            </div>
            <h3 className="text-xs font-bold text-zinc-900 mb-1">
              Cloud Infrastructure Spend (+34.2%)
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              AWS cluster expenses peaked on Oct 14 during data migration. Anomaly isolated from normal baseline.
            </p>
          </div>

          {/* Card 2: Growth Correlation */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EAE7] hover:border-[#10B981]/50 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#0D361C] bg-[#E8F7EE] border border-[#CCE9D6] px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                0.84 Correlation
              </span>
              <span className="text-[10px] text-zinc-400">AI Model</span>
            </div>
            <h3 className="text-xs font-bold text-zinc-900 mb-1">
              Marketing Spend → Sales Velocity
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Strong statistical relationship between targeted product demos and shortened deal closing cycles.
            </p>
          </div>

          {/* Card 3: Formula Optimization */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EAE7] hover:border-[#10B981]/50 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Optimized
              </span>
              <span className="text-[10px] font-mono text-zinc-400">1.4ms</span>
            </div>
            <h3 className="text-xs font-bold text-zinc-900 mb-1">
              Zero Circular Dependencies
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              HyperFormula verified all 1,420 formulas in your active sheets. Recalculation speed is instant.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
