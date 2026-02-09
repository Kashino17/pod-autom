import { useState } from 'react'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'
import { Store, ExternalLink, Zap } from 'lucide-react'

// =====================================================
// SHOPIFY CONNECT BUTTON
// =====================================================

interface ShopifyConnectButtonProps {
  onConnected?: () => void
  className?: string
}

export function ShopifyConnectButton({
  onConnected,
  className = '',
}: ShopifyConnectButtonProps) {
  const { user } = useAuth()
  const { startOAuthFlow } = useShops()

  const [showModal, setShowModal] = useState(false)
  const [shopDomain, setShopDomain] = useState('')
  const [connectionMode, setConnectionMode] = useState<'quick' | 'domain'>('quick')

  const handleOAuthConnect = () => {
    if (!shopDomain.trim() || !user?.id) return
    startOAuthFlow(shopDomain, user.id)
  }

  // Quick install: Opens Shopify admin to select shop
  const handleQuickInstall = () => {
    if (!user?.id) return
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
    window.location.href = `${apiUrl}/api/shopify/install?user_id=${user.id}`
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`btn-primary flex items-center gap-2 ${className}`}
      >
        <Store className="w-5 h-5" />
        Shop verbinden
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Shopify Store verbinden
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Verbinde deinen Shopify Store um loszulegen.
              </p>
            </div>

            {/* Connection mode tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setConnectionMode('quick')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  connectionMode === 'quick'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4" />
                  Schnell
                </div>
              </button>
              <button
                onClick={() => setConnectionMode('domain')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  connectionMode === 'domain'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                  Domain
                </div>
              </button>
            </div>

            {/* Quick Install Mode (Recommended) */}
            {connectionMode === 'quick' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-300 font-medium mb-2">
                    Ein-Klick Installation
                  </p>
                  <p className="text-sm text-zinc-400">
                    Du wirst zu Shopify weitergeleitet und kannst dort deinen Shop auswählen.
                    Die App wird automatisch mit allen nötigen Berechtigungen installiert.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <p className="text-xs text-zinc-400 font-medium mb-2">Berechtigungen:</p>
                  <ul className="text-xs text-zinc-500 space-y-1">
                    <li>Produkte lesen & erstellen</li>
                    <li>Inventar verwalten</li>
                    <li>Bestellungen lesen</li>
                    <li>Dateien hochladen</li>
                  </ul>
                </div>

                <button
                  onClick={handleQuickInstall}
                  className="btn-primary w-full py-3 bg-emerald-500 hover:bg-emerald-600"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Jetzt mit Shopify verbinden
                </button>
              </div>
            )}

            {/* Domain Mode */}
            {connectionMode === 'domain' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="shopDomain" className="label">
                    Shop Domain
                  </label>
                  <input
                    id="shopDomain"
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="input"
                    placeholder="dein-shop.myshopify.com"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Gib deine Shopify Domain ein (z.B. dein-shop oder dein-shop.myshopify.com)
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <p className="text-sm text-violet-300">
                    Du wirst direkt zu deinem Shop weitergeleitet um die Verbindung zu autorisieren.
                  </p>
                </div>

                <button
                  onClick={handleOAuthConnect}
                  disabled={!shopDomain.trim()}
                  className="btn-primary w-full py-3"
                >
                  Mit Shopify verbinden
                </button>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// =====================================================
// EXPORTS
// =====================================================

export default ShopifyConnectButton
