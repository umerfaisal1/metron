import type { EChartsOption } from 'echarts'

export type ColumnDataType = 'text' | 'numeric' | 'dropdown' | 'date'

export type DetectedRole = 'temporal' | 'categorical' | 'quantitative' | 'identifier'

export interface ColumnAnalysis {
  index: number
  title: string
  declaredType?: string
  detectedType: ColumnDataType
  detectedRole: DetectedRole
  sampleValues: Array<string | number | boolean | null>
  nonNullCount: number
  distinctCount: number
  isNumeric: boolean
  isDate: boolean
  stats?: {
    min?: number
    max?: number
    sum?: number
    avg?: number
  }
}

export interface SheetAnalysis {
  sheetName: string
  rowCount: number
  colCount: number
  columns: ColumnAnalysis[]
  hasSummaryRow: boolean
  summaryRowIndex?: number
  suggestedInsights: string[]
  isSuitableForVisualization: boolean
  unsuitabilityReason?: string
}

export interface WorkbookAnalysisResult {
  title: string
  sheets: SheetAnalysis[]
  activeSheet: SheetAnalysis
  primaryDateColumn?: string
  primaryCategoryColumn?: string
  metricColumns: string[]
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area'

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'none'

export interface ChartRecommendation {
  id: string
  title: string
  description: string
  chartType: ChartType
  xAxisColumn: string
  yAxisColumns: string[]
  aggregation: AggregationType
  explanation: string
  colorPalette?: string[]
  options?: {
    stacked?: boolean
    donut?: boolean
    smooth?: boolean
    horizontal?: boolean
    showDataLabels?: boolean
  }
}

export interface ProcessedChartData {
  recommendation: ChartRecommendation
  echartsOption: EChartsOption
  calculatedPoints: number
  warning?: string
}

export interface AIChartResponse {
  isSuitableForVisualization: boolean
  unsuitabilityReason?: string
  overallInsight: string
  charts: ChartRecommendation[]
}
