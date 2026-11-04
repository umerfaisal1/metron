'use client'

import { useState } from 'react'

interface AIAssistantPanelProps {
  onGeneratePrompt?: (prompt: string) => void
}

export default function AIAssistantPanel({ onGeneratePrompt }: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('Gemini 1.5 Pro')
  const [isFocused, setIsFocused] = useState(false)

  const suggestedPrompts = [
    { label: 'Find trends in Q3 revenue', icon: 'trend' },
    { label: 'Clean my data & remove anomalies', icon: 'sparkle' },
    { label: 'Generate a cohort retention chart', icon: 'chart' },
    { label: 'Build a 12-month SaaS churn forecast', icon: 'forecast' },
    { label: 'Calculate category-wise expense breakdown', icon: 'calculator' },
    { label: 'Mess food calendar at Rs. 500/day', icon: 'calendar' },
  ]

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!prompt.trim()) return
    onGeneratePrompt?.(prompt)
  }

  const handleChipClick = (text: string) => {
    setPrompt(text)
    onGeneratePrompt?.(text)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'chart':
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        )
      case 'forecast':
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'calculator':
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#F2F8F4] via-[#F8FAF8] to-white border border-[#D7E4DC] p-5 sm:p-7 shadow-xs">
      {/* Decorative subtle green aura */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#20B26B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 -mb-16 w-60 h-60 bg-[#0D361C]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0D361C] text-white flex items-center justify-center shadow-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              Metron AI Assistant
              <span className="text-[10px] font-semibold text-emerald-800 bg-[#DDF7EA] border border-emerald-300/60 px-2 py-0.5 rounded-full">
                Signature Feature
              </span>
            </h2>
          </div>
        </div>

        {/* Model Selection */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 text-[11px] hidden sm:inline">Engine:</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E0E7E2] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs font-medium text-zinc-700 focus:outline-none cursor-pointer"
            >
              <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Structured Tools)</option>
              <option value="HyperFormula Fast">HyperFormula Fast Calc</option>
              <option value="Deep Statistical Model">Deep Statistical Model</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Input Bar */}
      <form
        onSubmit={handleSubmit}
        className={`relative z-10 rounded-2xl bg-white border transition-all duration-200 shadow-sm ${
          isFocused
            ? 'border-[#0D361C] ring-3 ring-[#0D361C]/10'
            : 'border-[#D9E3DC] hover:border-[#B8CEC1]'
        }`}
      >
        <div className="flex items-start p-3 sm:p-4 gap-3">
          <div className="pt-1 text-[#0D361C] flex-shrink-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <textarea
              rows={2}
              value={prompt}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ask Metron to analyze your data… e.g. 'Build a monthly expense calculator with category breakdown and pie chart'"
              className="w-full resize-none text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 bg-transparent focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Input Footer Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#FAFBF9] border-t border-[#EDF2EE] rounded-b-2xl">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="hidden sm:inline">Press</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#DDE4DE] rounded text-zinc-600 shadow-2xs">
              ↵ Enter
            </kbd>
            <span className="hidden sm:inline">to generate interactive spreadsheet</span>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim()}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] active:bg-[#082211] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
          >
            <span>Generate Spreadsheet</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>

      {/* Suggested Prompt Chips */}
      <div className="relative z-10 mt-4">
        <div className="flex items-center gap-2 mb-2 text-[11px] font-medium text-zinc-500">
          <span>Suggested prompts:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip.label)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EDF5EF] border border-[#DEE6E0] hover:border-[#10B981]/50 text-xs font-medium text-zinc-700 hover:text-[#0D361C] shadow-2xs transition-all duration-150 cursor-pointer"
            >
              {getIcon(chip.icon)}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
