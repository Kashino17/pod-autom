import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useToastStore } from '@src/lib/store'
import { isValidEmail } from '@src/utils/validation'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const addToast = useToastStore((state) => state.addToast)

  // Form state
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Validation
  const isEmailValid = email.length === 0 || isValidEmail(email)
  const canSubmit = isValidEmail(email) && !isSubmitting

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    const result = await resetPassword(email)

    if (result.success) {
      setEmailSent(true)
    } else {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: result.message || 'Ein Fehler ist aufgetreten',
      })
    }
    setIsSubmitting(false)
  }

  // Success view
  if (emailSent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              E-Mail gesendet!
            </h1>
            <p className="text-zinc-400 mb-2">
              Wenn ein Konto mit
            </p>
            <p className="text-white font-medium mb-4">{email}</p>
            <p className="text-zinc-400">
              existiert, haben wir dir einen Link zum Zuruecksetzen deines Passworts gesendet.
            </p>
          </div>

          <div className="space-y-4">
            <Link to="/login" className="btn-primary w-full py-3 block">
              Zurueck zum Login
            </Link>
            <button
              onClick={() => setEmailSent(false)}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Andere E-Mail-Adresse verwenden
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Zurueck zum Login</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-violet-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Passwort vergessen?
          </h1>
          <p className="text-zinc-400">
            Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zuruecksetzen.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="label">
              E-Mail-Adresse
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon-left w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-with-icon-left ${
                  !isEmailValid ? 'border-red-500 focus:border-red-500' : ''
                }`}
                placeholder="deine@email.de"
                autoComplete="email"
                autoFocus
                required
              />
            </div>
            {!isEmailValid && (
              <p className="error-text">Bitte gib eine gueltige E-Mail ein</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full py-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Link senden'
            )}
          </button>
        </form>

        {/* Help text */}
        <p className="text-center text-zinc-500 text-sm mt-8">
          Du erinnerst dich wieder?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
