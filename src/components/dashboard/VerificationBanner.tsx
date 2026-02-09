import { Clock, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import { useUserProfile } from '@src/hooks/useAdmin'

// =====================================================
// VERIFICATION BANNER
// Shows verification status and install button when verified
// =====================================================

export function VerificationBanner() {
  const { profile, isLoading, startInstallation, isStartingInstallation } = useUserProfile()

  if (isLoading) {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          <span className="text-zinc-400">Lade Status...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Already has a connected shop - don't show banner
  if (profile.shop_connection_status === 'connected') {
    return null
  }

  // Pending verification
  if (profile.verification_status === 'pending') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Verifizierung ausstehend</h3>
            <p className="text-sm text-zinc-400">
              Dein Account wird gerade verifiziert. Sobald die Verifizierung abgeschlossen ist,
              kannst du deinen Shopify Store verbinden.
            </p>
            {profile.shopify_domain && (
              <p className="text-sm text-yellow-400/80 mt-2">
                Shop-Domain: <span className="font-mono">{profile.shopify_domain}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Rejected
  if (profile.verification_status === 'rejected') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Verifizierung abgelehnt</h3>
            <p className="text-sm text-zinc-400">
              Leider konnte dein Account nicht verifiziert werden.
              Bitte kontaktiere den Support für weitere Informationen.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Verified - show install button
  if (profile.verification_status === 'verified' && profile.shopify_install_link) {
    const handleInstall = async () => {
      try {
        const result = await startInstallation()
        if (result.install_link) {
          window.location.href = result.install_link
        }
      } catch (error) {
        console.error('Installation error:', error)
      }
    }

    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Account verifiziert!</h3>
            <p className="text-sm text-zinc-400 mb-3">
              Dein Account wurde verifiziert. Verbinde jetzt deinen Shopify Store um loszulegen.
            </p>
            {profile.shopify_domain && (
              <p className="text-sm text-emerald-400/80 mb-3">
                Shop-Domain: <span className="font-mono">{profile.shopify_domain}</span>
              </p>
            )}
            <button
              onClick={handleInstall}
              disabled={isStartingInstallation}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition-colors"
            >
              {isStartingInstallation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Shopify App installieren
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Verified but no install link yet (edge case)
  if (profile.verification_status === 'verified' && !profile.shopify_install_link) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Account verifiziert</h3>
            <p className="text-sm text-zinc-400">
              Dein Account wurde verifiziert. Der Install-Link wird gerade vorbereitet.
              Bitte warte einen Moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default VerificationBanner
