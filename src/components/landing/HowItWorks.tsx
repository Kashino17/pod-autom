import { Store, Palette, Megaphone, TrendingUp, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Store,
    title: 'Shop verbinden',
    description:
      'Verbinde deinen Shopify-Store mit einem Klick. Wir kuemmern uns um den Rest.',
    color: 'violet',
  },
  {
    number: '02',
    icon: Palette,
    title: 'Nischen waehlen',
    description:
      'Waehle aus unseren profitablen Nischen oder erstelle deine eigenen.',
    color: 'violet',
  },
  {
    number: '03',
    icon: Megaphone,
    title: 'Ads aktivieren',
    description:
      'Verbinde Pinterest und/oder Meta. Wir erstellen und optimieren deine Kampagnen.',
    color: 'violet',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Gewinne einfahren',
    description:
      'Lehn dich zurueck. Unser System skaliert automatisch deine Winner-Produkte.',
    color: 'emerald',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-black" id="how-it-works">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            So funktioniert&apos;s
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            In 4 Schritten zum
            <br />
            <span className="text-gradient">passiven Einkommen</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Keine technischen Kenntnisse noetig. Unser System uebernimmt
            alles - von der Produkterstellung bis zur Werbeanzeige.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-violet-500/0 -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Card */}
                <div className="relative h-full p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1">
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                      step.color === 'emerald'
                        ? 'bg-emerald-500/10'
                        : 'bg-violet-500/10'
                    }`}
                  >
                    <step.icon
                      className={`w-7 h-7 ${
                        step.color === 'emerald'
                          ? 'text-emerald-400'
                          : 'text-violet-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (not on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-zinc-500 mb-4">
            Bereit, dein POD-Business zu automatisieren?
          </p>
          <a href="#pricing" className="btn-primary btn-lg">
            Jetzt Plan waehlen
          </a>
        </div>
      </div>
    </section>
  )
}
