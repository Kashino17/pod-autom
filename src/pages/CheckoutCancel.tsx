import { Link } from 'react-router-dom'
import { XCircle, ArrowLeft, MessageCircle, HelpCircle } from 'lucide-react'

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Cancel Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-zinc-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Zahlung abgebrochen
        </h1>

        <p className="text-zinc-400 mb-8">
          Du hast den Checkout-Prozess abgebrochen. Keine Sorge - es wurde nichts berechnet.
        </p>

        {/* Help section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-violet-400" />
            Brauchst du Hilfe?
          </h3>
          <p className="text-zinc-400 text-sm mb-4">
            Falls du Fragen zu unseren Plaenen hast oder technische Probleme beim Checkout aufgetreten sind, helfen wir dir gerne weiter.
          </p>
          <a
            href="mailto:support@tms-yield.de"
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            support@tms-yield.de
          </a>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/checkout"
            className="w-full py-4 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Erneut versuchen
          </Link>

          <Link
            to="/#pricing"
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurueck zur Preisseite
          </Link>
        </div>

        {/* Note */}
        <p className="mt-8 text-zinc-600 text-xs">
          Du kannst jederzeit ein Abonnement abschliessen, wenn du bereit bist.
        </p>
      </div>
    </div>
  )
}
