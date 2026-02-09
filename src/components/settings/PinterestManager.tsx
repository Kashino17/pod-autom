import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Building2,
  Unlink,
} from 'lucide-react'
import { usePinterest } from '@src/hooks/usePinterest'
import { useToast } from '@src/lib/store'

// =====================================================
// PINTEREST ICON
// =====================================================

function PinterestIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  )
}

// =====================================================
// PINTEREST MANAGER COMPONENT
// =====================================================

export function PinterestManager() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToast } = useToast()
  const [showAdAccounts, setShowAdAccounts] = useState(false)

  const {
    isConnected,
    platform,
    isLoading,
    adAccounts,
    adAccountsLoading,
    connect,
    disconnect,
    isDisconnecting,
    selectAdAccount,
    isSelectingAdAccount,
    refetchAdAccounts,
    refetch,
  } = usePinterest()

  // Handle OAuth callback messages
  useEffect(() => {
    const pinterestStatus = searchParams.get('pinterest')
    const pinterestError = searchParams.get('pinterest_error')

    if (pinterestStatus === 'connected') {
      addToast('Pinterest erfolgreich verbunden!', 'success')
      setSearchParams({})
      refetch()
    }

    if (pinterestError) {
      addToast(`Pinterest Fehler: ${pinterestError}`, 'error')
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, addToast, refetch])

  const handleDisconnect = () => {
    if (confirm('Moechtest du Pinterest wirklich trennen?')) {
      disconnect()
    }
  }

  const handleSelectAdAccount = (account: { id: string; name: string }) => {
    selectAdAccount({
      ad_account_id: account.id,
      ad_account_name: account.name,
    })
    setShowAdAccounts(false)
    addToast(`Ad Account "${account.name}" ausgewaehlt`, 'success')
  }

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          <span className="text-zinc-400">Lade Pinterest Status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <PinterestIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Pinterest</h3>
              <p className="text-sm text-zinc-400">
                Veroeffentliche Pins und schalte Ads
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Verbunden</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
              <XCircle className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Nicht verbunden</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isConnected && platform ? (
          <div className="space-y-6">
            {/* Connected Account Info */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Verbundenes Konto</p>
                  <p className="text-white font-medium">
                    @{platform.platform_username || 'Unbekannt'}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Trennen
                </button>
              </div>
            </div>

            {/* Ad Account Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">Ad Account</h4>
                <button
                  onClick={() => {
                    refetchAdAccounts()
                    setShowAdAccounts(true)
                  }}
                  className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Aktualisieren
                </button>
              </div>

              {platform.ad_account_id ? (
                <div className="p-4 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="text-white font-medium">
                        {platform.ad_account_name || platform.ad_account_id}
                      </p>
                      <p className="text-xs text-zinc-500">ID: {platform.ad_account_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdAccounts(true)}
                    className="text-sm text-violet-400 hover:text-violet-300"
                  >
                    Aendern
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-amber-400 font-medium">Kein Ad Account ausgewaehlt</p>
                      <p className="text-sm text-amber-400/70 mt-1">
                        Waehle einen Ad Account, um Pinterest Ads zu schalten.
                      </p>
                      <button
                        onClick={() => setShowAdAccounts(true)}
                        className="mt-3 btn-primary text-sm py-1.5"
                      >
                        Ad Account waehlen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ad Account Selection Modal */}
            {showAdAccounts && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdAccounts(false)} />
                <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-medium text-white">Ad Account waehlen</h3>
                  </div>
                  <div className="p-4 max-h-80 overflow-y-auto">
                    {adAccountsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                      </div>
                    ) : adAccounts.length > 0 ? (
                      <div className="space-y-2">
                        {adAccounts.map((account) => (
                          <button
                            key={account.id}
                            onClick={() => handleSelectAdAccount(account)}
                            disabled={isSelectingAdAccount}
                            className={`w-full p-4 rounded-lg border text-left transition-colors ${
                              platform.ad_account_id === account.id
                                ? 'bg-violet-500/10 border-violet-500/50'
                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">{account.name}</p>
                                <p className="text-xs text-zinc-500">
                                  {account.country} - {account.currency}
                                </p>
                              </div>
                              {platform.ad_account_id === account.id && (
                                <CheckCircle className="w-5 h-5 text-violet-400" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-zinc-400">Keine Ad Accounts gefunden</p>
                        <p className="text-sm text-zinc-500 mt-1">
                          Erstelle einen Ad Account in Pinterest Business
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-zinc-800">
                    <button
                      onClick={() => setShowAdAccounts(false)}
                      className="w-full btn-secondary"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Features Info */}
            <div className="p-4 bg-zinc-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">Was du mit Pinterest machen kannst:</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Produkte automatisch als Pins veroeffentlichen
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Shopping Ads fuer deine Produkte schalten
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Performance Daten analysieren
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <PinterestIcon className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h4 className="text-xl font-medium text-white mb-2">
              Pinterest verbinden
            </h4>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Verbinde dein Pinterest Business Konto, um Produkte automatisch als Pins
              zu veroeffentlichen und Ads zu schalten.
            </p>
            <button onClick={connect} className="btn-primary">
              <ExternalLink className="w-4 h-4 mr-2" />
              Mit Pinterest verbinden
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PinterestManager
