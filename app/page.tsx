'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkAndSignIn() {
      try {
        // First check if there is an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        if (session?.user) {
          setUser(session.user)
          setLoading(false)
          return
        }

        // Check if environment variables are set before trying to authenticate
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key || url.trim() === '' || key.trim() === '') {
          throw new Error('Supabase environment variables are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.')
        }

        // Trigger anonymous sign in
        const { data, error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          throw signInError
        }
        
        setUser(data.user)
      } catch (err) {
        console.error('Auth error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    checkAndSignIn()
  }, [supabase.auth])

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dynamic Glowing Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-slate-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <span className="font-semibold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
            MedPal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-xl text-center flex flex-col items-center">
          {/* Badge */}
          <div className="mb-6 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 tracking-wide uppercase flex items-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Clinical AI Companion
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Next-Gen Medical Intelligence
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-md">
            MedPal delivers safe, validated, and rapid clinical insights using advanced AI models. Let&apos;s get you set up.
          </p>

          {/* Glassmorphic Authorization Card */}
          <div className="w-full p-8 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 hover:border-slate-700/50">
            {loading ? (
              <div className="flex flex-col items-center py-6">
                {/* Spinner */}
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin" />
                </div>
                <p className="text-sm text-slate-400 animate-pulse font-medium">
                  Initializing anonymous sign-in...
                </p>
              </div>
            ) : error ? (
              <div className="w-full text-center py-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-rose-400 mb-2">Configuration Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6 px-4">
                  {error}
                </p>
                <div className="text-left w-full p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-500">
                  <span className="text-cyan-400 font-semibold">Step:</span> Fill env variables in <code className="text-slate-300">.env.local</code> and restart the development server.
                </div>
              </div>
            ) : user ? (
              <div className="w-full text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-emerald-400 mb-2">Authenticated Successfully</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  You are signed in as an anonymous user.
                </p>
                <div className="w-full p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-left mb-6 font-mono text-xs text-slate-400 overflow-x-auto">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="text-slate-600">auth_provider</span>
                    <span className="text-cyan-400 font-medium">anonymous</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">user_id</span>
                    <span className="text-slate-300 select-all">{user.id}</span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all duration-200"
                >
                  Enter MedPal Dashboard
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 z-10">
        <div>© 2026 MedPal. All rights reserved.</div>
        <div className="flex gap-6">
          <Link href="/dashboard" className="hover:text-slate-350 transition-colors">Test Route Security</Link>
        </div>
      </footer>
    </div>
  )
}
