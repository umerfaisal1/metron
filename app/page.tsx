import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAF8] text-[#0D1F14]">
      {/* Header */}
      <header className="border-b border-[#E5EAE7] bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-28">
              <Image
                src="/logo.png"
                alt="Metron Logo"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-[#F0F5F1] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0D361C] text-white hover:bg-[#144D28] transition-colors shadow-xs"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EAF5EE] text-[#0D361C] border border-[#CDE5D5] mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          The AI-Powered Spreadsheet Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0D1F14] max-w-2xl leading-tight">
          Describe it. Generate it. <span className="text-[#0D361C]">Use it.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 max-w-xl leading-relaxed">
          Metron turns plain language into interactive spreadsheets with live formulas, dynamic
          recalculation, and executive-ready charts.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3.5">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold bg-[#0D361C] hover:bg-[#144D28] active:bg-[#082211] transition-all text-xs shadow-md shadow-[#0D361C]/20 flex items-center justify-center gap-2"
          >
            Launch Metron Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-zinc-800 font-semibold bg-white hover:bg-[#F2F6F3] transition-all text-xs border border-[#DCE4DE] shadow-xs flex items-center justify-center"
          >
            Sign In with Email
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5EAE7] py-6 text-center text-xs text-zinc-500">
        Metron • Next-Generation AI Spreadsheet & Analytics Platform
      </footer>
    </div>
  )
}
