import { useState } from 'react'
import { Megaphone, CheckCircle, ExternalLink, Lock, Loader2 } from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// TYPES
// =====================================================

interface AdPlatformSetupProps {
  shopId: string
  onComplete: () => void
  onBack: () => void
}

interface PlatformStatus {
  pinterest: boolean
  meta: boolean
  google: boolean
}

// =====================================================
// AD PLATFORM SETUP STEP
// =====================================================

export function AdPlatformSetup({ shopId, onComplete, onBack }: AdPlatformSetupProps) {
  const { subscription } = useSubscription()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [connected] = useState<PlatformStatus>({
    pinterest: false,
    meta: false,
    google: false,
  })

  const tier = subscription?.tier || 'basis'

  // Determine which platforms are available based on tier
  const platformAccess = {
    pinterest: tier === 'basis' || tier === 'premium' || tier === 'vip',
    meta: tier === 'premium' || tier === 'vip',
    google: tier === 'vip',
  }

  const handleConnect = async (platform: 'pinterest' | 'meta' | 'google') => {
    if (!platformAccess[platform]) return

    setConnecting(platform)

    // Simulate OAuth flow - in production this would redirect to the platform
    // For now, we'll just show a simulated connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'

    switch (platform) {
      case 'pinterest':
        // Redirect to Pinterest OAuth
        window.location.href = `${apiUrl}/api/pinterest/authorize?shop_id=${shopId}`
        return
      case 'meta':
        // Redirect to Meta OAuth (placeholder)
        window.location.href = `${apiUrl}/api/meta/authorize?shop_id=${shopId}`
        return
      case 'google':
        // Redirect to Google OAuth (placeholder)
        window.location.href = `${apiUrl}/api/google/authorize?shop_id=${shopId}`
        return
    }
  }

  const platforms = [
    {
      id: 'pinterest' as const,
      name: 'Pinterest',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      ),
      description: 'Produkte als Pins veröffentlichen und Ads schalten',
      available: platformAccess.pinterest,
      tier: 'Basis',
    },
    {
      id: 'meta' as const,
      name: 'Meta (Facebook/Instagram)',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      description: 'Instagram Shopping & Facebook Ads',
      available: platformAccess.meta,
      tier: 'Premium',
    },
    {
      id: 'google' as const,
      name: 'Google',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
      description: 'Google Shopping & Performance Max',
      available: platformAccess.google,
      tier: 'VIP',
    },
  ]

  const connectedCount = Object.values(connected).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Ad-Plattformen verbinden
        </h2>
        <p className="text-zinc-400">
          Verbinde Werbeplattformen, um automatisch Ads zu schalten.
        </p>
      </div>

      {/* Platform list */}
      <div className="space-y-3">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={`p-4 rounded-xl border transition-all ${
              connected[platform.id]
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : platform.available
                ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                : 'bg-zinc-800/30 border-zinc-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  connected[platform.id]
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : platform.available
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {platform.icon}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{platform.name}</h3>
                  {!platform.available && (
                    <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {platform.tier}+
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{platform.description}</p>
              </div>

              {/* Action */}
              <div>
                {connected[platform.id] ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-sm">
                    <CheckCircle className="w-5 h-5" />
                    Verbunden
                  </span>
                ) : platform.available ? (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    {connecting === platform.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Verbinden
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 text-sm bg-zinc-800 text-zinc-500 rounded-lg cursor-not-allowed"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier upgrade hint */}
      {tier === 'basis' && (
        <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <p className="text-sm text-violet-300">
            <strong>Tipp:</strong> Upgrade auf Premium oder VIP, um weitere
            Werbeplattformen zu nutzen und deine Reichweite zu maximieren.
          </p>
        </div>
      )}

      {/* Skip info */}
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <p className="text-sm text-zinc-400">
          Du kannst die Plattformen auch später in den Einstellungen verbinden.
          Die Produkterstellung funktioniert auch ohne Werbeverbindungen.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">
          Zurück
        </button>
        <button onClick={onComplete} className="btn-primary flex-1 py-3">
          {connectedCount > 0 ? 'Abschließen' : 'Überspringen'}
        </button>
      </div>
    </div>
  )
}

export default AdPlatformSetup
