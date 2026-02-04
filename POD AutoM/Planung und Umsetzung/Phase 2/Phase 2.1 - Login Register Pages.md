# Phase 2.1 - Login/Register Pages

## Ziel
Erstellen der Authentifizierungsseiten mit OAuth Social Login, moderner UX und vollständiger Accessibility.

## Geschätzte Dauer
4-6 Stunden

## Übersicht

### Features
- E-Mail/Passwort Login & Registration
- OAuth Social Login (Google, Apple)
- Passwort anzeigen/verbergen Toggle
- "Angemeldet bleiben" Option
- E-Mail Verifikation mit Resend-Option
- Rate-Limiting Feedback
- Vollständige Accessibility (ARIA)
- Responsive Design mit Animationen

---

## Komponenten

### 1. src/pages/Login.tsx
```typescript
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import {
  Zap,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Chrome,
  Apple
} from 'lucide-react'
import { ROUTES } from '@src/lib/constants'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  const { signIn, signInWithProvider } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD

  // Rate limit countdown
  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            setRateLimited(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [retryAfter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rateLimited) return

    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          setError('Ungültige E-Mail oder Passwort')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Bitte bestätige zuerst deine E-Mail-Adresse')
        } else if (error.message.includes('Too many requests') || error.status === 429) {
          setRateLimited(true)
          setRetryAfter(60) // 60 seconds cooldown
          setError('Zu viele Anmeldeversuche. Bitte warte einen Moment.')
        } else {
          setError(error.message)
        }
        return
      }

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('pod_autom_remember_email', email)
      } else {
        localStorage.removeItem('pod_autom_remember_email')
      }

      navigate(from, { replace: true })
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      setError('')
      await signInWithProvider(provider)
      // Redirect happens automatically via Supabase
    } catch (err) {
      setError(`${provider === 'google' ? 'Google' : 'Apple'} Login fehlgeschlagen`)
    }
  }

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('pod_autom_remember_email')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-3 mb-8 group"
            aria-label="Zur Startseite"
          >
            <Zap className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold">POD AutoM</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Willkommen zurück
          </h1>
          <p className="text-xl text-zinc-400 max-w-md">
            Dein vollautomatisiertes Print-on-Demand Business wartet auf dich.
          </p>

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              SSL verschlüsselt
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              DSGVO konform
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Zap className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">POD AutoM</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Anmelden</h2>
            <p className="text-zinc-400">
              Noch kein Konto?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                Jetzt registrieren
              </Link>
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading || rateLimited}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Mit Google anmelden"
            >
              <Chrome className="w-5 h-5" />
              Mit Google anmelden
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading || rateLimited}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Mit Apple anmelden"
            >
              <Apple className="w-5 h-5" />
              Mit Apple anmelden
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-zinc-500">oder mit E-Mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-shake"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
                {rateLimited && retryAfter > 0 && (
                  <span className="ml-auto font-mono">{retryAfter}s</span>
                )}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                E-Mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="deine@email.de"
                  required
                  autoComplete="email"
                  aria-describedby="email-error"
                  disabled={rateLimited}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Passwort
                </label>
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
                >
                  Vergessen?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={rateLimited}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-surface text-primary focus:ring-primary focus:ring-offset-background"
              />
              <label htmlFor="remember-me" className="text-sm text-zinc-400">
                Angemeldet bleiben
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || rateLimited}
              className="w-full btn-primary py-3"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Anmelden...</span>
                </>
              ) : rateLimited ? (
                <span>Bitte warten ({retryAfter}s)</span>
              ) : (
                <span>Anmelden</span>
              )}
            </button>
          </form>

          {/* Legal Links */}
          <p className="mt-8 text-center text-xs text-zinc-500">
            Mit der Anmeldung akzeptierst du unsere{' '}
            <Link to={ROUTES.TERMS} className="text-zinc-400 hover:underline">
              AGB
            </Link>
            {' '}und{' '}
            <Link to={ROUTES.PRIVACY} className="text-zinc-400 hover:underline">
              Datenschutzerklärung
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 2. src/pages/Register.tsx
```typescript
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import {
  Zap,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Chrome,
  Apple,
  RefreshCw
} from 'lucide-react'
import { ROUTES } from '@src/lib/constants'
import { validatePassword, getPasswordStrength } from '@src/lib/validation'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const { signUp, signInWithProvider, resendVerificationEmail } = useAuth()
  const navigate = useNavigate()

  // Password requirements
  const passwordRequirements = [
    { label: 'Mindestens 8 Zeichen', met: password.length >= 8 },
    { label: 'Großbuchstabe (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Kleinbuchstabe (a-z)', met: /[a-z]/.test(password) },
    { label: 'Zahl (0-9)', met: /[0-9]/.test(password) },
    { label: 'Sonderzeichen (!@#$%)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every((req) => req.met)
  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validations
    if (!acceptTerms) {
      setError('Bitte akzeptiere die AGB und Datenschutzerklärung')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (!allRequirementsMet) {
      setError('Bitte erfülle alle Passwort-Anforderungen')
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password, {
        data: {
          full_name: name || undefined,
          display_name: name?.split(' ')[0] || undefined
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Diese E-Mail ist bereits registriert')
        } else if (error.message.includes('weak password')) {
          setError('Das Passwort ist zu schwach')
        } else {
          setError(error.message)
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return

    setResendLoading(true)
    try {
      await resendVerificationEmail(email)
      setResendCooldown(60)

      // Countdown timer
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError('E-Mail konnte nicht erneut gesendet werden')
    } finally {
      setResendLoading(false)
    }
  }

  const handleOAuthRegister = async (provider: 'google' | 'apple') => {
    try {
      setError('')
      await signInWithProvider(provider)
    } catch (err) {
      setError(`${provider === 'google' ? 'Google' : 'Apple'} Registrierung fehlgeschlagen`)
    }
  }

  // Success Screen - Email Verification
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">E-Mail bestätigen</h2>
          <p className="text-zinc-400 mb-2">
            Wir haben dir eine E-Mail an
          </p>
          <p className="text-white font-medium mb-6">{email}</p>
          <p className="text-zinc-400 mb-8">
            gesendet. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>

          {/* Resend Email Button */}
          <div className="space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={resendLoading || resendCooldown > 0}
              className="btn-secondary w-full"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Senden...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Erneut senden ({resendCooldown}s)
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  E-Mail erneut senden
                </>
              )}
            </button>

            <Link to={ROUTES.LOGIN} className="btn-primary w-full inline-flex justify-center">
              Zur Anmeldung
            </Link>
          </div>

          <p className="mt-8 text-sm text-zinc-500">
            Keine E-Mail erhalten? Prüfe deinen Spam-Ordner oder{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-primary hover:underline"
            >
              versuche eine andere E-Mail
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-3 mb-8 group"
            aria-label="Zur Startseite"
          >
            <Zap className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-3xl font-bold">POD AutoM</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Starte dein POD-Business
          </h1>
          <p className="text-xl text-zinc-400 max-w-md">
            Automatisiere dein Print-on-Demand Business und verdiene passiv.
          </p>

          {/* Features List */}
          <div className="mt-12 space-y-4">
            {[
              'KI-generierte Designs',
              'Automatische Ad-Kampagnen',
              'Winner Scaling System',
              'Vollautomatischer Workflow'
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Zap className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">POD AutoM</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Konto erstellen</h2>
            <p className="text-zinc-400">
              Bereits registriert?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                Jetzt anmelden
              </Link>
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthRegister('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-100 transition disabled:opacity-50"
              aria-label="Mit Google registrieren"
            >
              <Chrome className="w-5 h-5" />
              Mit Google registrieren
            </button>

            <button
              type="button"
              onClick={() => handleOAuthRegister('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition disabled:opacity-50"
              aria-label="Mit Apple registrieren"
            >
              <Apple className="w-5 h-5" />
              Mit Apple registrieren
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-zinc-500">oder mit E-Mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error Message */}
            {error && (
              <div
                className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-shake"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name <span className="text-zinc-500">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-10"
                  placeholder="Max Mustermann"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                E-Mail <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="deine@email.de"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Passwort <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3 space-y-3">
                  {/* Strength Bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? passwordStrength === 1 ? 'bg-red-500'
                            : passwordStrength === 2 ? 'bg-amber-500'
                            : passwordStrength === 3 ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requirements Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {passwordRequirements.map((req) => (
                      <div
                        key={req.label}
                        className={`flex items-center gap-2 text-xs transition-colors ${
                          req.met ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                            req.met ? 'bg-emerald-500/20' : 'bg-zinc-800'
                          }`}
                        >
                          {req.met && <Check className="w-3 h-3" />}
                        </div>
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                Passwort bestätigen <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input pl-10 pr-10 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:border-red-500'
                      : confirmPassword && password === confirmPassword
                      ? 'border-emerald-500 focus:border-emerald-500'
                      : ''
                  }`}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  aria-label={showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">Passwörter stimmen nicht überein</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-surface text-primary focus:ring-primary"
                required
              />
              <label htmlFor="accept-terms" className="text-sm text-zinc-400">
                Ich akzeptiere die{' '}
                <Link to={ROUTES.TERMS} className="text-primary hover:underline" target="_blank">
                  AGB
                </Link>
                {' '}und{' '}
                <Link to={ROUTES.PRIVACY} className="text-primary hover:underline" target="_blank">
                  Datenschutzerklärung
                </Link>
                {' '}<span className="text-red-400">*</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !acceptTerms}
              className="w-full btn-primary py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrieren...
                </>
              ) : (
                'Kostenlos registrieren'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

### 3. src/pages/ForgotPassword.tsx
```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { Zap, Mail, AlertCircle, Loader2, ArrowLeft, Check, RefreshCw } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await resetPassword(email)

      if (error) {
        // Don't reveal if email exists or not
        if (error.message.includes('rate limit')) {
          setError('Zu viele Anfragen. Bitte warte einen Moment.')
        } else {
          // Generic success message even on error (security)
          setSuccess(true)
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    try {
      await resetPassword(email)
      setResendCooldown(60)

      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Back Link */}
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8 focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Anmeldung
        </Link>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-10 h-10 text-primary" />
          <span className="text-2xl font-bold">POD AutoM</span>
        </div>

        {success ? (
          /* Success State */
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">E-Mail gesendet</h2>
            <p className="text-zinc-400 mb-2">
              Falls ein Konto mit dieser E-Mail existiert, haben wir dir Anweisungen zum Zurücksetzen deines Passworts gesendet:
            </p>
            <p className="text-white font-medium mb-8">{email}</p>

            <div className="space-y-4">
              <button
                onClick={handleResend}
                disabled={loading || resendCooldown > 0}
                className="btn-secondary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Senden...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Erneut senden ({resendCooldown}s)
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    E-Mail erneut senden
                  </>
                )}
              </button>

              <Link to={ROUTES.LOGIN} className="btn-primary w-full inline-flex justify-center">
                Zur Anmeldung
              </Link>
            </div>

            <p className="mt-8 text-sm text-zinc-500">
              Keine E-Mail erhalten? Prüfe deinen Spam-Ordner oder{' '}
              <button
                onClick={() => setSuccess(false)}
                className="text-primary hover:underline"
              >
                versuche eine andere E-Mail
              </button>
            </p>
          </div>
        ) : (
          /* Form State */
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Passwort vergessen?</h2>
              <p className="text-zinc-400">
                Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-shake"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="deine@email.de"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full btn-primary py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Senden...
                  </>
                ) : (
                  'Link senden'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
```

### 4. src/lib/validation.ts (Utility)
```typescript
/**
 * Password validation utilities
 */

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Mindestens 8 Zeichen erforderlich')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe erforderlich')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe erforderlich')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Mindestens eine Zahl erforderlich')
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen erforderlich')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Returns password strength level (1-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0

  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

  return Math.min(strength, 4)
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

### 5. src/animations.css (Ergänzung)
```css
/* Fade In Animation */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* Shake Animation for Errors */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Slow Pulse for Background */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}
```

---

## Verifizierung

### Funktionale Tests
- [ ] Login mit E-Mail/Passwort funktioniert
- [ ] Login mit Google OAuth funktioniert
- [ ] Login mit Apple OAuth funktioniert
- [ ] "Passwort anzeigen" Toggle funktioniert
- [ ] "Angemeldet bleiben" speichert E-Mail
- [ ] Rate Limiting zeigt Countdown an
- [ ] Registration erstellt neuen User
- [ ] Name wird an signUp übergeben
- [ ] E-Mail Bestätigung wird angezeigt
- [ ] "E-Mail erneut senden" funktioniert
- [ ] Passwort-Anforderungen validieren korrekt
- [ ] Password Strength Indikator funktioniert
- [ ] Forgot Password sendet E-Mail
- [ ] Redirect nach Login zur ursprünglichen Seite

### UI/UX Tests
- [ ] Responsive Design auf Mobile
- [ ] Alle Animationen flüssig
- [ ] Error Messages sind lesbar
- [ ] Loading States erkennbar

### Accessibility Tests
- [ ] Alle Inputs haben Labels
- [ ] Aria-Labels vorhanden
- [ ] Keyboard Navigation möglich
- [ ] Focus States sichtbar
- [ ] Screen Reader kompatibel

### Security Tests
- [ ] Passwort wird nie im Klartext geloggt
- [ ] Rate Limiting verhindert Brute Force
- [ ] CSRF Protection aktiv
- [ ] Keine sensiblen Daten in localStorage

---

## Abhängigkeiten
- Phase 1.5 (AuthContext mit OAuth)
- Phase 1.2 (Tailwind Styling)
- src/lib/constants.ts (ROUTES)
- src/lib/validation.ts (neue Datei)

## Nächster Schritt
→ Phase 2.2 - Shopify OAuth Integration
