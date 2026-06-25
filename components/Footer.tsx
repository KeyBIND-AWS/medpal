import Link from 'next/link'

interface FooterProps {
  variant?: 'landing' | 'dashboard' | 'records'
}

export function Footer({ variant = 'landing' }: FooterProps) {
  const isDashboard = variant === 'dashboard'
  const isRecords = variant === 'records'

  if (isRecords) {
    return (
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted z-10 border-t border-slate-200">
        © 2026 MedPal. HIPAA Compliant & Secure Records.
      </footer>
    )
  }

  if (isDashboard) {
    return (
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-200 text-xs text-muted z-10 flex items-center justify-between">
        <div>© 2026 MedPal. Secure Clinical Console.</div>
        <div className="text-muted">Standard Encryption Enabled</div>
      </footer>
    )
  }

  return (
    <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted z-10">
      <div>© 2026 MedPal. All rights reserved.</div>
      <div className="flex gap-6">
        <Link href="/dashboard" className="hover:text-ink transition-colors">
          Test Route Security
        </Link>
      </div>
    </footer>
  )
}
