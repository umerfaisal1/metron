import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSpreadsheetTool,
  modifySpreadsheetTool,
  generateChartsTool,
  adviseOrExplainTool,
} from '../lib/agent/tools'
import { runMetronAgent, generateSpreadsheetWithAgent, modifySpreadsheetWithAgent } from '../lib/agent/metronAgent'
import { ColumnDef } from '../components/spreadsheet/ExcelSpreadsheet'

test('Metron Agent Tools Definition', async (t) => {
  await t.test('createSpreadsheetTool has valid function declaration', () => {
    assert.equal(createSpreadsheetTool.name, 'create_spreadsheet')
    assert.ok(createSpreadsheetTool.description)
    assert.ok(createSpreadsheetTool.parameters)
    assert.deepEqual(createSpreadsheetTool.parameters?.required, ['title', 'summary', 'columns', 'data'])
  })

  await t.test('modifySpreadsheetTool has valid function declaration', () => {
    assert.equal(modifySpreadsheetTool.name, 'modify_spreadsheet')
    assert.ok(modifySpreadsheetTool.description)
    assert.ok(modifySpreadsheetTool.parameters)
    assert.deepEqual(modifySpreadsheetTool.parameters?.required, ['actionType', 'title', 'summary', 'columns', 'data'])
  })

  await t.test('generateChartsTool has valid function declaration', () => {
    assert.equal(generateChartsTool.name, 'generate_charts')
    assert.ok(generateChartsTool.description)
    assert.ok(generateChartsTool.parameters)
    assert.deepEqual(generateChartsTool.parameters?.required, ['isSuitableForVisualization', 'overallInsight', 'charts'])
  })

  await t.test('adviseOrExplainTool has valid function declaration', () => {
    assert.equal(adviseOrExplainTool.name, 'advise_or_explain')
    assert.ok(adviseOrExplainTool.description)
    assert.deepEqual(adviseOrExplainTool.parameters?.required, ['message'])
  })
})

test('Metron Agent Execution & Sanitization', async (t) => {
  await t.test('generateSpreadsheetWithAgent returns valid columns and data structure', async () => {
    const sheet = await generateSpreadsheetWithAgent('monthly expense tracker for mess food')
    assert.ok(sheet.title)
    assert.ok(Array.isArray(sheet.columns))
    assert.ok(sheet.columns.length > 0)
    assert.ok(Array.isArray(sheet.data))
    assert.ok(sheet.data.length > 0)

    // Verify row dimensions match column definitions
    sheet.data.forEach((row, idx) => {
      assert.equal(
        row.length,
        sheet.columns.length,
        `Row ${idx} length (${row.length}) does not match columns length (${sheet.columns.length})`
      )
    })
  })

  await t.test('modifySpreadsheetWithAgent modifies sheet structure safely', async () => {
    const initial = {
      title: 'Project Budget',
      columns: [
        { title: 'Item', type: 'text' },
        { title: 'Cost', type: 'numeric' },
      ],
      data: [
        ['Server Hosting', 120],
        ['Domain Registration', 15],
      ],
      metadata: { summary: 'Initial budget' },
    }

    const modified = await modifySpreadsheetWithAgent(initial, 'Add a 10% Contingency column')
    assert.ok(modified.title)
    assert.ok(Array.isArray(modified.columns))
    assert.ok(Array.isArray(modified.data))
    assert.ok(modified.data.length >= 2)
  })

  await t.test('runMetronAgent handles autonomous fallback if API key is not supplied', async () => {
    const origKey = process.env.GEMINI_API_KEY
    try {
      delete process.env.GEMINI_API_KEY
      const response = await runMetronAgent({
        task: 'generate',
        prompt: 'Enterprise sales pipeline',
      })
      assert.equal(response.success, true)
      assert.ok(response.spreadsheet)
      assert.ok(response.spreadsheet.columns.length > 0)
      assert.ok(response.stepsExecuted.length > 0)
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey
    }
  })
})
