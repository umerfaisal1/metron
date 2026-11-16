import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'
import { ChartRecommendation, SheetAnalysis } from '@/lib/charts/types'

export type AgentActionType =
  | 'create_spreadsheet'
  | 'modify_spreadsheet'
  | 'generate_charts'
  | 'advise_or_explain'

export interface AgentSpreadsheetState {
  title: string
  columns: ColumnDef[]
  data: Array<Array<string | number | boolean>>
  metadata?: {
    summary?: string
    notes?: string
    category?: string
    prompt?: string
    [key: string]: unknown
  }
}

export interface AgentCreateSpreadsheetArgs {
  title: string
  summary: string
  category?: string
  columns: Array<{
    title: string
    type?: 'text' | 'numeric' | 'dropdown'
    source?: string[]
    width?: number
  }>
  data: Array<Array<string | number | boolean>>
  notes?: string
}

export interface AgentModifySpreadsheetArgs {
  actionType:
    | 'add_column'
    | 'update_cells'
    | 'add_rows'
    | 'delete_column'
    | 'delete_rows'
    | 'calculate_formula'
    | 'transform_data'
    | 'general_edit'
  title: string
  summary: string
  columns: Array<{
    title: string
    type?: 'text' | 'numeric' | 'dropdown'
    source?: string[]
    width?: number
  }>
  data: Array<Array<string | number | boolean>>
  notes?: string
}

export interface AgentGenerateChartsArgs {
  isSuitableForVisualization: boolean
  unsuitabilityReason?: string
  overallInsight: string
  charts: ChartRecommendation[]
}

export interface AgentAdviseArgs {
  message: string
  suggestions?: string[]
}

export interface AgentExecutionStep {
  toolName: AgentActionType
  args: Record<string, unknown>
  summary: string
}

export interface AgentResponse {
  success: boolean
  message: string
  stepsExecuted: AgentExecutionStep[]
  spreadsheet?: AgentSpreadsheetState
  charts?: ChartRecommendation[]
  error?: string
}

export interface AgentTaskRequest {
  task: 'generate' | 'modify' | 'chart' | 'autonomous'
  prompt: string
  currentSpreadsheet?: AgentSpreadsheetState
  analysis?: SheetAnalysis
}
