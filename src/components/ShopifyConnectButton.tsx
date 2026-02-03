import { useState } from 'react'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'
import { Store, Loader2, ExternalLink, Key } from 'lucide-react'

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
  const [connectionMode, setConnectionMode] = useState<'oauth' | 'manual'>('oauth')

  const handleOAuthConnect = () => {
    if (!shopDomain.trim() || !user?.id) return
    startOAuthFlow(shopDomain, user.id)
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
                    <li>• Inventar lesen</li>
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
              <ManualConnectionForm
                onSuccess={() => {
                  setShowModal(false)
                  onConnected?.()
                }}
              />
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
// MANUAL CONNECTION FORM
// =====================================================

interface ManualConnectionFormProps {
  onSuccess?: () => void
}

function ManualConnectionForm({ onSuccess }: ManualConnectionFormProps) {
  const { createShop, isCreating } = useShops()

  const [shopDomain, setShopDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [internalName, setInternalName] = useState('')

  const canSubmit = shopDomain.trim() && accessToken.trim() && !isCreating

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const shopData: {
      shop_domain: string
      access_token: string
      internal_name?: string
    } = {
      shop_domain: shopDomain,
      access_token: accessToken,
    }

    if (internalName) {
      shopData.internal_name = internalName
    }

    createShop(shopData, {
      onSuccess: () => {
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          Settings &gt; Apps and sales channels &gt; Develop apps
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

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-primary w-full py-3"
      >
        {isCreating ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : (
          'Shop verbinden'
        )}
      </button>
    </form>
  )
}

// =====================================================
// EXPORTS
// =====================================================

export default ShopifyConnectButton
