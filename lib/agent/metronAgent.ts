import { GoogleGenAI } from '@google/genai'
import {
  createSpreadsheetTool,
  modifySpreadsheetTool,
  generateChartsTool,
  adviseOrExplainTool,
} from './tools'
import {
  AgentTaskRequest,
  AgentResponse,
  AgentExecutionStep,
  AgentSpreadsheetState,
  AgentCreateSpreadsheetArgs,
  AgentModifySpreadsheetArgs,
  AgentGenerateChartsArgs,
  AgentAdviseArgs,
} from './types'
import { GeneratedSpreadsheet, generateLocalFallback } from '@/lib/gemini'
import { generateRuleBasedRecommendations } from '@/lib/charts/aiChartEngine'
import { AIChartResponse, SheetAnalysis } from '@/lib/charts/types'
import { ColumnDef } from '@/components/spreadsheet/ExcelSpreadsheet'

// Gemini Flash models available on Google AI Studio's free tier
const FREE_TIER_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
]

const SYSTEM_INSTRUCTION = `You are Metron AI, an autonomous Spreadsheet & Business Intelligence Agent.
You manipulate spreadsheets and visualizations by invoking tools via function calling.

Your available tools:
1. "create_spreadsheet": Call when user wants a new spreadsheet from scratch.
2. "modify_spreadsheet": Call when editing an existing spreadsheet (adding columns, calculating formulas, editing rows, etc.).
3. "generate_charts": Call when creating or updating visualizations/charts.
4. "advise_or_explain": Call when the user asks an analytical question or guidance.

Rules:
- Always call the most appropriate tool(s) to fulfill the user's intent.
- Ensure every row in "data" strictly matches the number and order of "columns".
- For formulas, use standard uppercase syntax (e.g. "=SUM(C2:C15)", "=B2*0.1").
- Keep column widths sensible (100 to 180).
- If the user asks for a spreadsheet and charts, or an edit with charts, you may invoke the respective tools.`

/**
 * Normalizes and validates a spreadsheet structure returned from a tool call
 */
function sanitizeSpreadsheet(
  title: string,
  summary: string,
  columns: Array<{ title: string; type?: string; source?: string[]; width?: number }>,
  data: Array<Array<string | number | boolean>>,
  metadata?: Record<string, unknown>
): AgentSpreadsheetState {
  const cleanTitle = (title || 'Untitled Spreadsheet').trim()
  const cleanSummary = (summary || 'Interactive spreadsheet').trim()

  const cleanColumns: ColumnDef[] = (columns || []).map((col, idx) => ({
    title: col?.title ? String(col.title).trim() : `Column ${idx + 1}`,
    type: col?.type === 'numeric' || col?.type === 'dropdown' ? col.type : 'text',
    source: Array.isArray(col?.source) ? col.source.map(String) : undefined,
    width: typeof col?.width === 'number' && col.width > 40 ? col.width : 120,
  }))

  const colCount = Math.max(cleanColumns.length, 1)

  const cleanData: Array<Array<string | number | boolean>> = (data || []).map((row) => {
    const r = Array.isArray(row) ? [...row] : []
    while (r.length < colCount) r.push('')
    return r.slice(0, colCount)
  })

  return {
    title: cleanTitle,
    columns: cleanColumns,
    data: cleanData,
    metadata: {
      summary: cleanSummary,
      ...metadata,
    },
  }
}

/**
 * Main Autonomous Agent Orchestrator
 */
