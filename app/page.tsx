'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAndSignIn() {
      try {
        // Check if environment variables are set before trying to authenticate
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !key || url.trim() === '' || key.trim() === '') {
          throw new Error('Supabase environment variables are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.')
        }

        const supabase = createClient()

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
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-canvas text-ink overflow-hidden font-sans">
      {/* Header */}
      <Header variant="landing" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-xl text-center flex flex-col items-center">
          {/* Badge */}
          <div className="mb-6 px-4 py-1.5 rounded-full bg-tint border border-primary/20 text-xs font-semibold text-primary tracking-wide uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Clinical AI Companion
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-ink">
            Next-Gen Medical Intelligence
          </h1>
          <p className="text-muted text-lg mb-8 max-w-md">
            MedPal delivers safe, validated, and rapid clinical insights using advanced AI models. Let&apos;s get you set up.
          </p>

          {/* Authorization Card */}
          <div className="w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-md flex flex-col items-center justify-center transition-all duration-300">
            {loading ? (
              <div className="flex flex-col items-center py-6">
                {/* Spinner */}
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                </div>
                <p className="text-sm text-muted animate-pulse font-medium">
                  Initializing anonymous sign-in...
                </p>
              </div>
            ) : error ? (
              <div className="w-full text-center py-4">
                <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/20 text-danger flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-danger mb-2">Configuration Required</h3>
                <p className="text-xs text-muted leading-relaxed mb-6 px-4">
                  {error}
                </p>
                <div className="text-left w-full p-4 rounded-xl bg-canvas border border-slate-200 text-xs font-mono text-muted">
                  <span className="text-primary font-semibold">Step:</span> Fill env variables in <code className="text-ink">.env.local</code> and restart the development server.
                </div>
              </div>
            ) : user ? (
              <div className="w-full text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-emerald-600 mb-2">Authenticated Successfully</h3>
                <p className="text-xs text-muted leading-relaxed mb-6">
                  You are signed in as an anonymous user.
                </p>
                <div className="w-full p-4 rounded-xl bg-canvas border border-slate-200 text-left mb-6 font-mono text-xs text-muted overflow-x-auto">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                    <span className="text-muted">auth_provider</span>
                    <span className="text-primary font-medium">anonymous</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">user_id</span>
                    <span className="text-ink select-all">{user.id}</span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center w-full h-12 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover shadow-md shadow-primary/20 active:scale-[0.98] transition-all duration-200"
                >
                  Enter MedPal Dashboard
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="landing" />
    </div>
  )
}
