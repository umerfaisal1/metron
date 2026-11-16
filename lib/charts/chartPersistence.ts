import { ProcessedChartData } from './types'

export interface ChartDbRow {
  id?: string
  spreadsheet_id: string
  user_id: string | null
  chart_id: string
  title: string
  description: string | null
  chart_type: string
  x_axis_column: string
  y_axis_columns: string[]
  aggregation: string
  explanation: string | null
  color_palette: string[]
  options: Record<string, unknown>
  echarts_option: Record<string, unknown>
  metadata: {
    calculatedPoints?: number
    warning?: string | null
    [key: string]: unknown
  }
  created_at?: string
  updated_at?: string
}

/**
 * Maps a Supabase `public.charts` database row to the application's `ProcessedChartData` model.
 */
export function mapRowToProcessedChart(row: any): ProcessedChartData {
  return {
    recommendation: {
      id: row.chart_id,
      title: row.title || 'Untitled Chart',
      description: row.description || '',
      chartType: row.chart_type || 'bar',
      xAxisColumn: row.x_axis_column || '',
      yAxisColumns: Array.isArray(row.y_axis_columns) ? row.y_axis_columns : [],
      aggregation: row.aggregation || 'sum',
      explanation: row.explanation || '',
      colorPalette: Array.isArray(row.color_palette) ? row.color_palette : undefined,
      options: row.options || {},
    },
    echartsOption: row.echarts_option || {},
    calculatedPoints: row.metadata?.calculatedPoints ?? 0,
    warning: row.metadata?.warning ?? undefined,
  }
}

/**
 * Prepares a `ProcessedChartData` object for insert/upsert into the `public.charts` table.
 */
export function chartToDbRow(
  chart: ProcessedChartData,
  spreadsheetId: string,
  userId: string | null = null
): Omit<ChartDbRow, 'id' | 'created_at'> {
  return {
    spreadsheet_id: spreadsheetId,
    user_id: userId,
    chart_id: chart.recommendation.id,
    title: chart.recommendation.title,
    description: chart.recommendation.description || null,
    chart_type: chart.recommendation.chartType,
    x_axis_column: chart.recommendation.xAxisColumn,
    y_axis_columns: chart.recommendation.yAxisColumns || [],
    aggregation: chart.recommendation.aggregation || 'sum',
    explanation: chart.recommendation.explanation || null,
    color_palette: chart.recommendation.colorPalette || [],
    options: chart.recommendation.options || {},
    echarts_option: chart.echartsOption || {},
    metadata: {
      calculatedPoints: chart.calculatedPoints,
      warning: chart.warning || null,
    },
    updated_at: new Date().toISOString(),
  }
}
