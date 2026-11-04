'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'
import WelcomeSection from '@/components/dashboard/WelcomeSection'
import AIAssistantPanel from '@/components/dashboard/AIAssistantPanel'
import RecentWork from '@/components/dashboard/RecentWork'
import InsightsSection from '@/components/dashboard/InsightsSection'
import ActivitySection from '@/components/dashboard/ActivitySection'
import AISheetPreviewModal from '@/components/dashboard/AISheetPreviewModal'
import NewSpreadsheetModal from '@/components/dashboard/NewSpreadsheetModal'
import ImportModal from '@/components/dashboard/ImportModal'

interface DashboardViewProps {
  initialEmail?: string | null
  initialName?: string
}

export default function DashboardView({
  initialEmail = 'usman@metron.ai',
  initialName = 'Usman',
}: DashboardViewProps) {
  const [userEmail, setUserEmail] = useState<string | null>(initialEmail)
  const [userName, setUserName] = useState<string>(initialName)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('Build a monthly revenue and churn forecast with dynamic formulas')
  const [newSpreadsheetOpen, setNewSpreadsheetOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserEmail(user.email || 'usman@metron.ai')
          const metadataName = user.user_metadata?.full_name || user.user_metadata?.name
          if (metadataName) {
            setUserName(metadataName)
          } else if (user.email) {
            const prefix = user.email.split('@')[0]
            setUserName(prefix.charAt(0).toUpperCase() + prefix.slice(1))
          }
        }
      })
    } catch (e) {
      console.warn('Supabase client check:', e)
    }
  }, [])

  const handleOpenAIPrompt = (promptText?: string) => {
    if (promptText) {
      setAiPrompt(promptText)
    }
    setAiModalOpen(true)
  }

  const handleOpenTemplate = (templateTitle: string) => {
    setAiPrompt(`Create spreadsheet based on template: "${templateTitle}" with automatic formulas and chart`)
    setAiModalOpen(true)
  }

  const handleImportComplete = (filename: string) => {
    setAiPrompt(`Analyze and build interactive model from imported file: "${filename}"`)
    setAiModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#0D1F14] flex">
      {/* Sidebar */}
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNewSpreadsheet={() => setNewSpreadsheetOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Bar */}
        <TopBar
          userName={userName}
          userEmail={userEmail || 'usman@metron.ai'}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onNewSpreadsheet={() => setNewSpreadsheetOpen(true)}
        />

        {/* Dashboard Scrollable Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Welcome Section */}
          <WelcomeSection
            userName={userName}
            onCreateWithAI={() => handleOpenAIPrompt('Build a custom monthly expense calculator with category breakdown and charts')}
            onImportFile={() => setImportModalOpen(true)}
            onBlankSpreadsheet={() => handleOpenAIPrompt('Blank spreadsheet with HyperFormula computation grid')}
          />

          {/* AI Assistant Panel (Signature Feature) */}
          <AIAssistantPanel onGeneratePrompt={handleOpenAIPrompt} />

          {/* Recent Work Grid */}
          <RecentWork
            onOpenFile={(file) => {
              setAiPrompt(`Open and inspect formulas for: "${file.title}"`)
              setAiModalOpen(true)
            }}
          />

          {/* Insights & Visualizations Section */}
          <InsightsSection />

          {/* Activity & Operations Section */}
          <ActivitySection />
        </main>
      </div>

      {/* Interactive Modals */}
      <AISheetPreviewModal
        isOpen={aiModalOpen}
        prompt={aiPrompt}
        onClose={() => setAiModalOpen(false)}
      />

      <NewSpreadsheetModal
        isOpen={newSpreadsheetOpen}
        onClose={() => setNewSpreadsheetOpen(false)}
        onSelectAI={() => handleOpenAIPrompt('Build a custom financial spreadsheet model')}
        onSelectImport={() => setImportModalOpen(true)}
        onSelectBlank={() => handleOpenAIPrompt('Create blank spreadsheet grid with formulas')}
        onSelectTemplate={handleOpenTemplate}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
