import { create } from 'zustand'
import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'
import { ProcessedChartData } from '@/lib/charts/types'
import { buildChartDataAndOption } from '@/lib/charts/aggregationEngine'

export type ViewMode = 'spreadsheet' | 'charts' | 'split'

interface SpreadsheetState {
  // Workbook data
  id?: string
  title: string
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
  metadata: {
    summary?: string
    notes?: string
    prompt?: string
    [key: string]: unknown
  }

  // Active view
  activeView: ViewMode

  // Charts state
  charts: ProcessedChartData[]
  isGeneratingCharts: boolean
  chartError: string | null
  overallInsight: string | null
  isSuitableForVisualization: boolean
  unsuitabilityReason: string | null

  // Save state
  saveStatus: string
  isSaving: boolean

  // Actions
  setWorkbook: (params: {
    id?: string
    title: string
    columns: ColumnDef[]
    data: Array<Array<string | number | boolean>>
    metadata?: Record<string, unknown>
  }) => void
  setTitle: (title: string) => void
  setColumns: (columns: ColumnDef[]) => void
  setActiveView: (view: ViewMode) => void
  updateData: (newData: Array<Array<string | number | boolean>>) => void
  updateCell: (row: number, col: number, value: string | number | boolean) => void
  setSaveStatus: (status: string) => void
  setIsSaving: (isSaving: boolean) => void

  // Chart Actions
  setCharts: (charts: ProcessedChartData[]) => void
  removeChart: (chartId: string) => void
  recalculateCharts: () => void
  generateAICharts: () => Promise<void>
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  id: undefined,
  title: 'Untitled Spreadsheet',
  columns: [],
  data: [],
  metadata: {},
  activeView: 'spreadsheet',

  charts: [],
  isGeneratingCharts: false,
  chartError: null,
  overallInsight: null,
  isSuitableForVisualization: true,
  unsuitabilityReason: null,

  saveStatus: 'Saved to Cloud',
  isSaving: false,

  setWorkbook: ({ id, title, columns, data, metadata }) => {
    set({
      id,
      title: title || 'Untitled Spreadsheet',
      columns: columns || [],
      data: data || [],
      metadata: metadata || {},
    })
  },

  setTitle: (title) => set({ title, saveStatus: 'Unsaved edits' }),
  setColumns: (columns) => set({ columns, saveStatus: 'Unsaved edits' }),
  setActiveView: (activeView) => set({ activeView }),

  updateData: (newData) => {
    set({ data: newData, saveStatus: 'Unsaved edits' })
    // Automatically re-compute chart series to keep visualizations synchronized!
    get().recalculateCharts()
  },

  updateCell: (row, col, value) => {
    const currentData = get().data
    const updated = currentData.map((r, rIdx) => {
      if (rIdx !== row) return r
      const nextRow = [...r]
      nextRow[col] = value
      return nextRow
    })
    set({ data: updated, saveStatus: 'Unsaved edits' })
    get().recalculateCharts()
  },

  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setIsSaving: (isSaving) => set({ isSaving }),

  setCharts: (charts) => set({ charts }),

  removeChart: (chartId) => {
    set((state) => ({
      charts: state.charts.filter((c) => c.recommendation.id !== chartId),
    }))
  },

  // Recalculates all active charts deterministically from current grid data
  recalculateCharts: () => {
    const { charts, columns, data } = get()
    if (!charts || charts.length === 0 || !data || data.length === 0) return

    try {
      const refreshedCharts: ProcessedChartData[] = charts.map((chart) => {
        return buildChartDataAndOption(chart.recommendation, columns, data)
      })
      set({ charts: refreshedCharts })
    } catch (err) {
      console.warn('Error recalculating charts from updated spreadsheet data:', err)
    }
  },

  // Calls AI chart generation API
  generateAICharts: async () => {
    const { title, columns, data, metadata } = get()
    if (!columns || columns.length === 0 || !data || data.length === 0) {
      set({ chartError: 'Spreadsheet has no data to visualize.' })
      return
    }

    set({ isGeneratingCharts: true, chartError: null })

    try {
      const res = await fetch('/api/charts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, columns, data, metadata }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to generate charts.')
      }

      set({
        isGeneratingCharts: false,
        charts: json.charts || [],
        overallInsight: json.overallInsight || null,
        isSuitableForVisualization: json.isSuitableForVisualization ?? true,
        unsuitabilityReason: json.unsuitabilityReason || null,
      })
    } catch (err: unknown) {
      set({
        isGeneratingCharts: false,
        chartError: err instanceof Error ? err.message : 'Failed to analyze and generate charts.',
      })
    }
  },
}))
