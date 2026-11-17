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
    // Slight delay so the slide is fully visible before init
    const t = setTimeout(initOrUpdateChart, 80)
    const container = chartContainerRef.current
    let ro: ResizeObserver | null = null
    if (container && window.ResizeObserver) {
      ro = new ResizeObserver(() => chartInstanceRef.current?.resize())
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

  const chartTypeIcon: Record<string, string> = {
    bar: '▦',
    line: '📈',
    pie: '◔',
    scatter: '⬤',
    area: '▲',
    histogram: '▬',
  }

  return (
    <section className="relative h-full w-full flex flex-col bg-gradient-to-br from-[#F8FAF8] via-white to-[#F0F7F0] overflow-hidden">
      {/* Decorative background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#107C41 1px, transparent 1px), linear-gradient(90deg, #107C41 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Slide header */}
      <div className="relative flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        {/* Chart meta */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#107C41] text-white flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0">
            {chartTypeIcon[recommendation.chartType] ?? '📊'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#EAF5EE] text-[#107C41] border border-emerald-200">
                {recommendation.chartType}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {recommendation.aggregation !== 'none'
                  ? `${recommendation.aggregation} aggregation`
                  : 'direct values'}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-zinc-900 tracking-tight leading-snug mt-0.5 truncate max-w-lg">
              {recommendation.title}
            </h2>
            {recommendation.description && (
              <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-lg">
                {recommendation.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowExplanation((v) => !v)}
            className={`p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              showExplanation
                ? 'bg-[#107C41] text-white border-[#107C41]'
                : 'text-zinc-400 hover:text-[#107C41] hover:bg-[#F2F7F4] border-zinc-200 bg-white'
            }`}
            title="Why AI selected this chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(recommendation.id)}
              className="p-2 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-zinc-200 bg-white"
              title="Remove Chart"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* AI Rationale */}
      {showExplanation && (
        <div className="relative mx-6 mb-3 px-4 py-2.5 rounded-xl bg-[#F0F7F2] border border-[#C8E6D0] text-xs text-[#0D361C] flex items-start gap-2.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="font-semibold text-[#107C41]">AI Rationale: </strong>
            {recommendation.explanation}
          </div>
        </div>
      )}

      {/* AI Insight (shown on first chart slide) */}
      {index === 0 && overallInsight && (
        <div className="relative mx-6 mb-3 px-4 py-2.5 rounded-xl bg-[#EAF5EE] border border-[#CDE5D5] text-xs text-[#0D361C] flex items-start gap-2.5 flex-shrink-0">
          <div className="w-5 h-5 rounded bg-[#107C41] text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0">
            AI
          </div>
          <div>
            <strong className="font-semibold text-[#0D6234]">Executive Insight: </strong>
            {overallInsight}
          </div>
        </div>
      )}

      {/* Chart canvas — takes remaining height */}
      <div className="relative flex-1 mx-6 mb-4 min-h-0">
        <div className="w-full h-full rounded-2xl bg-white shadow-sm border border-[#E2E8E4] overflow-hidden p-4">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Slide footer: dimension/metric info + nav */}
      <div className="relative flex items-center justify-between px-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono">
          <span>
            Dimension:{' '}
            <strong className="text-zinc-600 font-medium font-sans">
              {recommendation.xAxisColumn}
            </strong>
          </span>
          <span>
            Metric:{' '}
            <strong className="text-zinc-600 font-medium font-sans">
              {recommendation.yAxisColumns.join(', ')}
            </strong>
          </span>
          {chart.calculatedPoints != null && (
            <span>
              <strong className="text-zinc-600 font-medium font-sans">{chart.calculatedPoints}</strong> data points
            </span>
          )}
        </div>

        {/* Slide nav arrows */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onScrollUp}
            className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-[#107C41] hover:border-[#107C41] transition-colors cursor-pointer shadow-xs"
            title="Previous slide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <span className="text-[11px] text-zinc-400 font-mono px-1">
            Chart {index + 1}/{total}
          </span>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={onScrollDown}
              className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-[#107C41] hover:border-[#107C41] transition-colors cursor-pointer shadow-xs"
              title="Next slide"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8" /> /* spacer */
          )}
        </div>
      </div>
    </section>
  )
}
