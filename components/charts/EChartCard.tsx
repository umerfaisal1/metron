'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { ProcessedChartData } from '@/lib/charts/types'

interface EChartCardProps {
  chart: ProcessedChartData
  onRemove?: (id: string) => void
  onTypeChange?: (id: string, newType: 'bar' | 'line' | 'pie') => void
}

export default function EChartCard({ chart, onRemove }: EChartCardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // Initialize and update ECharts
  const initOrUpdateChart = useCallback(() => {
    if (!chartContainerRef.current) return

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current)
    }

    const instance = chartInstanceRef.current
    if (instance && chart.echartsOption) {
      instance.setOption(chart.echartsOption, true)
      instance.resize()
    }
  }, [chart.echartsOption])

  useEffect(() => {
    initOrUpdateChart()

    // Handle responsive resize with ResizeObserver
    const container = chartContainerRef.current
    let resizeObserver: ResizeObserver | null = null

    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        chartInstanceRef.current?.resize()
      })
      resizeObserver.observe(container)
    }

    const handleWindowResize = () => {
      chartInstanceRef.current?.resize()
    }
    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      if (resizeObserver && container) {
        resizeObserver.unobserve(container)
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [initOrUpdateChart])

  const { recommendation } = chart

  return (
    <div className="flex flex-col rounded-2xl bg-white border border-[#E2E8E4] shadow-xs hover:shadow-md transition-all overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-3.5 bg-[#FAFBF9] border-b border-[#EAEFEA] flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EAF5EE] text-[#107C41]">
              {recommendation.chartType.toUpperCase()}
            </span>
            <span className="text-[10px] text-zinc-400">
              {recommendation.aggregation !== 'none' ? `Aggregated by ${recommendation.aggregation}` : 'Direct values'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight leading-snug">
            {recommendation.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
            {recommendation.description}
          </p>
        </div>

        {/* Card Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              showExplanation
                ? 'bg-[#107C41] text-white'
                : 'text-zinc-400 hover:text-[#107C41] hover:bg-[#F2F7F4]'
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
              className="p-1.5 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove Chart"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* AI Explanation Accordion */}
      {showExplanation && (
        <div className="px-5 py-2.5 bg-[#F0F7F2] border-b border-[#D8EADB] text-xs text-[#0D361C] flex items-start gap-2.5 animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <strong className="font-semibold text-[#107C41]">AI Rationale:</strong>{' '}
            {recommendation.explanation}
          </div>
        </div>
      )}

      {/* Main ECharts Canvas */}
      <div className="p-3 w-full bg-white relative">
        <div ref={chartContainerRef} className="w-full h-72 sm:h-80" />
      </div>

      {/* Card Footer Metric Info */}
      <div className="px-5 py-2 bg-[#FAFBF9] border-t border-[#EAEFEA] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Dimension: <strong className="text-zinc-600 font-medium">{recommendation.xAxisColumn}</strong></span>
        <span>Metric: <strong className="text-zinc-600 font-medium">{recommendation.yAxisColumns.join(', ')}</strong></span>
      </div>
    </div>
  )
}
