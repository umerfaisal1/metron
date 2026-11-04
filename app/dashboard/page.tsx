import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export const instant = false

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Format created date
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
              M
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight">Metron App</span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as</span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                {user.email}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl shadow-blue-500/10">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to your dashboard!
            </h1>
            <p className="mt-2 text-blue-100 text-base">
              You are authenticated with Supabase Auth. This dummy dashboard is only accessible to
              logged-in users.
            </p>
          </div>
          <div className="absolute -right-6 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* User Account Info Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Session & Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Email Address
              </span>
              <span className="font-semibold text-sm break-all">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Supabase User ID
              </span>
              <span className="font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
                {user.id}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Member Since
              </span>
              <span className="font-semibold text-sm">{memberSince}</span>
            </div>
          </div>
        </div>

        {/* Dummy Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Active Projects
              </span>
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              +3 from last month
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                API Calls
              </span>
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold">128.4k</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              +18.2% usage
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Storage Used
              </span>
              <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16"
                  />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold">2.4 GB</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">of 10 GB limit</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Security Status
              </span>
              <span className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Active
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Protected via RLS</p>
          </div>
        </div>

        {/* Dummy Activity Feed */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Activity</h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[
              {
                title: 'User Authenticated',
                desc: 'Successful email login session initiated',
                time: 'Just now',
                iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
              },
              {
                title: 'Security Token Refreshed',
                desc: 'Supabase JWT session refreshed seamlessly',
                time: '5 minutes ago',
                iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
              },
              {
                title: 'Dashboard Initialized',
                desc: 'Telemetry and mock services loaded successfully',
                time: '1 hour ago',
                iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
              },
            ].map((activity, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${activity.iconBg}`}
                  >
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{activity.desc}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
