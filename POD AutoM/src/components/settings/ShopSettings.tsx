import { useState } from 'react'
import { Store, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react'
import { useShops, useShopSettings } from '@src/hooks/useShopify'

// =====================================================
// SHOP SETTINGS COMPONENT
// =====================================================

interface ShopSettingsProps {
  shopId: string
}

export function ShopSettings({ shopId }: ShopSettingsProps) {
  const { shops, deleteShop, isDeleting, testConnection, isTesting } = useShops()
  const { settings, updateSettings, isUpdating } = useShopSettings(shopId)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const shop = shops.find((s) => s.id === shopId)

  if (!shop) {
    return (
      <div className="p-6 text-center text-zinc-400">
        Shop nicht gefunden
      </div>
    )
  }

  const handleToggleEnabled = () => {
    if (!settings) return
    updateSettings({ enabled: !settings.enabled })
  }

  const handleUpdateSetting = (key: string, value: unknown) => {
    updateSettings({ [key]: value })
  }

  const handleDelete = () => {
    deleteShop(shopId)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="space-y-6">
      {/* Shop Info Card */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {shop.internal_name || shop.shop_domain}
              </h3>
              <p className="text-sm text-zinc-400">{shop.shop_domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                shop.connection_status === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : shop.connection_status === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {shop.connection_status === 'connected' && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verbunden
                </span>
              )}
              {shop.connection_status === 'error' && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Fehler
                </span>
              )}
              {shop.connection_status === 'disconnected' && 'Getrennt'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-700">
          <button
            onClick={() => testConnection(shopId)}
            disabled={isTesting}
            className="btn-secondary text-sm"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Verbindung testen
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary text-sm text-red-400 hover:text-red-300 hover:border-red-500/50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Entfernen
          </button>
        </div>
      </div>

      {/* Automation Settings */}
      {settings && (
        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Automatisierung
          </h3>

          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Automatisierung aktiv</p>
                <p className="text-sm text-zinc-400">
                  Produkte werden automatisch erstellt und optimiert
                </p>
              </div>
              <button
                onClick={handleToggleEnabled}
                disabled={isUpdating}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-violet-500' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto Publish */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Auto-Publish</p>
                <p className="text-sm text-zinc-400">
                  Produkte automatisch als Aktiv veröffentlichen
                </p>
              </div>
              <button
                onClick={() => handleUpdateSetting('auto_publish', !settings.auto_publish)}
                disabled={isUpdating}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.auto_publish ? 'bg-violet-500' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.auto_publish ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Creation Limit */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Produkte pro Tag</p>
                <p className="text-sm text-zinc-400">
                  Maximale Anzahl neuer Produkte pro Tag
                </p>
              </div>
              <select
                value={settings.creation_limit}
                onChange={(e) => handleUpdateSetting('creation_limit', parseInt(e.target.value))}
                className="input w-24 text-center"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Image Quality */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Bildqualität</p>
                <p className="text-sm text-zinc-400">
                  Qualität der generierten Bilder
                </p>
              </div>
              <select
                value={settings.gpt_image_quality}
                onChange={(e) => handleUpdateSetting('gpt_image_quality', e.target.value)}
                className="input w-32"
              >
                <option value="LOW">Niedrig</option>
                <option value="MEDIUM">Mittel</option>
                <option value="HIGH">Hoch</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Settings */}
      {settings && (
        <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Preise
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Standardpreis (€)</label>
              <input
                type="number"
                value={settings.default_price}
                onChange={(e) => handleUpdateSetting('default_price', parseFloat(e.target.value))}
                className="input"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="label">Vergleichspreis (€)</label>
              <input
                type="number"
                value={settings.default_compare_at_price || ''}
                onChange={(e) =>
                  handleUpdateSetting(
                    'default_compare_at_price',
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                className="input"
                step="0.01"
                min="0"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              Shop entfernen?
            </h3>
            <p className="text-zinc-400 mb-6">
              Bist du sicher, dass du diesen Shop entfernen möchtest? Alle
              Einstellungen und Daten werden gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Ja, entfernen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopSettings
