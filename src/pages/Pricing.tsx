import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCheckout } from '@src/hooks/useCheckout'
import {
  PLAN_DEFS,
  MVP_FEATURES,
  STANDARD_FEATURES,
  type FeaturePlatform,
  type SubscriptionTier,
} from '@src/lib/constants'

// =====================================================
// HELPERS
// =====================================================

const TIER_ORDER: Record<string, number> = { free: 0, basis: 1, growth: 2, pro: 3, enterprise: 4 }

function PlatformBadge({ platform }: { platform: FeaturePlatform }) {
  if (platform === 'solvado') {
    return <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">Solvado</span>
  }
  if (platform === 'shoporu') {
    return <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">Shoporu</span>
  }
  return (
    <span className="inline-flex items-center gap-0.5 ml-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded whitespace-nowrap">Solvado</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded whitespace-nowrap">Shoporu</span>
    </span>
  )
}

// =====================================================
// PAGE
// =====================================================

export default function Pricing() {
  const { user } = useAuth()
  const { tier: currentTier, isActive, subscription } = useSubscription()
  const { createCheckoutSession, openCustomerPortal } = useCheckout()

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const plansRef = useRef<HTMLDivElement>(null)

  const currentOrder = TIER_ORDER[currentTier || 'free'] ?? 0
  const paidPlans = PLAN_DEFS.filter((p) => p.id !== 'free')

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const handleSelectPlan = async (tierId: SubscriptionTier) => {
    setCheckoutLoading(tierId)
    try {
      await createCheckoutSession(tierId)
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      await openCustomerPortal()
    } finally {
      setPortalLoading(false)
    }
  }

  const enterpriseMailto = "mailto:support@shoporu.com?subject=Enterprise%20Plan%20Anfrage&body=Hallo%20TMS%20Solvado-Team%2C%0A%0Aich%20interessiere%20mich%20f%C3%BCr%20den%20Enterprise-Plan%20und%20w%C3%BCrde%20gerne%20mehr%20%C3%BCber%20die%20M%C3%B6glichkeiten%20und%20Konditionen%20erfahren.%0A%0AShop-Name%3A%20%0AErwartetes%20Bestellvolumen%2FMonat%3A%20%0A%0AMit%20freundlichen%20Gr%C3%BC%C3%9Fen"

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="text-xl font-bold text-white">
            TMS <span className="text-violet-500">Solvado</span>
          </Link>
          {user ? (
            <Link to="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
              Zurück zum Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary">Anmelden</Link>
          )}
        </div>
      </header>

      {/* ============================================= */}
      {/* HERO                                          */}
      {/* ============================================= */}
      <section className="relative overflow-hidden bg-zinc-800">
        {/* Subtle gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-500/8 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-20 sm:pb-24">
          <div className="flex items-start justify-between gap-10">
            <div className="max-w-2xl">
              {/* Status line */}
              {currentTier && isActive && (
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-6">
                  {PLAN_DEFS.find((p) => p.id === currentTier)?.name || 'Free'} Plan
                  {periodEnd ? ` · Nächste Abrechnung ${periodEnd}` : ''}
                </p>
              )}

              <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-5">
                Preise
              </span>

              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.08] tracking-tight mb-5">
                Wähle deinen<br />
                <span className="text-gradient">Erfolgsplan</span>
              </h1>

              <p className="text-lg text-zinc-400 leading-relaxed max-w-lg mb-6">
                Starte klein, skaliere groß. Alle Pläne monatlich kündbar,
                ohne Vertragsbindung.
              </p>

              {/* Platform combo badge */}
              <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-zinc-800/80 border border-zinc-700/50 rounded-xl mb-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">TMS Solvado</span>
                <span className="text-zinc-600">+</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Shoporu</span>
                <span className="text-xs text-zinc-500 ml-1 hidden sm:inline">— Ein Abo, zwei Plattformen.</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {currentTier && isActive && currentTier !== 'free' ? (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Abo verwalten
                  </button>
                ) : (
                  <button
                    onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                  >
                    Plan wählen
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {subscription?.status === 'past_due' && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Zahlung fehlgeschlagen
                  </span>
                )}
              </div>
            </div>

            {/* Free plan card — positioned in hero */}
            <div className="hidden lg:block flex-shrink-0 mt-12">
              <div className={`card rounded-2xl p-6 w-[230px] ${
                currentTier === 'free' && isActive
                  ? 'border-emerald-500/30'
                  : ''
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-white">Free</h3>
                  {currentTier === 'free' && isActive && (
                    <span className="badge-success text-[10px] px-1.5 py-0.5">Aktiv</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Demo zum Erkunden</p>
                <div className="mb-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">0€</span>
                  <span className="text-xs text-zinc-500 ml-1">/mo</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Entdecke alle Features — ohne echte Funktionen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* PLAN CARDS                                    */}
      {/* ============================================= */}
      <section ref={plansRef} className="px-6 py-16 sm:py-20 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          {/* Desktop: 4 columns */}
          <div className="hidden lg:grid grid-cols-4 gap-5">
            {paidPlans.map((plan) => {
              const isCurrent = plan.id === currentTier && isActive
              const planOrder = TIER_ORDER[plan.id] ?? 0
              const isUpgrade = planOrder > currentOrder
              const isDowngrade = planOrder < currentOrder
              const isLoading = checkoutLoading === plan.id
              const isPopular = plan.popular

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${
                    isPopular
                      ? 'bg-gradient-to-b from-violet-500/20 to-violet-600/5 border-2 border-violet-500/40 shadow-glow-lg'
                      : isCurrent
                        ? 'card border-emerald-500/30'
                        : 'card hover:border-zinc-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
                  )}

                  {/* Name & Tag */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      {isPopular && (
                        <span className="badge-primary text-[10px] px-2 py-0.5">Beliebt</span>
                      )}
                      {isCurrent && (
                        <span className="badge-success text-[10px] px-2 py-0.5">Aktiv</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {plan.price >= 0 ? (
                      <>
                        <span className="text-4xl font-extrabold tracking-tight text-white">{plan.price}€</span>
                        {plan.price > 0 && <span className="text-sm text-zinc-500 ml-1">/mo</span>}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-white">Auf Anfrage</span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mb-7">
                    {isCurrent ? (
                      <div className="text-center py-2.5 text-sm font-medium text-zinc-500 border border-zinc-700 rounded-lg">
                        Aktueller Plan
                      </div>
                    ) : plan.id === 'enterprise' ? (
                      <a href={enterpriseMailto} className="btn-outline block text-center py-2.5 text-sm font-semibold rounded-lg">
                        Kontakt
                      </a>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={!!checkoutLoading}
                        className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                          isPopular
                            ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-glow'
                            : 'btn-primary'
                        }`}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgraden'}
                      </button>
                    ) : isDowngrade ? (
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={!!checkoutLoading}
                        className="btn-ghost w-full py-2.5 text-sm font-medium border border-zinc-700 rounded-lg disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Downgraden'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={!!checkoutLoading}
                        className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                          isPopular
                            ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-glow'
                            : 'btn-primary'
                        }`}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Jetzt starten'}
                      </button>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 text-sm flex-grow">
                    {MVP_FEATURES.map((f) => {
                      const val = f.values[plan.id]
                      const ok = val !== '—'
                      return (
                        <div key={f.label} className={ok ? '' : 'opacity-25'}>
                          {ok ? (
                            <span>
                              <span className="font-semibold text-white">{val}</span>{' '}
                              <span className="text-zinc-400">{f.label}</span>
                            </span>
                          ) : (
                            <span className="line-through text-zinc-600">{f.label}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Standard features — collapsible */}
                  {showAllFeatures && (
                    <div className="mt-6 pt-5 border-t border-zinc-800 space-y-2.5 text-sm text-zinc-400">
                      {STANDARD_FEATURES.map((f) => {
                        const val = f.plans[plan.id]
                        const ok = val === true || typeof val === 'string'
                        if (!ok) return null
                        return (
                          <div key={f.label} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                            <span>{f.label}{typeof val === 'string' ? ` (${val})` : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Expand toggle */}
          <div className="hidden lg:block mt-4">
            <button
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-zinc-400 hover:text-white card rounded-xl transition-colors"
            >
              {showAllFeatures ? 'Weniger anzeigen' : `Alle ${STANDARD_FEATURES.length} Features anzeigen`}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllFeatures ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Mobile: stacked */}
          <div className="lg:hidden space-y-4">
            {paidPlans.map((plan) => {
              const isCurrent = plan.id === currentTier && isActive
              const planOrder = TIER_ORDER[plan.id] ?? 0
              const isUpgrade = planOrder > currentOrder
              const isDowngrade = planOrder < currentOrder
              const isLoading = checkoutLoading === plan.id
              const isPopular = plan.popular

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 ${
                    isPopular
                      ? 'bg-gradient-to-b from-violet-500/20 to-violet-600/5 border-2 border-violet-500/40 shadow-glow'
                      : 'card'
                  }`}
                >
                  {isPopular && (
                    <span className="badge-primary text-[10px] px-2 py-0.5 mb-3 inline-block">Beliebt</span>
                  )}

                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="text-sm text-zinc-500">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      {plan.price >= 0 ? (
                        <>
                          <span className="text-2xl font-extrabold text-white">{plan.price}€</span>
                          {plan.price > 0 && <span className="text-xs text-zinc-500">/mo</span>}
                        </>
                      ) : (
                        <span className="text-base font-bold text-white">Anfrage</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-5">
                    {isCurrent ? (
                      <div className="text-center py-2 text-sm text-zinc-500 border border-zinc-700 rounded-lg">Aktueller Plan</div>
                    ) : plan.id === 'enterprise' ? (
                      <a href={enterpriseMailto} className="block text-center py-2 text-sm font-semibold border-2 border-violet-500/30 text-violet-400 rounded-lg">Kontakt</a>
                    ) : isUpgrade ? (
                      <button onClick={() => handleSelectPlan(plan.id)} disabled={!!checkoutLoading} className="w-full py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Upgraden'}
                      </button>
                    ) : isDowngrade ? (
                      <button onClick={() => handleSelectPlan(plan.id)} disabled={!!checkoutLoading} className="w-full py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg disabled:opacity-50">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Downgraden'}
                      </button>
                    ) : (
                      <button onClick={() => handleSelectPlan(plan.id)} disabled={!!checkoutLoading} className="w-full py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Jetzt starten'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {MVP_FEATURES.slice(0, 5).map((f) => {
                      const val = f.values[plan.id]
                      if (val === '—') return null
                      return (
                        <div key={f.label}>
                          <span className="font-semibold text-white">{val}</span>{' '}
                          <span className="text-zinc-400">{f.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {showAllFeatures && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2 text-sm text-zinc-400">
                      {STANDARD_FEATURES.map((f) => {
                        const val = f.plans[plan.id]
                        const ok = val === true || typeof val === 'string'
                        if (!ok) return null
                        return (
                          <div key={f.label} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                            <span>{f.label}{typeof val === 'string' ? ` (${val})` : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Free card mobile */}
            <div className={`card rounded-2xl p-6 ${
              currentTier === 'free' && isActive ? 'border-emerald-500/30' : ''
            }`}>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Free</h3>
                  {currentTier === 'free' && isActive && (
                    <span className="badge-success text-[10px] px-2 py-0.5">Aktiv</span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-white">0€<span className="text-xs text-zinc-500">/mo</span></span>
              </div>
              <p className="text-sm text-zinc-500">Demo zum Erkunden — entdecke alle Features ohne echte Funktionen.</p>
            </div>

            <button
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-zinc-400 hover:text-white card rounded-xl transition-colors"
            >
              {showAllFeatures ? 'Weniger anzeigen' : `Alle ${STANDARD_FEATURES.length} Features anzeigen`}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllFeatures ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* TRUST BADGES                                  */}
      {/* ============================================= */}
      <section className="px-6 pb-12 bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-hover flex items-center gap-3 rounded-xl px-5 py-4">
              <div className="w-9 h-9 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Sofort aktiv</p>
                <p className="text-xs text-zinc-500">Plan sofort nach Zahlung</p>
              </div>
            </div>
            <div className="card-hover flex items-center gap-3 rounded-xl px-5 py-4">
              <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Jederzeit kündbar</p>
                <p className="text-xs text-zinc-500">Keine Vertragsbindung</p>
              </div>
            </div>
            <div className="card-hover flex items-center gap-3 rounded-xl px-5 py-4">
              <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Zwei Plattformen</p>
                <p className="text-xs text-zinc-500">Solvado + Shoporu inklusive</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* COMPARISON TABLE                              */}
      {/* ============================================= */}
      <section className="px-6 pb-20 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8">
            Im Detail vergleichen
          </h2>

          <div className="overflow-x-auto -mx-6 sm:mx-0 card rounded-2xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-600">
                  <th className="text-left py-3.5 px-6 w-[280px]" />
                  {paidPlans.map((plan) => {
                    const isCurrent = plan.id === currentTier && isActive
                    return (
                      <th key={plan.id} className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-violet-400' : 'text-zinc-400'}`}>
                          {plan.name}
                        </span>
                        {isCurrent && <span className="block text-[10px] text-zinc-600 font-normal mt-0.5">Dein Plan</span>}
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {MVP_FEATURES.map((feature, i) => (
                  <tr key={feature.label} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? 'bg-zinc-800/20' : ''}`}>
                    <td className="py-3 px-6 font-medium text-zinc-200">
                      <span className="inline-flex items-center flex-wrap">{feature.label}<PlatformBadge platform={feature.platform} /></span>
                    </td>
                    {paidPlans.map((plan) => {
                      const val = feature.values[plan.id]
                      return (
                        <td key={plan.id} className={`py-3 px-4 text-center ${val !== '—' ? 'text-white font-medium' : 'text-zinc-700'}`}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                <tr>
                  <td colSpan={5} className="pt-6 pb-2 px-6">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Inklusive in allen bezahlten Plänen</span>
                  </td>
                </tr>

                {STANDARD_FEATURES.map((feature, i) => (
                  <tr key={feature.label} className={`border-b border-zinc-800/60 ${i % 2 === 0 ? 'bg-zinc-800/20' : ''}`}>
                    <td className="py-3 px-6 font-medium text-zinc-200">
                      <span className="inline-flex items-center flex-wrap">{feature.label}<PlatformBadge platform={feature.platform} /></span>
                    </td>
                    {paidPlans.map((plan) => {
                      const val = feature.plans[plan.id]
                      const ok = val === true || typeof val === 'string'
                      return (
                        <td key={plan.id} className="py-3 px-4 text-center">
                          {typeof val === 'string' ? (
                            <span className="text-zinc-300">{val}</span>
                          ) : ok ? (
                            <Check className="w-4 h-4 text-violet-500 mx-auto" />
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* FOOTER                                        */}
      {/* ============================================= */}
      <section className="border-t border-zinc-800 px-6 py-12 text-center bg-zinc-900">
        <p className="text-sm text-zinc-500">
          Fragen zu Plänen oder Enterprise-Anfragen?{' '}
          <a href="mailto:support@shoporu.com" className="link">
            support@shoporu.com
          </a>
        </p>
      </section>
    </div>
  )
}
