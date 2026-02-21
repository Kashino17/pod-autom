import { useState } from 'react'
import { Store, Loader2, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react'
import { useShops } from '@src/hooks/useShopify'
import { useUserProfile } from '@src/hooks/useAdmin'

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
  const { shops, isLoading: shopsLoading } = useShops()
  const {
    profile,
    isLoading: profileLoading,
    updateShopifyDomain,
    isUpdatingDomain,
    startInstallation,
    isStartingInstallation
  } = useUserProfile()

  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isLoading = shopsLoading || profileLoading

  // Already have a connected shop
  const hasConnectedShop = shops.length > 0
  const connectedShop = shops[0]

  // Clean and format domain
  const formatDomain = (domain: string): string => {
    let cleaned = domain.trim().toLowerCase()
    // Remove protocol if present
    cleaned = cleaned.replace(/^https?:\/\//, '')
    // Remove trailing slashes
    cleaned = cleaned.replace(/\/+$/, '')
    // Add .myshopify.com if not present
    if (!cleaned.includes('.myshopify.com')) {
      cleaned = `${cleaned}.myshopify.com`
    }
    return cleaned
  }

  // Handle domain submission
  const handleSubmitDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formattedDomain = formatDomain(shopDomain)

    // Basic validation
    if (!formattedDomain.match(/^[a-z0-9-]+\.myshopify\.com$/)) {
      setError('Bitte gib eine gültige Shopify-Domain ein (z.B. mein-shop.myshopify.com)')
      return
    }

    try {
      await updateShopifyDomain(formattedDomain)
      // Domain saved successfully, user will now wait for verification
    } catch {
      setError('Fehler beim Speichern der Domain. Bitte versuche es erneut.')
    }
  }

  // Handle install button click
  const handleInstall = async () => {
    try {
      const result = await startInstallation()
      if (result.install_link) {
        window.location.href = result.install_link
      }
    } catch {
      setError('Fehler beim Starten der Installation.')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  // Already have a shop connected
  if (hasConnectedShop) {
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

  // Verified - show install button
  if (profile?.verification_status === 'verified' && profile?.shopify_install_link) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account verifiziert!</h2>
          <p className="text-zinc-400">
            Du kannst jetzt deinen Shopify Store verbinden.
          </p>
        </div>

        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Shopify App installieren</p>
              <p className="text-sm text-zinc-400">{profile.shopify_domain}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Klicke auf den Button unten, um die TMS Solvado App in deinem Shop zu installieren.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleInstall}
          disabled={isStartingInstallation}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {isStartingInstallation ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Wird geladen...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Shopify App installieren
            </>
          )}
        </button>

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

  // Verified but no install link yet
  if (profile?.verification_status === 'verified' && !profile?.shopify_install_link) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account verifiziert</h2>
          <p className="text-zinc-400">
            Dein Install-Link wird gerade vorbereitet.
          </p>
        </div>

        <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-medium">Fast geschafft!</p>
              <p className="text-sm text-zinc-400">
                Dein Install-Link wird gerade erstellt. Dies kann einen Moment dauern.
              </p>
            </div>
          </div>
        </div>

        <button onClick={onComplete} className="btn-secondary w-full py-3">
          Weiter ohne Shop-Verbindung
        </button>
      </div>
    )
  }

  // Pending verification
  if (profile?.verification_status === 'pending' && profile?.shopify_domain) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifizierung ausstehend</h2>
          <p className="text-zinc-400">
            Dein Account wird gerade verifiziert.
          </p>
        </div>

        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium">Shop-Domain hinterlegt</p>
              <p className="text-sm text-yellow-400/80 font-mono">{profile.shopify_domain}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
          <p className="text-sm text-zinc-400">
            Sobald die Verifizierung abgeschlossen ist, kannst du deinen Shopify Store verbinden.
            Du wirst per E-Mail benachrichtigt.
          </p>
        </div>

        <button onClick={onComplete} className="btn-secondary w-full py-3">
          Weiter ohne Shop-Verbindung
        </button>
      </div>
    )
  }

  // Rejected
  if (profile?.verification_status === 'rejected') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifizierung abgelehnt</h2>
          <p className="text-zinc-400">
            Leider konnte dein Account nicht verifiziert werden.
          </p>
        </div>

        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
          <p className="text-sm text-zinc-400">
            Bitte kontaktiere den Support für weitere Informationen.
          </p>
        </div>

        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Weiter ohne Shop-Verbindung
          </button>
        )}
      </div>
    )
  }

  // No domain set yet - show domain input form
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
          Gib deine Shopify-Domain ein, um mit der Verbindung zu beginnen.
        </p>
      </div>

      <form onSubmit={handleSubmitDomain} className="space-y-4">
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
            required
          />
          <p className="text-xs text-zinc-500 mt-1">
            Gib deine Shopify Domain ein (z.B. dein-shop oder dein-shop.myshopify.com)
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
          type="submit"
          disabled={!shopDomain.trim() || isUpdatingDomain}
          className="btn-primary w-full py-3"
        >
          {isUpdatingDomain ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Domain hinterlegen'
          )}
        </button>
      </form>

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
