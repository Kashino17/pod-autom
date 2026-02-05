import { useState } from 'react'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'
import { Store, Loader2, Key, HelpCircle, ExternalLink } from 'lucide-react'

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
  const [connectionMode, setConnectionMode] = useState<'domain' | 'manual'>('domain')
  const [showHelp, setShowHelp] = useState(false)

  const handleOAuthConnect = () => {
    if (!shopDomain.trim() || !user?.id) return
    startOAuthFlow(shopDomain, user.id)
  }

  // Format shop domain for display
  const formatDomain = (input: string) => {
    // Remove protocol if present
    let domain = input.replace(/^https?:\/\//, '')
    // Remove trailing slashes
    domain = domain.replace(/\/+$/, '')
    return domain
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
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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
                onClick={() => setConnectionMode('domain')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  connectionMode === 'domain'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Store className="w-4 h-4" />
                  Shop Domain
                </div>
              </button>
              <button
                onClick={() => setConnectionMode('manual')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  connectionMode === 'manual'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Key className="w-4 h-4" />
                  Manuell
                </div>
              </button>
            </div>

            {/* Domain Mode (Primary) */}
            {connectionMode === 'domain' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="shopDomain" className="label flex items-center gap-2">
                    Shop Domain
                    <button
                      type="button"
                      onClick={() => setShowHelp(!showHelp)}
                      className="text-zinc-500 hover:text-violet-400 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </label>
                  <input
                    id="shopDomain"
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(formatDomain(e.target.value))}
                    className="input"
                    placeholder="dein-shop.myshopify.com"
                  />
                </div>

                {/* Help Section */}
                {showHelp && (
                  <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-3">
                    <p className="text-sm font-medium text-violet-300">
                      📍 Wo finde ich meine Shop Domain?
                    </p>
                    <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                      <li>Gehe zu <strong>admin.shopify.com</strong></li>
                      <li>Klicke unten links auf <strong>Einstellungen</strong></li>
                      <li>Wähle <strong>Domains</strong></li>
                      <li>Deine <strong>myshopify.com</strong> Domain steht dort</li>
                    </ol>
                    <div className="pt-2 border-t border-violet-500/20">
                      <p className="text-xs text-zinc-500">
                        Beispiel: <code className="bg-zinc-800 px-1.5 py-0.5 rounded">mein-shop.myshopify.com</code>
                      </p>
                    </div>
                  </div>
                )}

                {/* Info box */}
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-sm text-zinc-300 mb-3">
                    Nach dem Verbinden erhält POD AutoM Zugriff auf:
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Produkte lesen & erstellen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Inventar verwalten
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Bestellungen lesen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Dateien hochladen
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleOAuthConnect}
                  disabled={!shopDomain.trim()}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mit Shopify verbinden
                </button>

                <p className="text-xs text-center text-zinc-500">
                  Du wirst zu Shopify weitergeleitet um die Verbindung zu bestätigen.
                </p>
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
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          ⚠️ Nur für fortgeschrittene User. Du musst einen Custom App Token in deinem Shopify Admin erstellen.
        </p>
      </div>

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
          Erstelle einen Custom App Token unter:<br />
          Settings → Apps → Develop apps → Create app
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
