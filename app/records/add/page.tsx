'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AddRecordPage() {
  const router = useRouter()

  // Form states
  const [drugName, setDrugName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [purpose, setPurpose] = useState('')
  const [timing, setTiming] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')

  // UI States
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Timing options
  const timingOptions = ['Morning', 'Afternoon', 'Evening', 'Bedtime']

  const handleTimingChange = (option: string) => {
    if (timing.includes(option)) {
      setTiming(timing.filter((t) => t !== option))
    } else {
      setTiming([...timing, option])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Form client-side validation
    if (!drugName.trim()) {
      setError('Drug name is required')
      return
    }
    if (!dosage.trim()) {
      setError('Dosage is required')
      return
    }
    if (!frequency.trim()) {
      setError('Frequency is required')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drug_name: drugName,
          dosage,
          frequency,
          purpose: purpose || null,
          timing,
          instructions: instructions || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create record')
      }

      setSuccess(true)
      
      // Clear form
      setDrugName('')
      setDosage('')
      setFrequency('')
      setPurpose('')
      setTiming([])
      setInstructions('')

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Decorative glowing gradient spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900/60 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4.5 h-4.5 text-slate-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
            MedPal Console
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </Link>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-2xl">
          {/* Back button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-350 mb-6 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Glassmorphic Form Card */}
          <div className="w-full p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Add Medication Record
              </h1>
              <p className="text-sm text-slate-400">
                Log a new prescription or over-the-counter medicine to your active clinical profile.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Box */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-3 animate-headshake">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-rose-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Box */}
              {success && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                  <span>Medication record added successfully! Redirecting to console...</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Drug Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="drugName" className="text-xs font-semibold text-slate-350">
                    Drug Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="drugName"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Dosage */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dosage" className="text-xs font-semibold text-slate-350">
                    Dosage <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="dosage"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg (1 capsule)"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Frequency */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="frequency" className="text-xs font-semibold text-slate-350">
                    Frequency <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. Twice daily"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Purpose */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="purpose" className="text-xs font-semibold text-slate-350">
                    Purpose <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Bacterial infection"
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 text-slate-100 placeholder-slate-600 text-sm outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Timing Checkboxes */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-slate-355">
                  Timing Checkboxes <span className="text-slate-500">(Select all that apply)</span>
                </span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {timingOptions.map((option) => {
                    const isChecked = timing.includes(option)
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => !submitting && !success && handleTimingChange(option)}
                        disabled={submitting || success}
                        className={`h-11 flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-400 shadow-inner shadow-cyan-500/5'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700/60'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-150 ${
                          isChecked ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'border-slate-800'
                        }`}>
                          {isChecked && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2 h-2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Instructions */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="instructions" className="text-xs font-semibold text-slate-350">
                  Instructions <span className="text-slate-500">(Optional)</span>
                </label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with a glass of water, avoid dairy for 2 hours after taking."
                  disabled={submitting || success}
                  rows={3}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/10 text-slate-100 placeholder-slate-600 text-sm outline-none resize-none transition-all duration-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-900/60">
                <Link
                  href="/dashboard"
                  className="px-5 h-11 inline-flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200 text-sm font-semibold transition-all duration-200"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="px-6 h-11 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10 transition-all duration-200 active:scale-[0.98]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    'Add Medication'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-600 z-10 border-t border-slate-900/40">
        © 2026 MedPal. HIPAA Compliant & Secure Records.
      </footer>
    </div>
  )
}
