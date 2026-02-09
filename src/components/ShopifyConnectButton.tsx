import { useState } from 'react'
import { Store, Loader2 } from 'lucide-react'
import { useUserProfile } from '@src/hooks/useAdmin'

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
  const { profile, updateShopifyDomain, isUpdatingDomain } = useUserProfile()

  const [showModal, setShowModal] = useState(false)
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Format domain
  const formatDomain = (domain: string): string => {
    let cleaned = domain.trim().toLowerCase()
    cleaned = cleaned.replace(/^https?:\/\//, '')
    cleaned = cleaned.replace(/\/+$/, '')
    if (!cleaned.includes('.myshopify.com')) {
      cleaned = `${cleaned}.myshopify.com`
    }
    return cleaned
  }

  // Handle domain submission
  const handleSubmit = async () => {
    setError(null)

    const formattedDomain = formatDomain(shopDomain)

    if (!formattedDomain.match(/^[a-z0-9-]+\.myshopify\.com$/)) {
      setError('Bitte gib eine gültige Shopify-Domain ein')
      return
    }

    try {
      await updateShopifyDomain(formattedDomain)
      setShowModal(false)
      setShopDomain('')
      onConnected?.()
    } catch {
      setError('Fehler beim Speichern. Bitte versuche es erneut.')
    }
  }

  // If user already has a domain pending verification
  if (profile?.shopify_domain && profile?.verification_status === 'pending') {
    return (
      <div className={`flex items-center gap-2 text-yellow-400 text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Verifizierung ausstehend
      </div>
    )
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
                Gib deine Shopify-Domain ein um mit der Verknüpfung zu beginnen.
              </p>
            </div>

            {/* Domain Input */}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  z.B. dein-shop oder dein-shop.myshopify.com
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-sm text-violet-300">
                  Nach dem Absenden wird dein Account verifiziert.
                  Sobald die Verifizierung abgeschlossen ist, erhältst du Zugang zur Shopify-Installation.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!shopDomain.trim() || isUpdatingDomain}
                className="btn-primary w-full py-3"
              >
                {isUpdatingDomain ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Domain hinterlegen'
                )}
              </button>
            </div>

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
