import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@src/lib/supabase'
import { useToastStore } from '@src/lib/store'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type VerifyStatus = 'loading' | 'success' | 'error'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const addToast = useToastStore((state) => state.addToast)

  const [status, setStatus] = useState<VerifyStatus>('loading')
  const [message, setMessage] = useState('E-Mail wird verifiziert...')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Check for error in URL
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Verifizierung fehlgeschlagen')
          return
        }

        // Check for token hash (email confirmation uses hash fragment)
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (tokenHash && type === 'email') {
          // Verify OTP
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email',
          })

          if (verifyError) {
            setStatus('error')
            setMessage(verifyError.message)
            return
          }
        }

        // Check if we have a code (alternative flow)
        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setStatus('error')
            setMessage(exchangeError.message)
            return
          }
        }

        // If no tokens/codes, check current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user?.email_confirmed_at) {
          setStatus('success')
          setMessage('Deine E-Mail-Adresse wurde erfolgreich verifiziert!')
          addToast({
            type: 'success',
            title: 'E-Mail verifiziert',
            description: 'Du kannst dich jetzt anmelden.',
          })

          // Redirect to dashboard after delay
          setTimeout(() => {
            navigate('/onboarding', { replace: true })
          }, 2000)
        } else if (!tokenHash && !code) {
          // No verification params and no session
          setStatus('error')
          setMessage('Ungültiger Verifizierungslink')
        }
      } catch (err) {
        console.error('Verification error:', err)
        setStatus('error')
        setMessage('Ein unerwarteter Fehler ist aufgetreten')
      }
    }

    verifyEmail()
  }, [searchParams, navigate, addToast])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Verifizierung...
            </h1>
            <p className="text-zinc-400">{message}</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              E-Mail verifiziert!
            </h1>
            <p className="text-zinc-400 mb-8">{message}</p>
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Weiterleitung...</span>
            </div>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Verifizierung fehlgeschlagen
            </h1>
            <p className="text-zinc-400 mb-8">{message}</p>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-3"
              >
                Zum Login
              </button>
              <p className="text-sm text-zinc-500">
                Probleme?{' '}
                <a
                  href="mailto:support@tms-yield.de"
                  className="text-violet-400 hover:text-violet-300"
                >
                  Kontaktiere den Support
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
