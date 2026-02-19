import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@src/lib/utils'

const faqs = [
  {
    question: 'Was ist TMS EcomPilot?',
    answer:
      'TMS EcomPilot ist eine vollautomatisierte E-Commerce Loesung, die den gesamten Prozess von der Produkterstellung bis zur Werbeanzeige uebernimmt. Du musst nur deinen Shop verbinden und deine Nischen waehlen - den Rest erledigt unsere KI.',
  },
  {
    question: 'Brauche ich technische Vorkenntnisse?',
    answer:
      'Nein, ueberhaupt nicht! TMS EcomPilot ist so konzipiert, dass jeder es nutzen kann. Die Einrichtung dauert nur wenige Minuten und alles wird Schritt fuer Schritt erklaert. Unser Support steht dir bei Fragen jederzeit zur Verfuegung.',
  },
  {
    question: 'Welche Plattformen werden unterstuetzt?',
    answer:
      'Aktuell unterstuetzen wir Pinterest und Meta (Facebook/Instagram) Ads. Im VIP-Plan sind zusaetzlich Google Ads und TikTok Ads verfuegbar. Wir arbeiten staendig daran, weitere Plattformen hinzuzufuegen.',
  },
  {
    question: 'Wie funktioniert das Winner Scaling?',
    answer:
      'Unser System analysiert kontinuierlich die Performance deiner Produkte. Sobald ein Produkt ueberdurchschnittlich gut performt, wird es automatisch als "Winner" markiert und das Werbebudget wird erhoehit, um die Gewinne zu maximieren.',
  },
  {
    question: 'Was kostet der Fulfillment-Service?',
    answer:
      'Die Fulfillment-Kosten variieren je nach Produkt und Zielland. In unserem Katalog findest du alle Produkte mit transparenten Preisen inklusive Versand. Es gibt keine versteckten Gebuehren.',
  },
  {
    question: 'Kann ich jederzeit kuendigen?',
    answer:
      'Ja, absolut! Alle unsere Plaene sind monatlich kuendbar. Es gibt keine Mindestlaufzeit oder versteckte Kuendigungsgebuehren. Du kannst jederzeit im Dashboard kuendigen.',
  },
  {
    question: 'Wie schnell sehe ich Ergebnisse?',
    answer:
      'Die ersten Produkte werden innerhalb von 24 Stunden nach der Einrichtung erstellt. Erste Verkaeufe koennen je nach Nische und Werbebudget innerhalb der ersten Woche erfolgen. Fuer nachhaltige Ergebnisse empfehlen wir jedoch 4-8 Wochen.',
  },
  {
    question: 'Gibt es eine Geld-zurueck-Garantie?',
    answer:
      'Ja! Wir bieten eine 14-taegige Geld-zurueck-Garantie. Wenn du nicht zufrieden bist, erstatten wir dir den vollen Betrag - ohne Fragen zu stellen.',
  },
]

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left"
      >
        <span className="text-lg font-medium text-white pr-8">{question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-zinc-400 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        )}
      >
        <p className="text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-24 bg-zinc-950" id="faq">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-4">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Haeufig gestellte
            <br />
            <span className="text-gradient">Fragen</span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Alles was du wissen musst, bevor du startest.
          </p>
        </div>

        {/* FAQ List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-zinc-400 mb-4">
            Noch Fragen? Wir helfen dir gerne weiter.
          </p>
          <a
            href="mailto:support@tms-yield.de"
            className="btn-secondary"
          >
            Kontaktiere uns
          </a>
        </div>
      </div>
    </section>
  )
}