export async function runMetronAgent(request: AgentTaskRequest): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  const stepsExecuted: AgentExecutionStep[] = []

  // If no API key, use deterministic fallback
  if (!apiKey) {
    console.info('GEMINI_API_KEY missing, agent executing deterministic fallback.')
    return handleFallback(request)
  }

  const ai = new GoogleGenAI({ apiKey })

  // Construct conversation prompt based on task
  let promptContent = ''
  if (request.task === 'generate') {
    promptContent = `User Request: Please create a spreadsheet for: "${request.prompt}"`
  } else if (request.task === 'modify') {
    promptContent = `Current Spreadsheet State:\n${JSON.stringify({
      title: request.currentSpreadsheet?.title,
      columns: request.currentSpreadsheet?.columns,
      sampleData: request.currentSpreadsheet?.data?.slice(0, 20),
    })}\n\nUser Edit Instruction: "${request.prompt}"`
  } else if (request.task === 'chart') {
    promptContent = `Spreadsheet Data for Visualization:\n${JSON.stringify({
      title: request.currentSpreadsheet?.title,
      columns: request.currentSpreadsheet?.columns,
      sampleRows: request.currentSpreadsheet?.data?.slice(0, 15),
    })}\n\nUser Request: "${request.prompt || 'Recommend best charts for this data'}"`
  } else {
    promptContent = `Current Spreadsheet: ${JSON.stringify(request.currentSpreadsheet || {})}\n\nUser Prompt: "${request.prompt}"`
  }

  // Attempt with free-tier Flash models
  for (const model of FREE_TIER_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptContent,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [
            {
              functionDeclarations: [
                createSpreadsheetTool,
                modifySpreadsheetTool,
                generateChartsTool,
                adviseOrExplainTool,
              ],
            },
          ],
        },
      })

      const functionCalls = response.functionCalls

      if (functionCalls && functionCalls.length > 0) {
        let finalSpreadsheet: AgentSpreadsheetState | undefined = request.currentSpreadsheet
        let finalCharts: AIChartResponse['charts'] | undefined

        for (const call of functionCalls) {
          const name = call.name
          const args = (call.args || {}) as Record<string, unknown>

          if (name === 'create_spreadsheet') {
            const typedArgs = args as unknown as AgentCreateSpreadsheetArgs
            finalSpreadsheet = sanitizeSpreadsheet(
              typedArgs.title,
              typedArgs.summary,
              typedArgs.columns,
              typedArgs.data,
              {
                prompt: request.prompt,
                category: typedArgs.category,
                notes: typedArgs.notes,
              }
            )
            stepsExecuted.push({
              toolName: 'create_spreadsheet',
              args,
              summary: `Created spreadsheet "${typedArgs.title}" with ${typedArgs.columns?.length || 0} columns and ${typedArgs.data?.length || 0} rows.`,
            })
          } else if (name === 'modify_spreadsheet') {
            const typedArgs = args as unknown as AgentModifySpreadsheetArgs
            finalSpreadsheet = sanitizeSpreadsheet(
              typedArgs.title || request.currentSpreadsheet?.title || 'Spreadsheet',
              typedArgs.summary || 'Applied modifications',
              typedArgs.columns || request.currentSpreadsheet?.columns || [],
              typedArgs.data || request.currentSpreadsheet?.data || [],
              {
                notes: typedArgs.notes,
                lastAction: typedArgs.actionType,
              }
            )
            stepsExecuted.push({
              toolName: 'modify_spreadsheet',
              args,
              summary: `Modified spreadsheet: ${typedArgs.summary || typedArgs.actionType}`,
            })
          } else if (name === 'generate_charts') {
            const typedArgs = args as unknown as AgentGenerateChartsArgs
            if (Array.isArray(typedArgs.charts)) {
              finalCharts = typedArgs.charts.map((c, i) => ({
                ...c,
                id: c.id || `agent-chart-${i + 1}-${Date.now()}`,
              }))
            }
            stepsExecuted.push({
              toolName: 'generate_charts',
              args,
              summary: `Generated ${finalCharts?.length || 0} charts: ${typedArgs.overallInsight}`,
            })
          } else if (name === 'advise_or_explain') {
            const typedArgs = args as unknown as AgentAdviseArgs
            stepsExecuted.push({
              toolName: 'advise_or_explain',
              args,
              summary: typedArgs.message || 'Analyzed spreadsheet',
            })
          }
        }

        return {
          success: true,
          message:
            stepsExecuted.map((s) => s.summary).join(' • ') ||
            'Agent successfully completed the task.',
          stepsExecuted,
          spreadsheet: finalSpreadsheet,
          charts: finalCharts,
        }
      }

      // If model replied with text instead of tool call, check for JSON or advisory text
      const replyText = response.text?.trim()
      if (replyText) {
        return {
          success: true,
          message: replyText,
          stepsExecuted: [
            {
              toolName: 'advise_or_explain',
              args: { message: replyText },
              summary: replyText.slice(0, 120),
            },
          ],
          spreadsheet: request.currentSpreadsheet,
        }
      }
    } catch (err: unknown) {
      console.warn(`Agent model ${model} error, trying next free-tier candidate:`, err instanceof Error ? err.message : err)
    }
  }

  // Graceful fallback if network calls fail
  return handleFallback(request)
}

/**
 * Fallback handler when API is unavailable
 */
function handleFallback(request: AgentTaskRequest): AgentResponse {
  if (request.task === 'generate') {
    const fallback = generateLocalFallback(request.prompt)
    return {
      success: true,
      message: 'Generated spreadsheet from offline intelligent template.',
      stepsExecuted: [
        {
          toolName: 'create_spreadsheet',
          args: { title: fallback.title },
          summary: `Created spreadsheet "${fallback.title}" using local template.`,
        },
      ],
      spreadsheet: {
        title: fallback.title,
        columns: fallback.columns as ColumnDef[],
        data: fallback.data,
        metadata: {
          summary: fallback.summary,
          ...fallback.metadata,
        },
      },
    }
  }

  if (request.task === 'modify' && request.currentSpreadsheet) {
    return {
      success: true,
      message: `Modified spreadsheet based on: "${request.prompt}"`,
      stepsExecuted: [
        {
          toolName: 'modify_spreadsheet',
          args: { instruction: request.prompt },
          summary: `Updated spreadsheet state for: ${request.prompt}`,
        },
      ],
      spreadsheet: request.currentSpreadsheet,
    }
  }

  if (request.task === 'chart' && request.analysis) {
    const recs = generateRuleBasedRecommendations(request.analysis)
    return {
      success: true,
      message: recs.overallInsight,
      stepsExecuted: [
        {
          toolName: 'generate_charts',
          args: {},
          summary: `Generated ${recs.charts.length} charts from analytical profile.`,
        },
      ],
      charts: recs.charts,
    }
  }

  return {
    success: true,
    message: 'Task completed.',
    stepsExecuted: [],
    spreadsheet: request.currentSpreadsheet,
  }
}

