import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Truck, Clock, Shield } from 'lucide-react'
import { CatalogGrid } from '@src/components/catalog'
import { useCatalog } from '@src/hooks/useCatalog'

export default function Catalog() {
  const { data, isLoading, error } = useCatalog()

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Back Link */}
            <Link
              to="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">POD AutoM</span>
            </Link>

            {/* CTA */}
            <Link to="/register" className="btn-primary text-sm">
              Jetzt starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6">
            <Package className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-400">Fulfillment Katalog</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Unsere Produktpalette
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Hochwertige Print-on-Demand Produkte von unserem Fulfillment-Partner.
            Alle Preise sind Netto-Einkaufspreise fuer POD AutoM Kunden.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Truck className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Schneller Versand</p>
                <p className="text-sm text-zinc-500">EU-weit 2-5 Tage</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Produktion</p>
                <p className="text-sm text-zinc-500">2-4 Werktage</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Qualitaetsgarantie</p>
                <p className="text-sm text-zinc-500">100% Zufriedenheit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">
                Katalog konnte nicht geladen werden
              </h3>
              <p className="text-zinc-500">
                Bitte versuche es spaeter erneut.
              </p>
            </div>
          ) : (
            <CatalogGrid
              products={data?.products ?? []}
              isLoading={isLoading}
            />
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Bereit fuer automatisiertes Print-on-Demand?
          </h2>
          <p className="text-zinc-400 mb-8">
            Mit POD AutoM erstellst du automatisch Produkte mit KI-generierten Designs
            und verkaufst sie ueber deine Shopify-Shops - vollautomatisch.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary">
              Kostenlos starten
            </Link>
            <Link to="/#how-it-works" className="btn-secondary">
              So funktioniert's
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} POD AutoM. Alle Rechte vorbehalten.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-zinc-500 hover:text-white transition-colors">
                Startseite
              </Link>
              <Link to="/pricing" className="text-sm text-zinc-500 hover:text-white transition-colors">
                Preise
              </Link>
              <Link to="/login" className="text-sm text-zinc-500 hover:text-white transition-colors">
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
