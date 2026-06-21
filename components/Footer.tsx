import Link from 'next/link'

interface FooterProps {
  variant?: 'landing' | 'dashboard' | 'records'
}

export function Footer({ variant = 'landing' }: FooterProps) {
  const isDashboard = variant === 'dashboard'
  const isRecords = variant === 'records'

  if (isRecords) {
    return (
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-650 z-10 border-t border-slate-900/40">
        © 2026 MedPal. HIPAA Compliant & Secure Records.
      </footer>
    )
  }

  if (isDashboard) {
    return (
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 text-xs text-slate-500 z-10 flex items-center justify-between">
        <div>© 2026 MedPal. Secure Clinical Console.</div>
        <div className="text-slate-600">Standard Encryption Enabled</div>
      </footer>
    )
  }

  return (
    <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 z-10">
      <div>© 2026 MedPal. All rights reserved.</div>
      <div className="flex gap-6">
        <Link href="/dashboard" className="hover:text-slate-350 transition-colors">
          Test Route Security
        </Link>
      </div>
    </footer>
  )
}
