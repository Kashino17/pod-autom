import { useState } from 'react'
import { Store, ExternalLink, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface ShopConnectionProps {
  onComplete: () => void
  onSkip?: () => void
}

// =====================================================
// SHOP CONNECTION STEP
// =====================================================

export function ShopConnection({ onComplete, onSkip }: ShopConnectionProps) {
  const { user } = useAuth()
  const { shops, isLoading, createShop, isCreating, startOAuthFlow } = useShops()

  const [connectionMode, setConnectionMode] = useState<'oauth' | 'manual'>('oauth')
  const [shopDomain, setShopDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [internalName, setInternalName] = useState('')

  const hasConnectedShop = shops.length > 0
  const connectedShop = shops[0]

  // OAuth flow
  const handleOAuthConnect = () => {
    if (!shopDomain.trim() || !user?.id) return
    startOAuthFlow(shopDomain, user.id)
  }

  // Manual connection
  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopDomain.trim() || !accessToken.trim()) return

    const shopData: {
      shop_domain: string
      access_token: string
      internal_name?: string
    } = {
      shop_domain: shopDomain,
      access_token: accessToken,
    }

    if (internalName.trim()) {
      shopData.internal_name = internalName
    }

    createShop(shopData, {
      onSuccess: () => {
        onComplete()
      },
    })
  }

  // Already have a shop connected
  if (hasConnectedShop && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Shop verbunden!</h2>
          <p className="text-zinc-400">
            Dein Shopify Store ist erfolgreich verbunden.
          </p>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                {connectedShop?.internal_name || connectedShop?.shop_domain}
              </p>
              <p className="text-sm text-zinc-500">{connectedShop?.shop_domain}</p>
            </div>
            <div className="ml-auto">
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                Verbunden
              </span>
            </div>
          </div>
        </div>

        <button onClick={onComplete} className="btn-primary w-full py-3">
          Weiter zu Schritt 2
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Shopify Store verbinden
        </h2>
        <p className="text-zinc-400">
          Verbinde deinen Shopify Store, um mit der Automatisierung zu starten.
        </p>
      </div>

      {/* Connection mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setConnectionMode('oauth')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            connectionMode === 'oauth'
              ? 'bg-violet-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            OAuth (Empfohlen)
          </div>
        </button>
        <button
          onClick={() => setConnectionMode('manual')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            connectionMode === 'manual'
              ? 'bg-violet-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Key className="w-4 h-4" />
            Access Token
          </div>
        </button>
      </div>

      {/* OAuth Mode */}
      {connectionMode === 'oauth' && (
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
              Du wirst zu Shopify weitergeleitet, um die Verbindung zu autorisieren.
              Dabei werden folgende Berechtigungen angefragt:
            </p>
            <ul className="mt-2 text-xs text-zinc-400 space-y-1">
              <li>• Produkte lesen und erstellen</li>
              <li>• Bestellungen lesen</li>
              <li>• Inventar verwalten</li>
            </ul>
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

      {/* Manual Mode */}
      {connectionMode === 'manual' && (
        <form onSubmit={handleManualConnect} className="space-y-4">
          <div>
            <label htmlFor="manualShopDomain" className="label">
              Shop Domain
            </label>
            <input
              id="manualShopDomain"
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              className="input"
              placeholder="dein-shop.myshopify.com"
              required
            />
          </div>

          <div>
            <label htmlFor="accessToken" className="label">
              Admin API Access Token
            </label>
            <input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="input"
              placeholder="shpat_..."
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Erstelle einen Custom App Token in deinem Shopify Admin unter
              Settings → Apps and sales channels → Develop apps
            </p>
          </div>

          <div>
            <label htmlFor="internalName" className="label">
              Interner Name (optional)
            </label>
            <input
              id="internalName"
              type="text"
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              className="input"
              placeholder="Mein Shop"
            />
          </div>

          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                Stelle sicher, dass dein Access Token die benötigten Berechtigungen hat:
                <span className="block mt-1 text-xs text-zinc-400">
                  read_products, write_products, read_orders, read_inventory
                </span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!shopDomain.trim() || !accessToken.trim() || isCreating}
            className="btn-primary w-full py-3"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Shop verbinden'
            )}
          </button>
        </form>
      )}

      {/* Skip option */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Später verbinden
        </button>
      )}
    </div>
  )
}

export default ShopConnection
