import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, AlertCircle, Loader2, Check, ArrowLeft, LayoutGrid } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Zurücksetzen des Passworts')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,39,42,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.3)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-6 border border-green-500/30">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-3">E-Mail gesendet!</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen deines Passworts gesendet.
            Bitte überprüfe dein Postfach.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-sm font-medium rounded-lg transition-all shadow-glow"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(39,39,42,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.3)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Anmeldung
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 mb-4 shadow-lg">
            <LayoutGrid className="w-7 h-7 text-zinc-900" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-2">Passwort vergessen?</h1>
          <p className="text-zinc-500 text-sm">
            Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                E-Mail Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surfaceHighlight border border-border rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primaryHover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Senden...
                </>
              ) : (
                'Link senden'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} ReBoss. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  )
}
