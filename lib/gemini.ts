import {
  generateSpreadsheetWithAgent,
  modifySpreadsheetWithAgent,
} from './agent/metronAgent'

export interface GeneratedSpreadsheet {
  title: string
  summary: string
  columns: Array<{
    title: string
    type?: 'text' | 'numeric' | 'dropdown'
    source?: string[]
    width?: number
  }>
  data: Array<Array<string | number | boolean>>
  metadata?: {
    prompt: string
    category?: string
    notes?: string
    [key: string]: unknown
  }
}

// Fallback intelligent templates if Gemini API encounters network timeouts or rate limits
export function generateLocalFallback(prompt: string): GeneratedSpreadsheet {
  const p = prompt.toLowerCase()

  if (p.includes('mess') || p.includes('food') || p.includes('calendar') || p.includes('daily expense')) {
    const days = 14
    const rows: Array<Array<string | number | boolean>> = []
    let total = 0

    for (let i = 1; i <= days; i++) {
      const dateStr = `2025-11-${String(i).padStart(2, '0')}`
      const isMess = i % 4 !== 0 ? 'YES' : 'NO'
      const messCost = isMess === 'YES' ? 500 : 0
      const extraCategories = ['Transport', 'Shopping', 'Snacks', 'Groceries', 'Utilities']
      const extraCategory = extraCategories[i % extraCategories.length]
      const extraCost = (i * 120) % 700
      const dayTotal = messCost + extraCost
      total += dayTotal

      rows.push([dateStr, `Day ${i}`, isMess, messCost, extraCategory, extraCost, dayTotal, total])
    }

    return {
      title: 'Monthly Expense & Daily Mess Food Calculator',
      summary: 'Calendar days with toggleable mess food at Rs. 500/day, categorical expenses, and running total.',
      columns: [
        { title: 'Date', type: 'text', width: 110 },
        { title: 'Day', type: 'text', width: 90 },
        { title: 'Mess Food (Rs. 500)', type: 'dropdown', source: ['YES', 'NO'], width: 150 },
        { title: 'Mess Cost (Rs.)', type: 'numeric', width: 120 },
        { title: 'Other Category', type: 'dropdown', source: ['Transport', 'Shopping', 'Snacks', 'Groceries', 'Utilities'], width: 140 },
        { title: 'Other Cost (Rs.)', type: 'numeric', width: 120 },
        { title: 'Daily Total (Rs.)', type: 'numeric', width: 130 },
        { title: 'Running Total (Rs.)', type: 'numeric', width: 140 },
      ],
      data: rows,
      metadata: {
        prompt,
        category: 'Personal Finance',
        notes: 'Change "Mess Food" to YES or NO. All values and totals recalculate live in Handsontable.',
      },
    }
  }

  if (p.includes('sales') || p.includes('pipeline') || p.includes('deal') || p.includes('crm')) {
    return {
      title: 'Q4 Enterprise Sales Pipeline & Forecast',
      summary: 'Deal stages, probabilities, deal size, and weighted ARR pipeline.',
      columns: [
        { title: 'Deal Name', type: 'text', width: 160 },
        { title: 'Lead Account', type: 'text', width: 140 },
        { title: 'Stage', type: 'dropdown', source: ['Discovery', 'Demo / POC', 'Proposal', 'Closing', 'Won'], width: 130 },
        { title: 'Contract Value ($)', type: 'numeric', width: 130 },
        { title: 'Win Probability (%)', type: 'numeric', width: 130 },
        { title: 'Weighted Value ($)', type: 'numeric', width: 140 },
        { title: 'Owner', type: 'text', width: 120 },
      ],
      data: [
        ['Acme Cloud Migration', 'Acme Corp', 'Closing', 120000, 90, 108000, 'Sarah K.'],
        ['Starlight Analytics Suite', 'Starlight Inc', 'Proposal', 85000, 70, 59500, 'Alex M.'],
        ['Nexus Payment Integration', 'Nexus Fin', 'Demo / POC', 64000, 50, 32000, 'David L.'],
        ['Hyperion Data Lakehouse', 'Hyperion Systems', 'Won', 150000, 100, 150000, 'Sarah K.'],
        ['Vanguard Cyber Security', 'Vanguard Co', 'Discovery', 45000, 20, 9000, 'Elena R.'],
        ['Omega CRM Migration', 'Omega Logistics', 'Proposal', 92000, 70, 64400, 'Alex M.'],
        ['Pinnacle AI Automation', 'Pinnacle Group', 'Closing', 110000, 85, 93500, 'David L.'],
      ],
      metadata: {
        prompt,
        category: 'Sales & Revenue',
        notes: 'Weighted value represents Contract Value multiplied by Win Probability.',
      },
    }
  }

  // Default general business/data spreadsheet
  return {
    title: 'Custom Business Data Model',
    summary: 'Generated interactive spreadsheet for: ' + prompt,
    columns: [
      { title: 'Item ID', type: 'text', width: 90 },
      { title: 'Description / Item', type: 'text', width: 180 },
      { title: 'Category', type: 'text', width: 130 },
      { title: 'Quantity', type: 'numeric', width: 100 },
      { title: 'Unit Price ($)', type: 'numeric', width: 110 },
      { title: 'Total Amount ($)', type: 'numeric', width: 130 },
      { title: 'Status', type: 'dropdown', source: ['Active', 'Pending', 'Completed'], width: 110 },
    ],
    data: [
      ['MET-101', 'Cloud Database Cluster', 'Infrastructure', 2, 450, 900, 'Active'],
      ['MET-102', 'API Gateway Service', 'Infrastructure', 4, 120, 480, 'Active'],
      ['MET-103', 'AI Token Processing Unit', 'Compute', 10, 80, 800, 'Active'],
      ['MET-104', 'Automated Backup Storage', 'Storage', 1, 200, 200, 'Pending'],
      ['MET-105', 'Monitoring & Alerting Tool', 'Security', 1, 350, 350, 'Completed'],
      ['MET-106', 'Customer Analytics Ingestion', 'Analytics', 3, 210, 630, 'Active'],
    ],
    metadata: {
      prompt,
      category: 'Operations',
      notes: 'Generated from prompt: ' + prompt,
    },
  }
}

/**
 * Creates spreadsheet using Metron's Google GenAI Tool Calling Agent
 */
export async function generateSpreadsheetWithGemini(prompt: string): Promise<GeneratedSpreadsheet> {
  return generateSpreadsheetWithAgent(prompt)
}

/**
 * Modifies spreadsheet using Metron's Google GenAI Tool Calling Agent
 */
export async function modifySpreadsheetWithGemini(
  current: {
    title: string
    columns: Array<{ title: string; type?: string; width?: number; source?: string[] }>
    data: Array<Array<string | number | boolean>>
    metadata?: Record<string, unknown>
  },
  instruction: string
): Promise<GeneratedSpreadsheet> {
  return modifySpreadsheetWithAgent(current, instruction)
}
