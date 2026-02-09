import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useToastStore } from '@src/lib/store'
import { validatePassword } from '@src/utils/validation'
import { supabase } from '@src/lib/supabase'
import { Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'

// =====================================================
// RESET PASSWORD PAGE
// =====================================================

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const addToast = useToastStore((state) => state.addToast)

  // Form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  // Password validation
  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword
  const canSubmit =
    passwordValidation.isValid &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    !loading

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Check if this is a recovery session
      // The session will exist after clicking the password reset link
      setIsValidSession(!!session)

      if (!session) {
        addToast({
          type: 'error',
          title: 'Ungueltiger Link',
          description:
            'Der Link ist abgelaufen oder ungueltig. Bitte fordere einen neuen an.',
        })
      }
    }

    checkSession()
  }, [addToast])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit) return

    setLoading(true)

    const result = await updatePassword(password)

    if (result.success) {
      setSuccess(true)
      addToast({
        type: 'success',
        title: 'Passwort aktualisiert',
        description: 'Dein Passwort wurde erfolgreich geaendert.',
      })

      // Redirect after delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
    } else {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: result.message || 'Passwort konnte nicht aktualisiert werden.',
      })
    }

    setLoading(false)
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <Lock className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-white">
            Link ungueltig
          </h1>

          <p className="mb-6 text-zinc-400">
            Der Passwort-Reset-Link ist abgelaufen oder ungueltig. Bitte fordere
            einen neuen Link an.
          </p>

          <Link
            to="/forgot-password"
            className="inline-block rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
          >
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-white">
            Passwort geaendert!
          </h1>

          <p className="mb-6 text-zinc-400">
            Dein Passwort wurde erfolgreich aktualisiert. Du wirst in Kuerze
            weitergeleitet...
          </p>

          <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
            <Lock className="h-8 w-8 text-violet-500" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Neues Passwort setzen
          </h1>
          <p className="mt-2 text-zinc-400">
            Waehle ein sicheres Passwort fuer dein Konto.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          {/* Password field */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Neues Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 pr-12 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Mindestens 8 Zeichen"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        passwordValidation.strength >= level
                          ? passwordValidation.strength === 1
                            ? 'bg-red-500'
                            : passwordValidation.strength === 2
                              ? 'bg-amber-500'
                              : passwordValidation.strength === 3
                                ? 'bg-emerald-500'
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

          {/* Confirm password field */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Passwort bestaetigen
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg border bg-zinc-800 px-4 py-3 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-zinc-700 focus:border-violet-500 focus:ring-violet-500'
                }`}
                placeholder="Passwort wiederholen"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-500">
                Passwoerter stimmen nicht ueberein
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              'Passwort speichern'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
