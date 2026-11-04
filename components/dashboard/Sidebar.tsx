'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SignOutButton from '@/components/SignOutButton'

interface SidebarProps {
  userEmail?: string | null
  userName?: string
  mobileOpen?: boolean
  onCloseMobile?: () => void
  onNewSpreadsheet?: () => void
}

export default function Sidebar({
  userEmail = 'usman@metron.ai',
  userName = 'Usman',
  mobileOpen = false,
  onCloseMobile,
  onNewSpreadsheet,
}: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      active: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      name: 'My Spreadsheets',
      href: '#spreadsheets',
      badge: '14',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: 'AI Analysis',
      href: '#ai-analysis',
      badge: 'AI',
      badgeType: 'ai',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: 'Charts & Dashboards',
      href: '#charts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      name: 'Presentations',
      href: '#presentations',
      badge: 'Beta',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '#settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ]

  const pinnedSheets = [
    { name: 'Q4 Sales Pipeline & CAC', type: 'xlsx' },
    { name: '2025 Marketing ROI & Attribution', type: 'metron' },
    { name: 'SaaS Runway & Cash Burn', type: 'xlsx' },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E5EAE7] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Area: Logo & Workspace */}
        <div>
          {/* Logo Bar */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#EAEFEA]/80">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="relative h-8 w-28">
                <Image
                  src="/logo.png"
                  alt="Metron Logo"
                  fill
                  priority
                  className="object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Workspace Switcher Pill */}
          <div className="p-3">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F4F7F4] hover:bg-[#EBF1EB] border border-[#E2E8E4] transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#0D361C] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 shadow-xs">
                  M
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-zinc-900 truncate">
                    {userName}&apos;s Workspace
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Pro Plan • AI v2.4
                  </div>
                </div>
              </div>
              <svg
                className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-1 space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.active || pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group cursor-pointer ${
                    isActive
                      ? 'bg-[#0D361C] text-white shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-[#F2F6F3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-[#0D361C]'} transition-colors`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeType === 'ai'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Pinned / Favorites Section */}
          <div className="px-4 pt-5 pb-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 tracking-wider uppercase mb-2">
              <span>Pinned Sheets</span>
              <span className="text-[10px] text-zinc-400">3</span>
            </div>
            <div className="space-y-1">
              {pinnedSheets.map((sheet) => (
                <a
                  key={sheet.name}
                  href="#sheet-detail"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-900 hover:bg-[#F4F7F4] transition-colors truncate group cursor-pointer"
                >
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase flex-shrink-0 ${
                      sheet.type === 'metron'
                        ? 'bg-emerald-100 text-[#0D361C]'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {sheet.type}
                  </span>
                  <span className="truncate text-[11px] text-zinc-700 group-hover:text-zinc-950">
                    {sheet.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Area: AI Quota & User Profile */}
        <div className="p-3 border-t border-[#EAEFEA] space-y-3 bg-white">
          {/* AI Usage Card */}
          <div className="p-3 rounded-xl bg-[#F7FAF7] border border-[#E5EAE6] text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-zinc-800 text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Computation Quota
              </span>
              <span className="text-[10px] font-mono text-zinc-500">78%</span>
            </div>
            <div className="w-full bg-[#E3EAE4] h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className="bg-[#0D361C] h-full rounded-full transition-all duration-500"
                style={{ width: '78%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>1,560 / 2,000 queries</span>
              <span className="text-emerald-700 font-medium">Renews in 12d</span>
            </div>
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F4F7F4] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0D361C] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-zinc-900 truncate">{userName}</div>
                <div className="text-[10px] text-zinc-500 truncate">{userEmail}</div>
              </div>
            </div>

            <SignOutButton className="p-1.5 border-0 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg" />
          </div>
        </div>
      </aside>
    </>
  )
}
