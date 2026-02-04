import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, TrendingUp } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-black to-black" />

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 sm:mb-8">
          <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-violet-300">
            Vollautomatisiertes Print-on-Demand
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 tracking-tight">
          <span className="text-white">Dein POD-Business</span>
          <br />
          <span className="text-gradient">auf Autopilot</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl md:text-2xl text-zinc-400 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
          Von der Produkterstellung bis zur Werbeanzeige - alles automatisiert.
          <br className="hidden md:block" />
          <span className="hidden sm:inline"> </span>Starte dein passives Einkommen ohne technisches Wissen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 px-2">
          <Link
            to="/register"
            className="btn-primary btn-xl group w-full sm:w-auto touch-manipulation"
          >
            Jetzt starten
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="#pricing"
            className="btn-secondary btn-xl w-full sm:w-auto touch-manipulation"
          >
            Preise ansehen
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-2xl mx-auto">
          <div className="flex flex-col items-center p-2 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">100%</span>
            </div>
            <span className="text-xs sm:text-sm text-zinc-500">Automatisiert</span>
          </div>

          <div className="flex flex-col items-center p-2 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">24/7</span>
            </div>
            <span className="text-xs sm:text-sm text-zinc-500">Aktiv fuer dich</span>
          </div>

          <div className="flex flex-col items-center p-2 sm:p-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">KI</span>
            </div>
            <span className="text-xs sm:text-sm text-zinc-500">Powered</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-zinc-600 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-zinc-500 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
