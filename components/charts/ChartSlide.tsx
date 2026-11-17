'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { ProcessedChartData } from '@/lib/charts/types'

interface ChartSlideProps {
  chart: ProcessedChartData
  index: number
  total: number
  overallInsight?: string | null
  onRemove?: (id: string) => void
  onScrollUp: () => void
  onScrollDown: () => void
}

export default function ChartSlide({
  chart,
  index,
  total,
  overallInsight,
  onRemove,
  onScrollUp,
  onScrollDown,
}: ChartSlideProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const initOrUpdateChart = useCallback(() => {
    if (!chartContainerRef.current) return
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current, undefined, {
        renderer: 'canvas',
      })
    }
    const instance = chartInstanceRef.current
    if (instance && chart.echartsOption) {
      instance.setOption(chart.echartsOption, true)
      instance.resize()
    }
  }, [chart.echartsOption])

  useEffect(() => {
    // Slight delay so the slide layout is computed before init
    const t = setTimeout(initOrUpdateChart, 60)
    const container = chartContainerRef.current
    let ro: ResizeObserver | null = null
    if (container && window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        chartInstanceRef.current?.resize()
      })
      ro.observe(container)
    }
    return () => {
      clearTimeout(t)
      ro?.disconnect()
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
    }
  }, [initOrUpdateChart])

  const { recommendation } = chart

  const chartTypeBadgeColor: Record<string, { bg: string; text: string; border: string }> = {
    bar: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    line: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    pie: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    scatter: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    area: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    histogram: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  }

  const badgeStyle = chartTypeBadgeColor[recommendation.chartType] || {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-3 sm:p-6 md:p-8">
      {/* Gamma-style Presentation Slide Card */}
      <div className="w-full max-w-5xl h-[86vh] max-h-[820px] min-h-[500px] bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-zinc-900/8 border border-zinc-200/90 flex flex-col overflow-hidden relative ring-1 ring-black/[0.04] transition-all">
        {/* Slide Top Chrome / Header */}
        <div className="px-6 py-4 bg-[#FAF9F7] border-b border-zinc-200/80 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Slide Index Badge */}
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-mono flex-shrink-0">
              Slide {index + 2}
            </span>

            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} flex-shrink-0`}>
              {recommendation.chartType}
            </span>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug truncate max-w-md sm:max-w-xl">
                {recommendation.title}
              </h2>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowExplanation((v) => !v)}
              className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                showExplanation
                  ? 'bg-[#107C41] text-white border-[#107C41] shadow-xs'
                  : 'text-zinc-500 hover:text-[#107C41] hover:bg-emerald-50 border-zinc-200 bg-white shadow-2xs'
              }`}
              title="Toggle AI Rationale"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(recommendation.id)}
                className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-zinc-200 bg-white shadow-2xs"
                title="Remove Chart Slide"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* AI Rationale Accordion */}
        {showExplanation && (
          <div className="px-6 py-3 bg-[#F0F7F2] border-b border-[#C8E6D0] text-xs text-[#0D361C] flex items-start gap-2.5 flex-shrink-0 animate-in fade-in duration-150">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
            <div className="leading-relaxed">
              <strong className="font-semibold text-[#107C41]">AI Rationale: </strong>
              {recommendation.explanation}
            </div>
          </div>
        )}

        {/* Executive Insight Banner (Slide 1 of Charts) */}
        {index === 0 && overallInsight && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-[#EAF5EE] to-[#E3F2E7] border-b border-[#CDE5D5] text-xs text-[#0D361C] flex items-center gap-3 flex-shrink-0">
            <div className="w-5 h-5 rounded-md bg-[#107C41] text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0 shadow-2xs">
              AI
            </div>
            <p className="text-zinc-700 leading-normal truncate">
              <strong className="text-[#0D6234] font-semibold">Key Insight: </strong>
              {overallInsight}
            </p>
          </div>
        )}

        {/* Description line if available */}
        {recommendation.description && (
          <div className="px-6 pt-3 pb-1 text-xs text-zinc-500 flex-shrink-0">
            {recommendation.description}
          </div>
        )}

        {/* ECharts Presentation Canvas Area */}
        <div className="flex-1 w-full min-h-0 p-4 sm:p-6 bg-white relative">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Slide Footer */}
        <div className="px-6 py-3 bg-[#FAF9F7] border-t border-zinc-200/80 flex items-center justify-between gap-4 text-xs text-zinc-500 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-6 text-[11px] flex-wrap">
            <span>
              X-Axis:{' '}
              <strong className="text-zinc-800 font-semibold">{recommendation.xAxisColumn}</strong>
            </span>
            <span className="hidden sm:inline text-zinc-300">•</span>
            <span>
              Metric:{' '}
              <strong className="text-zinc-800 font-semibold">
                {recommendation.yAxisColumns.join(', ')}
              </strong>
            </span>
            {recommendation.aggregation !== 'none' && (
              <>
                <span className="hidden sm:inline text-zinc-300">•</span>
                <span className="capitalize text-zinc-500 font-mono text-[10px]">
                  {recommendation.aggregation}
                </span>
              </>
            )}
            {chart.calculatedPoints != null && (
              <>
                <span className="hidden sm:inline text-zinc-300">•</span>
                <span className="text-zinc-400 font-mono text-[10px]">
                  {chart.calculatedPoints} points
                </span>
              </>
            )}
          </div>

          {/* Slide Arrow Navigation */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={onScrollUp}
              className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:border-[#107C41] hover:text-[#107C41] text-zinc-600 transition-colors cursor-pointer shadow-2xs"
              title="Previous slide (↑)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            <span className="text-[11px] font-mono text-zinc-500 px-1">
              {index + 1} / {total}
            </span>

            {index < total - 1 ? (
              <button
                type="button"
                onClick={onScrollDown}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:border-[#107C41] hover:text-[#107C41] text-zinc-600 transition-colors cursor-pointer shadow-2xs"
                title="Next slide (↓)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <div className="w-7 h-7" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
