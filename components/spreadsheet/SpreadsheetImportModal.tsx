'use client'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import {
  parseSpreadsheetFile,
  ParsedSpreadsheetWorkbook,
  SheetPreviewData,
} from '@/lib/spreadsheet-file'
import { ColumnDef } from './ExcelSpreadsheet'

interface SpreadsheetImportModalProps {
  isOpen: boolean
  onClose: () => void
  currentTitle: string
  onImportComplete: (result: {
    sheetName: string
    columns: ColumnDef[]
    data: Array<Array<string | number | boolean>>
    newTitle?: string
  }) => void
}

export default function SpreadsheetImportModal({
  isOpen,
  onClose,
  currentTitle,
  onImportComplete,
}: SpreadsheetImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedSpreadsheetWorkbook | null>(null)
  const [selectedSheetName, setSelectedSheetName] = useState<string>('')
  const [previewData, setPreviewData] = useState<SheetPreviewData | null>(null)
  const [shouldUpdateTitle, setShouldUpdateTitle] = useState(true)

  if (!isOpen) return null

  const resetState = () => {
    setParsedWorkbook(null)
    setSelectedSheetName('')
    setPreviewData(null)
    setErrorMessage(null)
    setIsLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleProcessFile = async (file: File) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const workbook = await parseSpreadsheetFile(file)
      setParsedWorkbook(workbook)

      const initialSheet = workbook.sheetNames[0] || 'Sheet1'
      setSelectedSheetName(initialSheet)
      const initialPreview = workbook.getSheetData(initialSheet)
      setPreviewData(initialPreview)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse file.')
      setParsedWorkbook(null)
      setPreviewData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleProcessFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleProcessFile(file)
    }
  }

  const handleSheetChange = (sheetName: string) => {
    if (!parsedWorkbook) return
    setSelectedSheetName(sheetName)
    try {
      const sheetData = parsedWorkbook.getSheetData(sheetName)
      setPreviewData(sheetData)
      setErrorMessage(null)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to read worksheet data.')
    }
  }

  const handleConfirmImport = () => {
    if (!parsedWorkbook || !previewData) return

    onImportComplete({
      sheetName: previewData.sheetName,
      columns: previewData.columns,
      data: previewData.data,
      newTitle: shouldUpdateTitle ? parsedWorkbook.suggestedTitle : undefined,
    })

    handleClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#D7E3DA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-b border-[#E1EAE3] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#107C41] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 id="import-dialog-title" className="text-sm font-bold text-zinc-900">
                Import Spreadsheet
              </h3>
              <p className="text-[11px] text-zinc-500">
                Import data from Excel (.xlsx, .xls) or Comma-Separated Values (.csv)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close import dialog"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <span className="font-semibold">Import Error:</span>
                <p className="text-[11px] text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {!parsedWorkbook ? (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
                isDragging
                  ? 'border-[#107C41] bg-[#F2F8F4]'
                  : 'border-[#CDD9D1] hover:border-[#107C41] bg-[#F9FAF9] hover:bg-[#F2F7F4]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Upload spreadsheet file (.xlsx, .xls, .csv)"
              />

              <div className="w-14 h-14 rounded-2xl bg-white border border-[#DEE6E0] shadow-xs flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#107C41]">
                {isLoading ? (
                  <svg className="w-6 h-6 animate-spin text-[#107C41]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>

              <p className="text-xs font-bold text-zinc-800">
                {isLoading ? 'Reading and parsing spreadsheet…' : 'Choose a spreadsheet or drag & drop here'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) • Processed 100% locally in your browser
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white border border-[#DCE4DE] text-[10px] font-mono text-zinc-600 font-semibold">
                  .XLSX
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#DCE4DE] text-[10px] font-mono text-zinc-600 font-semibold">
                  .CSV
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#DCE4DE] text-[10px] font-mono text-zinc-600 font-semibold">
                  .XLS
                </span>
              </div>
            </div>
          ) : (
            /* Parsed File Configuration & Preview */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-3.5 rounded-xl bg-[#F5F8F6] border border-[#E1EAE3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#107C41] text-white flex items-center justify-center text-xs font-bold font-mono">
                    {parsedWorkbook.fileType.toUpperCase()}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 truncate max-w-sm">
                      {parsedWorkbook.fileName}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {parsedWorkbook.sheetNames.length} sheet{parsedWorkbook.sheetNames.length > 1 ? 's' : ''} found
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs font-semibold text-[#107C41] hover:underline cursor-pointer"
                >
                  Choose different file
                </button>
              </div>

              {/* Sheet Selection for Multi-sheet Workbooks */}
              {parsedWorkbook.sheetNames.length > 1 && (
                <div>
                  <label htmlFor="sheet-select" className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Select Worksheet to Import:
                  </label>
                  <select
                    id="sheet-select"
                    value={selectedSheetName}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-[#DCE4DE] text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#107C41]/20 focus:border-[#107C41]"
                  >
                    {parsedWorkbook.sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data Preview */}
              {previewData && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span className="font-semibold text-zinc-800">
                      Worksheet Preview ({previewData.sheetName}):
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {previewData.rowCount} rows • {previewData.columnCount} columns
                    </span>
                  </div>

                  <div className="border border-[#E2E8E4] rounded-xl overflow-hidden max-h-52 overflow-x-auto overflow-y-auto text-xs bg-white">
                    <table className="min-w-full divide-y divide-[#E2E8E4] text-left">
                      <thead className="bg-[#F8FAF9] sticky top-0 z-10">
                        <tr>
                          {previewData.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className="px-3 py-2 text-[11px] font-bold text-zinc-700 border-r border-[#E2E8E4] last:border-r-0 whitespace-nowrap"
                            >
                              {col.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAEFEA]">
                        {previewData.previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-zinc-50">
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-3 py-1.5 text-[11px] text-zinc-600 border-r border-[#EAEFEA] last:border-r-0 whitespace-nowrap max-w-xs truncate"
                              >
                                {cell !== '' ? String(cell) : <span className="text-zinc-300 italic">empty</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewData.rowCount > 5 && (
                    <p className="text-[10px] text-zinc-400 italic">
                      Showing first 5 rows of {previewData.rowCount} total rows.
                    </p>
                  )}
                </div>
              )}

              {/* Title Update Preference */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <label className="flex items-center gap-2.5 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldUpdateTitle}
                    onChange={(e) => setShouldUpdateTitle(e.target.checked)}
                    className="w-4 h-4 rounded text-[#107C41] focus:ring-[#107C41] border-zinc-300"
                  />
                  <span>
                    Update workbook title to{' '}
                    <strong className="text-zinc-900 font-semibold">
                      &quot;{parsedWorkbook.suggestedTitle}&quot;
                    </strong>{' '}
                    <span className="text-zinc-400 font-normal">(current: &quot;{currentTitle}&quot;)</span>
                  </span>
                </label>
              </div>

              {/* Informative Safety Notice */}
              <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Importing will replace the editor&apos;s current grid data and mark your workbook as unsaved. Your existing cloud record will not be overwritten until you choose to click <strong>Save</strong>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-t border-[#E1EAE3] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {parsedWorkbook && previewData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#107C41] hover:bg-[#0D6234] shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import Worksheet into Editor</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
