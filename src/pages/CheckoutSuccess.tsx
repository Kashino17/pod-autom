import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'

export default function CheckoutSuccess() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { subscription, loading: subLoading, refetch } = useSubscription()
  const [countdown, setCountdown] = useState(5)

  // Refetch subscription data after successful checkout
  useEffect(() => {
    if (user && !subLoading) {
      refetch()
    }
  }, [user, subLoading, refetch])

  // Auto-redirect countdown
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate, user, authLoading])

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          {/* Sparkle effects */}
          <Sparkles className="absolute top-0 right-1/4 w-6 h-6 text-amber-400 animate-bounce" />
          <Sparkles className="absolute bottom-0 left-1/4 w-4 h-4 text-violet-400 animate-bounce delay-100" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Zahlung erfolgreich!
        </h1>

        <p className="text-zinc-400 mb-8">
          Willkommen bei TMS EcomPilot
          {subscription?.tier && (
            <span className="text-violet-400 font-medium">
              {' '}
              - {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
            </span>
          )}
          ! Dein Account ist jetzt aktiv.
        </p>

        {/* What's next */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-lg font-bold text-white mb-4">Naechste Schritte:</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-sm font-medium">1</span>
              </div>
              <span className="text-zinc-300">Verbinde deinen Shopify Store</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-sm font-medium">2</span>
              </div>
              <span className="text-zinc-300">Waehle deine Nischen aus</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-sm font-medium">3</span>
              </div>
              <span className="text-zinc-300">Konfiguriere deine Prompts</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-sm font-medium">4</span>
              </div>
              <span className="text-zinc-300">Starte die automatische Produkterstellung!</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <Link
          to="/dashboard"
          className="w-full py-4 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Zum Dashboard
          <ArrowRight className="w-5 h-5" />
        </Link>

        {/* Auto-redirect notice */}
        <p className="mt-4 text-zinc-600 text-sm">
          Automatische Weiterleitung in {countdown} Sekunden...
        </p>

        {/* Support note */}
        <p className="mt-8 text-zinc-600 text-xs">
          Fragen? Kontaktiere uns unter{' '}
          <a href="mailto:support@tms-yield.de" className="text-zinc-500 hover:text-white underline">
            support@tms-yield.de
          </a>
        </p>
      </div>
    </div>
  )
}
