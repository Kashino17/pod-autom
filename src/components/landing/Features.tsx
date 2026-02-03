import {
  Wand2,
  Target,
  BarChart3,
  Rocket,
  RefreshCw,
  Shield,
  Clock,
  Cpu,
} from 'lucide-react'

const features = [
  {
    icon: Wand2,
    title: 'KI-Produkterstellung',
    description:
      'Unsere KI erstellt automatisch verkaufsstarke Designs basierend auf aktuellen Trends.',
  },
  {
    icon: Target,
    title: 'Smart Targeting',
    description:
      'Automatische Zielgruppenoptimierung fuer maximale Conversion bei minimalen Kosten.',
  },
  {
    icon: BarChart3,
    title: 'Echtzeit Analytics',
    description:
      'Verfolge deine Performance in Echtzeit und erkenne profitable Produkte sofort.',
  },
  {
    icon: Rocket,
    title: 'Winner Scaling',
    description:
      'Erfolgreiche Produkte werden automatisch erkannt und mit mehr Budget skaliert.',
  },
  {
    icon: RefreshCw,
    title: 'Auto-Replacement',
    description:
      'Nicht performende Produkte werden durch neue, vielversprechende ersetzt.',
  },
  {
    icon: Shield,
    title: 'Risiko-Management',
    description:
      'Intelligente Budget-Limits und Stopps schuetzen dich vor Verlusten.',
  },
  {
    icon: Clock,
    title: '24/7 Aktiv',
    description:
      'Das System arbeitet rund um die Uhr - auch wenn du schlaefst.',
  },
  {
    icon: Cpu,
    title: 'Multi-Platform',
    description:
      'Pinterest, Meta, Google und TikTok - alles zentral gesteuert.',
  },
]

export default function Features() {
  return (
    <section className="py-24 bg-zinc-950" id="features">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Alles was du brauchst,
            <br />
            <span className="text-gradient">automatisiert</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Modernste KI-Technologie kombiniert mit bewaehrten E-Commerce-Strategien
            fuer maximalen Erfolg.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <feature.icon className="w-6 h-6 text-violet-400" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom highlight */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-violet-500/10 border border-violet-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Bereit fuer den naechsten Schritt?
              </h3>
              <p className="text-zinc-400">
                Starte noch heute und lass die KI fuer dich arbeiten.
              </p>
            </div>
            <a href="#pricing" className="btn-primary btn-lg whitespace-nowrap">
              Plan waehlen
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
