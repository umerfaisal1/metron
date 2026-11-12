'use client'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import {
  parseSpreadsheetFile,
  ParsedSpreadsheetWorkbook,
  SheetPreviewData,
} from '@/lib/spreadsheet-file'
import { useRouter } from 'next/navigation'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (sheetId: string) => void
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedSpreadsheetWorkbook | null>(null)
  const [selectedSheetName, setSelectedSheetName] = useState<string>('')
  const [sheetData, setSheetData] = useState<SheetPreviewData | null>(null)

  if (!isOpen) return null

  const resetState = () => {
    setParsedWorkbook(null)
    setSelectedSheetName('')
    setSheetData(null)
    setErrorMessage(null)
    setIsProcessing(false)
    setStatusText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true)
    setStatusText('Parsing spreadsheet…')
    setErrorMessage(null)

    try {
      const workbook = await parseSpreadsheetFile(file)
      setParsedWorkbook(workbook)
      const initialSheet = workbook.sheetNames[0] || 'Sheet1'
      setSelectedSheetName(initialSheet)
      const preview = workbook.getSheetData(initialSheet)
      setSheetData(preview)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse file.')
      setParsedWorkbook(null)
      setSheetData(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleProcessFile(file)
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
    if (file) handleProcessFile(file)
  }

  const handleSheetChange = (sheetName: string) => {
    if (!parsedWorkbook) return
    setSelectedSheetName(sheetName)
    try {
      const data = parsedWorkbook.getSheetData(sheetName)
      setSheetData(data)
      setErrorMessage(null)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not read worksheet.')
    }
  }

  const handleSaveAndOpen = async () => {
    if (!parsedWorkbook || !sheetData) return

    setIsProcessing(true)
    setStatusText('Creating spreadsheet in Supabase…')

    try {
      const res = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsedWorkbook.suggestedTitle,
          prompt: `Imported from "${parsedWorkbook.fileName}" (${sheetData.sheetName})`,
          columns: sheetData.columns,
          data: sheetData.data,
          metadata: {
            summary: `Imported from ${parsedWorkbook.fileName} (Sheet: ${sheetData.sheetName}) with ${sheetData.rowCount} rows.`,
          },
        }),
      })

      const json = await res.json()
      if (res.ok && json.spreadsheet?.id) {
        onImportComplete?.(json.spreadsheet.id)
        handleClose()
        router.push(`/sheets/${json.spreadsheet.id}`)
      } else {
        throw new Error(json.error || 'Failed to save imported spreadsheet.')
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save spreadsheet.')
      setIsProcessing(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-import-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#D7E3DA] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-b border-[#E1EAE3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0D361C] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 id="dashboard-import-title" className="text-sm font-bold text-zinc-900">
              Import Spreadsheet / Data
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {!parsedWorkbook ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
                  isDragging
                    ? 'border-[#0D361C] bg-[#F2F7F4]'
                    : 'border-[#CDD9D1] hover:border-[#0D361C] bg-[#F9FAF9] hover:bg-[#F2F7F4]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload spreadsheet (.xlsx, .xls, .csv)"
                />

                <div className="w-12 h-12 rounded-2xl bg-white border border-[#DEE6E0] shadow-xs flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#0D361C]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <p className="text-xs font-bold text-zinc-800">
                  Click to select or drag and drop your spreadsheet
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Supports .XLSX, .XLS, and .CSV (parsed client-side in browser)
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F5F8F6] border border-[#E1EAE3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-900">{parsedWorkbook.fileName}</div>
                  <div className="text-[11px] text-zinc-500">
                    {sheetData ? `${sheetData.rowCount} rows • ${sheetData.columnCount} columns` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs font-semibold text-[#0D361C] hover:underline"
                >
                  Change file
                </button>
              </div>

              {parsedWorkbook.sheetNames.length > 1 && (
                <div>
                  <label htmlFor="dashboard-sheet-select" className="block text-xs font-bold text-zinc-700 mb-1">
                    Select Worksheet:
                  </label>
                  <select
                    id="dashboard-sheet-select"
                    value={selectedSheetName}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-[#DCE4DE] text-zinc-800"
                  >
                    {parsedWorkbook.sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sheetData && (
                <div className="border border-[#E2E8E4] rounded-xl overflow-hidden max-h-40 overflow-auto text-xs bg-white">
                  <table className="min-w-full divide-y divide-[#E2E8E4]">
                    <thead className="bg-[#F8FAF9]">
                      <tr>
                        {sheetData.columns.map((c, i) => (
                          <th key={i} className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 whitespace-nowrap">
                            {c.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEFEA]">
                      {sheetData.previewRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-2.5 py-1 text-[10px] text-zinc-600 whitespace-nowrap">
                              {cell !== '' ? String(cell) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-emerald-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{statusText || 'Processing…'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-t border-[#E1EAE3] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-200/60"
          >
            Cancel
          </button>

          {parsedWorkbook && sheetData && (
            <button
              type="button"
              onClick={handleSaveAndOpen}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] shadow-xs cursor-pointer disabled:opacity-50"
            >
              Open in Metron Editor →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
