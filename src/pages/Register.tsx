import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, Check, LayoutGrid } from 'lucide-react'

export function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Password validation
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }

  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid) {
      setError('Bitte erfülle alle Passwort-Anforderungen')
      return
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, fullName)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen')
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
          <h1 className="text-xl font-bold text-zinc-100 mb-3">Registrierung erfolgreich!</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Wir haben dir eine Bestätigungs-E-Mail gesendet.
            Bitte überprüfe dein Postfach und klicke auf den Link, um deinen Account zu aktivieren.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-sm font-medium rounded-lg transition-all shadow-glow"
          >
            Zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 py-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(39,39,42,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.3)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 mb-4 shadow-lg">
            <LayoutGrid className="w-7 h-7 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Account erstellen</h1>
          <p className="text-zinc-500 mt-2 text-sm">Starte noch heute mit ReBoss</p>
        </div>

        {/* Register Form Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Vollständiger Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Max Mustermann"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-surfaceHighlight border border-border rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

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

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-surfaceHighlight border border-border rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <PasswordCheck label="8+ Zeichen" passed={passwordChecks.minLength} />
                  <PasswordCheck label="Großbuchstabe" passed={passwordChecks.hasUppercase} />
                  <PasswordCheck label="Kleinbuchstabe" passed={passwordChecks.hasLowercase} />
                  <PasswordCheck label="Zahl" passed={passwordChecks.hasNumber} />
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  required
                  className={`w-full pl-10 pr-4 py-2.5 bg-surfaceHighlight border rounded-lg text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-border focus:ring-primary/50 focus:border-primary'
                  }`}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1.5 text-xs text-red-400">Passwörter stimmen nicht überein</p>
              )}
            </div>

            {/* Terms */}
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Mit der Registrierung stimmst du unseren{' '}
              <a href="#" className="text-primary hover:underline">Nutzungsbedingungen</a>
              {' '}und{' '}
              <a href="#" className="text-primary hover:underline">Datenschutzrichtlinien</a>
              {' '}zu.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || password !== confirmPassword}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primaryHover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrieren...
                </>
              ) : (
                'Account erstellen'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-surface text-zinc-600">oder</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-zinc-500 text-sm">
            Bereits einen Account?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primaryHover font-medium transition-colors"
            >
              Jetzt anmelden
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} ReBoss. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  )
}

function PasswordCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
        passed ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'
      }`}>
        {passed && <Check className="w-2.5 h-2.5" />}
      </div>
      <span className={passed ? 'text-green-400' : 'text-zinc-500'}>{label}</span>
    </div>
  )
}