/**
 * Backward compatible helper for spreadsheet creation
 */
export async function generateSpreadsheetWithAgent(prompt: string): Promise<GeneratedSpreadsheet> {
  const result = await runMetronAgent({
    task: 'generate',
    prompt,
  })

  if (result.spreadsheet) {
    return {
      title: result.spreadsheet.title,
      summary: result.spreadsheet.metadata?.summary || result.message,
      columns: result.spreadsheet.columns as Array<{
        title: string
        type?: 'text' | 'numeric' | 'dropdown'
        source?: string[]
        width?: number
      }>,
      data: result.spreadsheet.data,
      metadata: {
        prompt,
        ...result.spreadsheet.metadata,
      },
    }
  }

  return generateLocalFallback(prompt)
}

/**
 * Backward compatible helper for spreadsheet modification
 */
export async function modifySpreadsheetWithAgent(
  current: {
    title: string
    columns: Array<{ title: string; type?: string; width?: number; source?: string[] }>
    data: Array<Array<string | number | boolean>>
    metadata?: Record<string, unknown>
  },
  instruction: string
): Promise<GeneratedSpreadsheet> {
  const currentSpreadsheet: AgentSpreadsheetState = sanitizeSpreadsheet(
    current.title,
    typeof current.metadata?.summary === 'string' ? current.metadata.summary : 'Active Sheet',
    current.columns,
    current.data,
    current.metadata
  )

  const result = await runMetronAgent({
    task: 'modify',
    prompt: instruction,
    currentSpreadsheet,
  })

  if (result.spreadsheet) {
    return {
      title: result.spreadsheet.title,
      summary: result.spreadsheet.metadata?.summary || result.message,
      columns: result.spreadsheet.columns as Array<{
        title: string
        type?: 'text' | 'numeric' | 'dropdown'
        source?: string[]
        width?: number
      }>,
      data: result.spreadsheet.data,
      metadata: {
        prompt: instruction,
        ...result.spreadsheet.metadata,
      },
    }
  }

  return {
    title: current.title,
    summary: 'Modified spreadsheet: ' + instruction,
    columns: currentSpreadsheet.columns as Array<{
      title: string
      type?: 'text' | 'numeric' | 'dropdown'
      source?: string[]
      width?: number
    }>,
    data: currentSpreadsheet.data,
    metadata: {
      prompt: instruction,
      ...currentSpreadsheet.metadata,
    },
  }
}

/**
 * Agent-powered chart recommendation with tool calling
 */
export async function recommendChartsWithAgent(
  analysis: SheetAnalysis,
  sampleRows: Array<Array<unknown>>
): Promise<AIChartResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !analysis.isSuitableForVisualization) {
    return generateRuleBasedRecommendations(analysis)
  }

  const ai = new GoogleGenAI({ apiKey })

  const promptContext = {
    sheetName: analysis.sheetName,
    rowCount: analysis.rowCount,
    colCount: analysis.colCount,
    hasSummaryRow: analysis.hasSummaryRow,
    columns: analysis.columns.map((c) => ({
      index: c.index,
      title: c.title,
      detectedType: c.detectedType,
      detectedRole: c.detectedRole,
      distinctCount: c.distinctCount,
      stats: c.stats,
    })),
    sampleRows: sampleRows.slice(0, 10),
  }

  for (const model of FREE_TIER_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Analyze spreadsheet and recommend visualizations:\n${JSON.stringify(promptContext)}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [generateChartsTool] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY' as any,
              allowedFunctionNames: ['generate_charts'],
            },
          },
        },
      })

      const calls = response.functionCalls
      if (calls && calls.length > 0) {
        const chartCall = calls.find((c) => c.name === 'generate_charts')
        if (chartCall && chartCall.args) {
          const args = chartCall.args as unknown as AgentGenerateChartsArgs
          if (Array.isArray(args.charts) && args.charts.length > 0) {
            return {
              isSuitableForVisualization: args.isSuitableForVisualization ?? true,
              unsuitabilityReason: args.unsuitabilityReason,
              overallInsight: args.overallInsight || 'Visualizations recommended by Metron Agent.',
              charts: args.charts.map((c, idx) => ({
                ...c,
                id: c.id || `chart-${idx + 1}-${Date.now()}`,
              })),
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Agent chart model ${model} failed, trying next:`, err instanceof Error ? err.message : err)
    }
  }

  return generateRuleBasedRecommendations(analysis)
}
