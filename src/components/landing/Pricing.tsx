import { Link } from 'react-router-dom'
import { Check, Star } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'

const plans = [
  {
    id: 'basis',
    name: SUBSCRIPTION_TIERS.basis.name,
    price: SUBSCRIPTION_TIERS.basis.price,
    description: 'Perfekt fuer den Einstieg ins POD-Business',
    features: SUBSCRIPTION_TIERS.basis.features,
    highlighted: false,
    cta: 'Jetzt starten',
  },
  {
    id: 'premium',
    name: SUBSCRIPTION_TIERS.premium.name,
    price: SUBSCRIPTION_TIERS.premium.price,
    description: 'Fuer ambitionierte Seller mit Wachstumsziel',
    features: SUBSCRIPTION_TIERS.premium.features,
    highlighted: true,
    cta: 'Beliebteste Wahl',
    badge: 'Empfohlen',
  },
  {
    id: 'vip',
    name: SUBSCRIPTION_TIERS.vip.name,
    price: SUBSCRIPTION_TIERS.vip.price,
    description: 'Maximale Power fuer ernsthafte Unternehmer',
    features: SUBSCRIPTION_TIERS.vip.features,
    highlighted: false,
    cta: 'VIP werden',
  },
]

export default function Pricing() {
  return (
    <section className="py-24 bg-black" id="pricing">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            Preise
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Waehle deinen
            <br />
            <span className="text-gradient">Erfolgsplan</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Transparent und fair. Keine versteckten Kosten.
            Jederzeit kuendbar.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-violet-500/20 to-violet-500/5 border-2 border-violet-500 scale-105 shadow-xl shadow-violet-500/20'
                  : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-1 rounded-full bg-violet-500 text-white text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    {plan.badge}
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
                        plan.highlighted
                          ? 'bg-violet-500'
                          : 'bg-violet-500/20'
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          plan.highlighted ? 'text-white' : 'text-violet-400'
                        }`}
                      />
                    </div>
                    <span className="text-zinc-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                to="/register"
                className={`w-full py-4 rounded-xl font-medium text-center transition-all ${
                  plan.highlighted
                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
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
      </div>
    </section>
  )
}
