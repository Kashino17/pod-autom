import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Check, Star, ShieldCheck, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useCheckout } from '@src/hooks/useCheckout'
import { useAuth } from '@src/contexts/AuthContext'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@src/lib/constants'

const tierOrder: SubscriptionTier[] = ['basis', 'premium', 'vip']

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { createCheckoutSession, isLoading, error, isStripeConfigured } = useCheckout()

  const tierParam = searchParams.get('tier') as SubscriptionTier | null
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    tierParam && tierOrder.includes(tierParam) ? tierParam : 'premium'
  )

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/checkout')
    }
  }, [user, authLoading, navigate])

  const handleCheckout = () => {
    createCheckoutSession(selectedTier)
  }

  const tier = SUBSCRIPTION_TIERS[selectedTier]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Zurueck</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Waehle deinen Plan
          </h1>
          <p className="text-zinc-400">
            Starte jetzt mit TMS Solvado und automatisiere dein E-Commerce Business
          </p>
        </div>

        {/* Stripe not configured warning */}
        {!isStripeConfigured && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-medium">Zahlungssystem nicht verfuegbar</p>
                <p className="text-amber-300/70 text-sm mt-1">
                  Das Zahlungssystem ist derzeit nicht konfiguriert. Bitte kontaktiere den Support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tierOrder.map((tierId) => {
            const tierData = SUBSCRIPTION_TIERS[tierId]
            const isSelected = selectedTier === tierId
            const isPremium = tierId === 'premium'

            return (
              <button
                key={tierId}
                onClick={() => setSelectedTier(tierId)}
                className={`relative p-6 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-violet-500/20 border-2 border-violet-500'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-violet-500 text-white text-xs font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      Empfohlen
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{tierData.name}</h3>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-violet-500 bg-violet-500' : 'border-zinc-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-white">{tierData.price}€</span>
                  <span className="text-zinc-500 text-sm">/Monat</span>
                </div>

                <ul className="space-y-2">
                  {tierData.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-400">
                      <Check className="w-3.5 h-3.5 text-violet-400" />
                      {feature}
                    </li>
                  ))}
                  {tierData.features.length > 3 && (
                    <li className="text-sm text-zinc-500">
                      +{tierData.features.length - 3} weitere Features
                    </li>
                  )}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Selected Plan Summary */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Zusammenfassung</h3>

          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Ausgewaehlter Plan</span>
            <span className="text-white font-medium">{tier.name}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Abrechnungszeitraum</span>
            <span className="text-white">Monatlich</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-zinc-400">Monatlicher Preis</span>
            <span className="text-2xl font-bold text-white">{tier.price}€</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={isLoading || !isStripeConfigured}
          className="w-full py-4 bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Weiterleitung zu Stripe...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Jetzt {tier.price}€/Monat abonnieren
            </>
          )}
        </button>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sichere Zahlung</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Jederzeit kuendbar</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>14 Tage Geld-zurueck</span>
          </div>
        </div>

        {/* Legal note */}
        <p className="mt-8 text-center text-zinc-600 text-xs">
          Mit dem Klick auf "Abonnieren" stimmst du unseren{' '}
          <Link to="/agb" className="text-zinc-500 hover:text-white underline">
            AGB
          </Link>{' '}
          und{' '}
          <Link to="/datenschutz" className="text-zinc-500 hover:text-white underline">
            Datenschutzbestimmungen
          </Link>{' '}
          zu.
        </p>
      </div>
    </div>
  )
}
