'use client'

import { useState } from 'react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (filename: string) => void
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSimulatedUpload = (filename: string) => {
    setSelectedFile(filename)
    setIsUploading(true)
    setTimeout(() => {
      setIsUploading(false)
      onImportComplete(filename)
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#D7E3DA] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F8F6] border-b border-[#E1EAE3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0D361C] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-zinc-900">
              Import Spreadsheet / Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onClick={() => handleSimulatedUpload('Q4_Financial_Export.xlsx')}
            className="p-8 rounded-2xl border-2 border-dashed border-[#CDD9D1] hover:border-[#0D361C] bg-[#F9FAF9] hover:bg-[#F2F7F4] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DEE6E0] shadow-xs flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-[#0D361C]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <p className="text-xs font-bold text-zinc-800">
              Click to select or drag and drop your spreadsheet
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Supports .XLSX, .CSV, .TSV and Google Sheets exports (up to 50MB)
            </p>
          </div>

          {/* Quick Sample Files */}
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Or Try A Sample Dataset:
            </span>
            <div className="space-y-1.5">
              {[
                { name: 'Stripe_Monthly_Revenue_2025.csv', size: '12.4k rows • 4 columns' },
                { name: 'HubSpot_Sales_Pipeline_Deals.xlsx', size: '340 rows • 12 formulas' },
              ].map((sample) => (
                <div
                  key={sample.name}
                  onClick={() => handleSimulatedUpload(sample.name)}
                  className="px-3.5 py-2.5 rounded-xl border border-[#E2EAE4] hover:border-[#10B981]/50 bg-white hover:bg-[#F6FAF7] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-[#EAF2ED] text-[#0D361C] flex items-center justify-center text-[10px] font-bold">
                      CSV
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 group-hover:text-[#0D361C]">
                        {sample.name}
                      </div>
                      <div className="text-[10px] text-zinc-400">{sample.size}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#0D361C]">Import →</span>
                </div>
              ))}
            </div>
          </div>

          {isUploading && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-emerald-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Importing &quot;{selectedFile}&quot; into HyperFormula engine...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
