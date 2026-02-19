import {
  HelpCircle,
  Mail,
  MessageCircle,
  FileText,
  ExternalLink,
  Zap,
  Tag,
  Wand2,
  Image,
  Megaphone,
} from 'lucide-react'
import { DashboardLayout } from '@src/components/layout'

// =====================================================
// FAQ DATA
// =====================================================

const FAQ_ITEMS = [
  {
    question: 'Wie erstelle ich mein erstes Design?',
    answer:
      'Gehe zur "Motive" Seite und klicke auf "Neues Motiv erstellen". Gib einen Trend oder ein Thema ein und die KI generiert automatisch passende Designs für dich.',
  },
  {
    question: 'Wie funktioniert die Nischen-Auswahl?',
    answer:
      'Unter "Nischen" kannst du verschiedene Themenbereiche auswählen oder erstellen. Die KI verwendet diese Nischen, um relevante Designs und Produktbeschreibungen zu generieren.',
  },
  {
    question: 'Kann ich die KI-Prompts anpassen?',
    answer:
      'Ja! Unter "Prompts" kannst du die Standard-Prompts für Bilder, Titel und Beschreibungen anpassen. So erhältst du Ergebnisse, die genau zu deinem Stil passen.',
  },
  {
    question: 'Wie verbinde ich Pinterest?',
    answer:
      'Gehe zu Einstellungen > Pinterest und klicke auf "Verbinden". Du wirst zu Pinterest weitergeleitet, um die Verbindung zu autorisieren.',
  },
  {
    question: 'Was bedeuten die verschiedenen Abo-Stufen?',
    answer:
      'Basis: 5 Nischen, 50 Designs/Monat, Pinterest. Premium: 15 Nischen, 200 Designs/Monat, + Meta. VIP: Unbegrenzte Nischen & Designs, alle Plattformen.',
  },
]

// =====================================================
// FEATURE CARDS
// =====================================================

const FEATURES = [
  {
    icon: <Image className="w-5 h-5" />,
    title: 'KI-Design-Generator',
    description: 'Erstelle einzigartige Designs mit modernster KI-Technologie.',
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: 'Nischen-Management',
    description: 'Organisiere deine Produkte in profitable Nischen.',
  },
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: 'Automatische Texte',
    description: 'KI-generierte Titel und Beschreibungen für bessere Verkäufe.',
  },
  {
    icon: <Megaphone className="w-5 h-5" />,
    title: 'Ad-Automatisierung',
    description: 'Verbinde Werbeplattformen für automatische Kampagnen.',
  },
]

// =====================================================
// HELP PAGE
// =====================================================

export default function Help() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-violet-400" />
            Hilfe & Support
          </h1>
          <p className="text-zinc-400 mt-1">
            Finde Antworten auf häufige Fragen oder kontaktiere uns.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4"
            >
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center text-violet-400 mb-3">
                {feature.icon}
              </div>
              <h3 className="text-white font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            Häufige Fragen
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="border-b border-zinc-800 pb-4 last:border-0 last:pb-0"
              >
                <h3 className="text-white font-medium mb-2">{item.question}</h3>
                <p className="text-sm text-zinc-400">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Support */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  E-Mail Support
                </h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Schreib uns eine E-Mail und wir antworten innerhalb von 24 Stunden.
                </p>
                <a
                  href="mailto:support@tms-yield.de"
                  className="text-violet-400 hover:text-violet-300 text-sm font-medium flex items-center gap-1"
                >
                  support@tms-yield.de
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Schnellstart
                </h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Neu hier? Starte mit dem Onboarding-Prozess.
                </p>
                <a
                  href="/onboarding"
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
                >
                  Onboarding starten
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center text-sm text-zinc-600">
          TMS Yield v1.0.0
        </div>
      </div>
    </DashboardLayout>
  )
}
