import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@src/lib/supabase'
import { useToastStore } from '@src/lib/store'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

// =====================================================
// AUTH CALLBACK PAGE
// =====================================================

type CallbackStatus = 'loading' | 'success' | 'error'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const addToast = useToastStore((state) => state.addToast)

  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [message, setMessage] = useState<string>('Authentifizierung wird verarbeitet...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // Handle OAuth error
        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Authentifizierung fehlgeschlagen')
          addToast({
            type: 'error',
            title: 'Authentifizierung fehlgeschlagen',
            description: errorDescription || error,
          })
          return
        }

        // No code present
        if (!code) {
          setStatus('error')
          setMessage('Kein Authentifizierungscode gefunden')
          return
        }

        // Exchange code for session
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setStatus('error')
          setMessage(exchangeError.message)
          addToast({
            type: 'error',
            title: 'Authentifizierung fehlgeschlagen',
            description: exchangeError.message,
          })
          return
        }

        // Success
        setStatus('success')
        setMessage('Erfolgreich angemeldet!')

        // Redirect after short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1500)
      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('Ein unerwarteter Fehler ist aufgetreten')
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate, addToast])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-lg">
        {/* Status Icon */}
        {status === 'loading' && (
          <div className="rounded-full bg-violet-500/10 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-full bg-emerald-500/10 p-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-full bg-red-500/10 p-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        )}

        {/* Message */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">
            {status === 'loading' && 'Authentifizierung...'}
            {status === 'success' && 'Erfolgreich!'}
            {status === 'error' && 'Fehler'}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">{message}</p>
        </div>

        {/* Error action */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            Zurueck zum Login
          </button>
        )}
      </div>
    </div>
  )
}
