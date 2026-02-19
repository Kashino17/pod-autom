import { Link } from 'react-router-dom'
import { Check, Star, ArrowRight, Crown } from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@src/lib/constants'

const tierOrder: SubscriptionTier[] = ['basis', 'premium', 'vip']

const plans = tierOrder.map((tierId) => ({
  id: tierId,
  ...SUBSCRIPTION_TIERS[tierId],
  description:
    tierId === 'basis'
      ? 'Perfekt fuer den Einstieg ins POD-Business'
      : tierId === 'premium'
        ? 'Fuer ambitionierte Seller mit Wachstumsziel'
        : 'Maximale Power fuer ernsthafte Unternehmer',
  highlighted: tierId === 'premium',
  badge: tierId === 'premium' ? 'Empfohlen' : undefined,
}))

export default function Pricing() {
  const { user } = useAuth()
  const { tier: currentTier, isActive } = useSubscription()

  const getTierIndex = (tier: SubscriptionTier | null): number => {
    if (!tier) return -1
    return tierOrder.indexOf(tier)
  }

  const currentTierIndex = getTierIndex(currentTier)

  const getButtonConfig = (planId: SubscriptionTier) => {
    const planIndex = getTierIndex(planId)

    // Not logged in
    if (!user) {
      return {
        text: 'Jetzt starten',
        href: `/register?plan=${planId}`,
        variant: 'primary' as const,
        disabled: false,
      }
    }

    // No active subscription
    if (!isActive || currentTierIndex === -1) {
      return {
        text: 'Plan waehlen',
        href: `/checkout?tier=${planId}`,
        variant: 'primary' as const,
        disabled: false,
      }
    }

    // Current plan
    if (planId === currentTier) {
      return {
        text: 'Aktueller Plan',
        href: '#',
        variant: 'current' as const,
        disabled: true,
      }
    }

    // Upgrade
    if (planIndex > currentTierIndex) {
      return {
        text: 'Upgrade',
        href: `/checkout?tier=${planId}`,
        variant: 'upgrade' as const,
        disabled: false,
      }
    }

    // Downgrade
    return {
      text: 'Downgrade',
      href: `/checkout?tier=${planId}`,
      variant: 'downgrade' as const,
      disabled: false,
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to={user ? '/dashboard' : '/'}
            className="text-xl font-bold text-white"
          >
            POD Auto<span className="text-emerald-400">M</span>
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Zurueck zum Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary">
              Anmelden
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            Preise
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Waehle deinen
            <br />
            <span className="text-gradient">Erfolgsplan</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Transparent und fair. Keine versteckten Kosten. Jederzeit kuendbar.
          </p>
        </div>

        {/* Current Plan Badge */}
        {currentTier && isActive && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Crown className="w-4 h-4" />
              <span>
                Dein aktueller Plan:{' '}
                <strong>{SUBSCRIPTION_TIERS[currentTier].name}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const buttonConfig = getButtonConfig(plan.id)
            const isCurrentPlan = plan.id === currentTier && isActive

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-violet-500/20 to-violet-500/5 border-2 border-violet-500 scale-105 shadow-xl shadow-violet-500/20'
                    : isCurrentPlan
                      ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border-2 border-emerald-500'
                      : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Badge */}
                {plan.badge && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 px-4 py-1 rounded-full bg-violet-500 text-white text-sm font-medium">
                      <Star className="w-4 h-4 fill-current" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 px-4 py-1 rounded-full bg-emerald-500 text-white text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Aktueller Plan
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">
                      {plan.price}€
                    </span>
                    <span className="text-zinc-400">/Monat</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          plan.highlighted || isCurrentPlan
                            ? isCurrentPlan
                              ? 'bg-emerald-500'
                              : 'bg-violet-500'
                            : 'bg-violet-500/20'
                        }`}
                      >
                        <Check
                          className={`w-3 h-3 ${
                            plan.highlighted || isCurrentPlan
                              ? 'text-white'
                              : 'text-violet-400'
                          }`}
                        />
                      </div>
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {buttonConfig.disabled ? (
                  <div className="w-full py-4 rounded-xl font-medium text-center bg-zinc-800 text-zinc-400 cursor-not-allowed">
                    {buttonConfig.text}
                  </div>
                ) : (
                  <Link
                    to={buttonConfig.href}
                    className={`w-full py-4 rounded-xl font-medium text-center transition-all flex items-center justify-center gap-2 ${
                      buttonConfig.variant === 'upgrade'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : buttonConfig.variant === 'downgrade'
                          ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          : plan.highlighted
                            ? 'bg-violet-500 text-white hover:bg-violet-600'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {buttonConfig.text}
                    {!buttonConfig.disabled && (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-zinc-500 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>14 Tage Geld-zurueck-Garantie</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Jederzeit kuendbar</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Sichere Zahlung via Stripe</span>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500">
            Fragen zu den Plaenen?{' '}
            <Link to="/#faq" className="text-violet-400 hover:text-violet-300">
              Schau in unsere FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
