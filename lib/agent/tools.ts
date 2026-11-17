import { FunctionDeclaration, Type } from '@google/genai'

/**
 * Tool: create_spreadsheet
 * Instructs Gemini Agent to build a complete spreadsheet structure with headers, data types, and initial rows.
 */
export const createSpreadsheetTool: FunctionDeclaration = {
  name: 'create_spreadsheet',
  description:
    'Creates a complete, functional spreadsheet definition with title, summary, columns (with appropriate data types), realistic data rows, and calculated spreadsheet formulas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Clear, professional title for the spreadsheet.',
      },
      summary: {
        type: Type.STRING,
        description: '1-sentence executive summary explaining what this spreadsheet tracks.',
      },
      category: {
        type: Type.STRING,
        description: 'Domain category: e.g. Personal Finance, Sales, Operations, Marketing, HR, Engineering.',
      },
      columns: {
        type: Type.ARRAY,
        description: 'Ordered array of column definitions.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Header name of the column.',
            },
            type: {
              type: Type.STRING,
              enum: ['text', 'numeric', 'dropdown'],
              description: 'Data type for Handsontable: "text", "numeric", or "dropdown".',
            },
            source: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Allowed options list if column type is "dropdown".',
            },
            width: {
              type: Type.INTEGER,
              description: 'Recommended column width in pixels (e.g. 110, 130, 150).',
            },
          },
          required: ['title'],
        },
      },
      data: {
        type: Type.ARRAY,
        description:
          '2D array of rows where each row has the exact same count and ordering as the columns array. Numeric columns should have clean numbers or spreadsheet formulas (e.g. "=SUM(D2:D10)").',
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: 'Cell value as string, number, or formula starting with "=".',
          },
        },
      },
      notes: {
        type: Type.STRING,
        description: 'Helpful explanation of formula logic or instructions for the user.',
      },
    },
    required: ['title', 'summary', 'columns', 'data'],
  },
}

/**
 * Tool: modify_spreadsheet
 * Instructs Gemini Agent to apply targeted modifications to an existing spreadsheet.
 */
export const modifySpreadsheetTool: FunctionDeclaration = {
  name: 'modify_spreadsheet',
  description:
    'Applies precise edits to an existing spreadsheet, such as adding new columns, adding rows, deleting columns/rows, applying formula calculations, or transforming cell values.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionType: {
        type: Type.STRING,
        enum: [
          'add_column',
          'update_cells',
          'add_rows',
          'delete_column',
          'delete_rows',
          'calculate_formula',
          'transform_data',
          'general_edit',
        ],
        description: 'The specific type of spreadsheet modification executed.',
      },
      title: {
        type: Type.STRING,
        description: 'Spreadsheet title (keep current title or update if requested).',
      },
      summary: {
        type: Type.STRING,
        description: 'A concise 1-sentence description of the edit applied.',
      },
      columns: {
        type: Type.ARRAY,
        description: 'Complete updated list of columns after applying the modification.',
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['text', 'numeric', 'dropdown'] },
            source: { type: Type.ARRAY, items: { type: Type.STRING } },
            width: { type: Type.INTEGER },
          },
          required: ['title'],
        },
      },
      data: {
        type: Type.ARRAY,
        description:
          'Complete updated 2D array of spreadsheet data rows matching the updated columns length and order.',
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: 'Cell value or formula',
          },
        },
      },
      notes: {
        type: Type.STRING,
        description: 'Details about the calculations, formulas, or cell changes introduced.',
      },
    },
    required: ['actionType', 'title', 'summary', 'columns', 'data'],
  },
}

/**
 * Tool: generate_charts
 * Instructs Gemini Agent to recommend meaningful charts based on the spreadsheet data.
 */
export const generateChartsTool: FunctionDeclaration = {
  name: 'generate_charts',
  description:
    'Recommends 1 to 4 distinct, professional Apache ECharts visualizations (bar, line, area, pie, scatter) based on the spreadsheet dimensions and quantitative metrics.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      isSuitableForVisualization: {
        type: Type.BOOLEAN,
        description: 'Whether the spreadsheet data is suitable for visual charting.',
      },
      unsuitabilityReason: {
        type: Type.STRING,
        description: 'Reason if the dataset is not suitable for charting.',
      },
      overallInsight: {
        type: Type.STRING,
        description: 'Executive analytical summary of trends or distribution shown in the data.',
      },
      charts: {
        type: Type.ARRAY,
        description: 'Array of recommended chart configurations.',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'Unique chart identifier' },
            title: { type: Type.STRING, description: 'Descriptive title for the chart' },
            description: { type: Type.STRING, description: 'Subtitle or explanation of perspective' },
            chartType: {
              type: Type.STRING,
              enum: ['bar', 'line', 'pie', 'scatter', 'histogram', 'area'],
              description: 'Visual chart type',
            },
            xAxisColumn: { type: Type.STRING, description: 'Exact column name for X axis / category' },
            yAxisColumns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exact column name(s) for numeric Y metric(s)',
            },
            aggregation: {
              type: Type.STRING,
              enum: ['sum', 'average', 'count', 'min', 'max', 'none'],
              description: 'Aggregation function',
            },
            explanation: { type: Type.STRING, description: 'Why this chart was chosen' },
            options: {
              type: Type.OBJECT,
              properties: {
                stacked: { type: Type.BOOLEAN },
                donut: { type: Type.BOOLEAN },
                smooth: { type: Type.BOOLEAN },
                horizontal: { type: Type.BOOLEAN },
              },
            },
          },
          required: ['id', 'title', 'chartType', 'xAxisColumn', 'yAxisColumns', 'aggregation', 'explanation'],
        },
      },
    },
    required: ['isSuitableForVisualization', 'overallInsight', 'charts'],
  },
}

/**
 * Tool: advise_or_explain
 * Used when the user is asking an analytical question, asking for advice, or guidance.
 */
export const adviseOrExplainTool: FunctionDeclaration = {
  name: 'advise_or_explain',
  description:
    'Provides analysis, answers questions, or offers spreadsheet modeling recommendations without modifying data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'Clear, helpful answer to the user question.',
      },
      suggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Suggested next actions or follow-up edits the user can make.',
      },
    },
    required: ['message'],
  },
}
