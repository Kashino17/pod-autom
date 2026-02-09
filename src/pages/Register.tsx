import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useToastStore } from '@src/lib/store'
import { isValidEmail, validatePassword } from '@src/utils/validation'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  User,
  Check,
} from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { signUp, signInWithOAuth, loading } = useAuth()
  const addToast = useToastStore((state) => state.addToast)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Validation
  const isEmailValid = email.length === 0 || isValidEmail(email)
  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword
  const canSubmit =
    fullName.length >= 2 &&
    isValidEmail(email) &&
    passwordValidation.isValid &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    acceptTerms &&
    !isSubmitting

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    const result = await signUp(email, password, { full_name: fullName })

    if (result.success) {
      setEmailSent(true)
      addToast({
        type: 'success',
        title: 'Registrierung erfolgreich',
        description: result.message || 'Bitte bestaetigen deine E-Mail-Adresse',
      })
    } else {
      addToast({
        type: 'error',
        title: 'Registrierung fehlgeschlagen',
        description: result.message || 'Ein Fehler ist aufgetreten',
      })
    }
    setIsSubmitting(false)
  }

  // Handle OAuth
  const handleOAuth = async (provider: 'google' | 'apple') => {
    await signInWithOAuth(provider)
  }

  // Email verification success view
  if (emailSent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Bestaetigung gesendet!
            </h1>
            <p className="text-zinc-400 mb-2">
              Wir haben eine E-Mail an
            </p>
            <p className="text-white font-medium mb-4">{email}</p>
            <p className="text-zinc-400">
              gesendet. Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-3"
            >
              Zum Login
            </button>
            <p className="text-sm text-zinc-500">
              Keine E-Mail erhalten?{' '}
              <button
                onClick={() => setEmailSent(false)}
                className="text-violet-400 hover:text-violet-300"
              >
                Erneut versuchen
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Zurueck zur Startseite</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Konto erstellen
            </h1>
            <p className="text-zinc-400">
              Starte jetzt dein automatisiertes POD-Business.
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Mit Google registrieren
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Mit Apple registrieren
            </button>
          </div>

          {/* Divider */}
          <div className="divider-text mb-6">oder mit E-Mail</div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="label">
                Vollstaendiger Name
              </label>
              <div className="input-wrapper">
                <User className="input-icon-left w-5 h-5" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-with-icon-left"
                  placeholder="Max Mustermann"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

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
                  required
                />
              </div>
              {!isEmailValid && (
                <p className="error-text">Bitte gib eine gueltige E-Mail ein</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Passwort
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon-left w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-with-icon-left pr-12"
                  placeholder="Mindestens 8 Zeichen"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordValidation.strength >= level
                            ? passwordValidation.strength === 1
                              ? 'bg-red-500'
                              : passwordValidation.strength === 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            : 'bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {passwordValidation.feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Passwort bestaetigen
              </label>
              <div className="input-wrapper">
                <Lock className="input-icon-left w-5 h-5" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-with-icon-left pr-12 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="error-text">Passwoerter stimmen nicht ueberein</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="checkbox mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-zinc-400">
                Ich akzeptiere die{' '}
                <Link to="/agb" className="text-violet-400 hover:text-violet-300">
                  AGB
                </Link>{' '}
                und{' '}
                <Link
                  to="/datenschutz"
                  className="text-violet-400 hover:text-violet-300"
                >
                  Datenschutzerklaerung
                </Link>
              </label>
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
                'Konto erstellen'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-zinc-400 mt-6">
            Bereits ein Konto?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300">
              Jetzt anmelden
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-violet-950/50 to-black p-12">
        <div className="max-w-md">
          <div className="mb-8 text-center">
            <span className="text-5xl font-bold text-gradient">POD AutoM</span>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              'Automatische Produkterstellung mit KI',
              'Multi-Platform Werbeanzeigen',
              'Winner Scaling fuer maximale Gewinne',
              '24/7 aktiv - auch wenn du schlaefst',
              'Keine technischen Kenntnisse noetig',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-zinc-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
