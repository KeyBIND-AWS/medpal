'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { User } from '@supabase/supabase-js'
import { useTranslation } from "@/contexts/LanguageContext";

type Language = 'bisaya' | 'filipino' | 'english'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { language, setLanguage } = useTranslation()
  const [savingLanguage, setSavingLanguage] = useState(false)
  
  // UI Alerts
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [clearingData, setClearingData] = useState(false)

  // Language options mapping
  const languageOptions: { value: Language; label: string }[] = [
    { value: 'english', label: 'English' },
    { value: 'filipino', label: 'Filipino' },
    { value: 'bisaya', label: 'Bisaya' },
  ]

  useEffect(() => {
    async function initSettings() {
      try {
        // Get user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.user) {
          router.push('/')
          return
        }
        
        setUser(session.user)

        // Try to fetch language preference from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('language_pref')
          .eq('id', session.user.id)
          .single()

        if (!userError && userData?.language_pref) {
          const fetchedLang = userData.language_pref.toLowerCase() as Language
          if (['bisaya', 'filipino', 'english'].includes(fetchedLang)) {
            setLanguage(fetchedLang)
            localStorage.setItem('medpal_language_pref', fetchedLang)
          }
        } else {
          // Fallback to localStorage if database query failed or returned empty
          const cachedLang = localStorage.getItem('medpal_language_pref') as Language
          if (cachedLang && ['bisaya', 'filipino', 'english'].includes(cachedLang)) {
            setLanguage(cachedLang)
          }
        }
      } catch (err) {
        console.error('Error initializing settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    initSettings()
  }, [router, supabase])

  const handleLanguageChange = async (newLang: Language) => {
    if (!user) return

    setSavingLanguage(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await setLanguage(newLang)

      setSuccessMsg('Language preference updated successfully!')
      
      // Auto-hide success message after 2.5 seconds
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      console.error('Error saving language preference:', err)
      setError('Failed to sync language with server.')
    } finally {
      setSavingLanguage(false)
    }
  }

  const handleClearData = async () => {
    if (!user) return
    
    setClearingData(true)
    setError(null)
    setSuccessMsg(null)

    try {
      // Cascade delete in correct dependency order
      // 1. Delete reminders
      await supabase.from('reminders').delete().eq('user_id', user.id)
      
      // 2. Delete medications
      await supabase.from('medications').delete().eq('user_id', user.id)
      
      // 3. Delete scans
      await supabase.from('scans').delete().eq('user_id', user.id)
      
      // 4. Delete chat_messages
      await supabase.from('chat_messages').delete().eq('user_id', user.id)

      // 5. Delete records (if they exist under the old schema table name)
      await supabase.from('records').delete().eq('user_id', user.id)

      setSuccessMsg('All medical records and history have been cleared successfully.')
      setShowConfirmModal(false)

      // Auto-hide success message and redirect
      setTimeout(() => {
        setSuccessMsg(null)
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error clearing data:', err)
      setError('An error occurred while clearing your records. Please try again.')
      setShowConfirmModal(false)
    } finally {
      setClearingData(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Decorative glowing gradient spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <Header variant="settings" />

      {/* Main Workspace */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-2xl">
          {/* Back to Dashboard breadcrumb */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-350 mb-6 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Glassmorphic Settings Card */}
          <div className="w-full p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Settings & Customization
              </h1>
              <p className="text-sm text-slate-400">
                Configure your preferred language and manage your clinical console data.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin mb-4" />
                <p className="text-sm text-slate-500 font-medium">Retrieving configuration...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Error Box */}
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-rose-450">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Box */}
                {successMsg && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                    </svg>
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Language Preference Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Language Preference
                    </h3>
                    <p className="text-xs text-slate-450 mt-1">
                      Select your preferred language for generated summaries, chat companion responses, and patient education.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {languageOptions.map((option) => {
                      const isSelected = language === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => !savingLanguage && handleLanguageChange(option.value)}
                          disabled={savingLanguage}
                          className={`h-12 flex items-center justify-between px-5 rounded-xl border text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-400 shadow-inner shadow-cyan-500/5'
                              : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700/60 hover:text-slate-300'
                          }`}
                        >
                          <span>{option.label}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-2.5 h-2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <hr className="border-slate-900/60" />

                {/* Clear Data Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      Clear Clinical Profile Data
                    </h3>
                    <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                      Permanently delete all medication records, reminders, scans, and chat logs. This action wipes your database clinical profile and cannot be undone.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="px-5 h-11 inline-flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-slate-950 hover:border-rose-450 hover:shadow-lg hover:shadow-rose-500/10 font-semibold text-xs tracking-wide transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Clear Clinical Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6 text-rose-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">
                  Clear Clinical Profile?
                </h3>
                <p className="text-xs text-slate-400">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              This will permanently erase all your medication records, diagnostic scans, daily reminders, and chat companion history. You will lose all logged medical context.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={clearingData}
                className="px-5 h-11 inline-flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearData}
                disabled={clearingData}
                className="px-6 h-11 inline-flex items-center justify-center rounded-xl bg-rose-500 text-slate-950 font-bold hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/10 transition-all duration-200 cursor-pointer"
              >
                {clearingData ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    Clearing...
                  </div>
                ) : (
                  'Yes, Clear All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer variant="dashboard" />
    </div>
  )
}
