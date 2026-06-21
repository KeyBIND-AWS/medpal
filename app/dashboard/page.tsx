import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Retrieve user session server-side
  const { data: { user } } = await supabase.auth.getUser()

  // Guard routing server-side (in addition to proxy redirection)
  if (!user) {
    redirect('/')
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Glowing background shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <Header variant="dashboard" />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 z-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome, Provider
          </h1>
          <p className="text-sm text-slate-400">
            MedPal environment initialized. Your clinical sessions are persisted and secured.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Auth & User Profile */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <h2 className="font-semibold text-lg text-slate-100 mb-2">Secure Session</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                You are currently authenticated anonymously. This session is persisted in client cookies.
              </p>
            </div>
            <div className="w-full pt-4 border-t border-slate-900/60 font-mono text-[10px] text-slate-400 space-y-1.5 overflow-x-auto">
              <div className="flex justify-between">
                <span className="text-slate-650">Provider</span>
                <span className="text-slate-200">anonymous</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-655">User ID</span>
                <span className="text-slate-300 font-semibold select-all">{user.id.substring(0, 18)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-655">Created</span>
                <span className="text-slate-300">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: AWS Bedrock Integration Status */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21m0 0-.813-5.096L9 21Zm0 0h-.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9Zm-9-3v.01" />
                </svg>
              </div>
              <h2 className="font-semibold text-lg text-slate-100 mb-2">AWS Bedrock Runtime</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                The Bedrock runtime SDK is installed and ready. Access to foundation models (Claude, Llama) is configured.
              </p>
            </div>
            <div className="w-full pt-4 border-t border-slate-900/60 font-mono text-[10px] text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-655">SDK Package</span>
                <span className="text-cyan-400 font-semibold">@aws-sdk/client-bedrock-runtime</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-655">Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Synchronization DDL */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <h2 className="font-semibold text-lg text-slate-100 mb-2">Database Trigger Sync</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                To sync your anonymous auth profiles to the public users table, ensure you run the database trigger script.
              </p>
            </div>
            <div className="w-full pt-4 border-t border-slate-900/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">Sync Table: public.users</span>
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Trigger Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="dashboard" />
    </div>
  )
}
