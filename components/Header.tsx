import Link from 'next/link'
import { signOut } from '@/app/dashboard/actions'

interface HeaderProps {
  variant?: 'landing' | 'dashboard' | 'records'
}

export function Header({ variant = 'landing' }: HeaderProps) {
  const isLanding = variant === 'landing'
  const isDashboard = variant === 'dashboard'
  const isRecords = variant === 'records'

  return (
    <header className={`w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 ${
      isLanding ? '' : 'border-b border-slate-900/60'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-tr from-cyan-400 to-teal-500 flex items-center justify-center shadow-md ${
          isLanding ? 'w-10 h-10 rounded-xl shadow-lg shadow-cyan-500/20' : 'w-9 h-9 rounded-lg shadow-md'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={isLanding ? 'w-5 h-5 text-slate-950' : 'w-4.5 h-4.5 text-slate-950'}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>
        <span className={`font-semibold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent ${
          isLanding ? 'text-xl' : 'text-lg'
        }`}>
          {isLanding ? 'MedPal' : 'MedPal Console'}
        </span>
      </div>

      {isLanding && (
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
          >
            Dashboard
          </Link>
        </div>
      )}

      {isDashboard && (
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Landing
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-450 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}

      {isRecords && (
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </Link>
      )}
    </header>
  )
}
