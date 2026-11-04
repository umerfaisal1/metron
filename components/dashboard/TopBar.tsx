'use client'

import { useState } from 'react'

interface TopBarProps {
  onOpenMobileSidebar?: () => void
  onNewSpreadsheet?: () => void
  userName?: string
  userEmail?: string
}

export default function TopBar({
  onOpenMobileSidebar,
  onNewSpreadsheet,
  userName = 'Usman',
  userEmail = 'usman@metron.ai',
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const notifications = [
    {
      id: 1,
      title: 'Runway Forecast Model Synced',
      description: 'Stripe webhook automatically updated Q4 cash burn.',
      time: '3m ago',
      unread: true,
    },
    {
      id: 2,
      title: 'AI Anomaly Detected & Cleared',
      description: 'Formula recursive check passed with 0 circular loops.',
      time: '24m ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Board Presentation Export Ready',
      description: 'Clean .xlsx sheet generated with embedded ECharts.',
      time: '2h ago',
      unread: false,
    },
  ]

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-[#E5EAE7] px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-[#F2F6F3] transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Global Search Input */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spreadsheets, prompts, or formulas..."
            className="w-full pl-9 pr-14 py-2 rounded-xl text-xs bg-[#F5F8F5] border border-[#E2E8E4] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0D361C]/20 focus:border-[#0D361C] transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-[#D9E1DC] rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Status badge, Notification, Profile & New Spreadsheet CTA */}
      <div className="flex items-center gap-2.5 sm:gap-4 ml-4">
        {/* Status Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F2F7F3] border border-[#E2E8E4] text-[11px] font-medium text-emerald-900">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>HyperFormula Engine v2.4</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-[#F2F6F3] transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#E2E8E4] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-2">
                <span className="text-xs font-bold text-zinc-900">Notifications</span>
                <span className="text-[10px] text-emerald-800 font-semibold px-2 py-0.5 rounded-full bg-emerald-50">
                  2 Unread
                </span>
              </div>
              <div className="divide-y divide-zinc-50 space-y-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl transition-colors ${
                      n.unread ? 'bg-[#F6FAF6]' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 mb-0.5">
                      <span className="flex items-center gap-1.5">
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] font-normal text-zinc-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 pl-3">{n.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill (desktop) */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#E5EAE7]">
          <div className="w-7 h-7 rounded-full bg-[#0D361C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-zinc-800">{userName}</span>
        </div>

        {/* Prominent "+ New Spreadsheet" Button */}
        <button
          onClick={onNewSpreadsheet}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0D361C] hover:bg-[#144D28] active:bg-[#082211] shadow-xs shadow-[#0D361C]/20 transition-all duration-150 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden xs:inline">New Spreadsheet</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>
    </header>
  )
}
