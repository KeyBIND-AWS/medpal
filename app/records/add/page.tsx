'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

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
    <div className="relative min-h-screen flex flex-col justify-between bg-white text-ink overflow-hidden font-sans">
      {/* Header */}
      <Header variant="records" />

      {/* Main Workspace */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-2xl">
          {/* Back button */}
          <Link
            href="/records"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink mb-6 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Records
          </Link>

          {/* Form Card */}
          <div className="w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-md">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight mb-2 text-ink">
                Add Medication Record
              </h1>
              <p className="text-sm text-muted">
                Log a new prescription or over-the-counter medicine to your active clinical profile.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Box */}
              {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-3 animate-headshake">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-danger">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Box */}
              {success && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                  <span>Medication record added successfully! Redirecting to console...</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Drug Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="drugName" className="text-xs font-semibold text-ink">
                    Drug Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="drugName"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary/80 focus:ring-2 focus:ring-primary/10 text-ink placeholder-slate-400 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Dosage */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dosage" className="text-xs font-semibold text-ink">
                    Dosage <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="dosage"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg (1 capsule)"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary/80 focus:ring-2 focus:ring-primary/10 text-ink placeholder-slate-400 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Frequency */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="frequency" className="text-xs font-semibold text-ink">
                    Frequency <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. Twice daily"
                    required
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary/80 focus:ring-2 focus:ring-primary/10 text-ink placeholder-slate-400 text-sm outline-none transition-all duration-200"
                  />
                </div>

                {/* Purpose */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="purpose" className="text-xs font-semibold text-ink">
                    Purpose <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Bacterial infection"
                    disabled={submitting || success}
                    className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary/80 focus:ring-2 focus:ring-primary/10 text-ink placeholder-slate-400 text-sm outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Timing Checkboxes */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-ink">
                  Timing Checkboxes <span className="text-muted">(Select all that apply)</span>
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
                            ? 'bg-tint border-primary/60 text-primary'
                            : 'bg-white border-slate-200 text-muted hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-150 ${
                          isChecked ? 'bg-primary border-primary text-white' : 'border-slate-300'
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
                <label htmlFor="instructions" className="text-xs font-semibold text-ink">
                  Instructions <span className="text-muted">(Optional)</span>
                </label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with a glass of water, avoid dairy for 2 hours after taking."
                  disabled={submitting || success}
                  rows={3}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary/80 focus:ring-2 focus:ring-primary/10 text-ink placeholder-slate-400 text-sm outline-none resize-none transition-all duration-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-200">
                <Link
                  href="/records"
                  className="px-5 h-11 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 text-muted hover:bg-slate-100 hover:text-ink text-sm font-semibold transition-all duration-200"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="px-6 h-11 inline-flex items-center justify-center rounded-xl bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/10 transition-all duration-200 active:scale-[0.98]"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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
      <Footer variant="records" />
    </div>
  )
}
