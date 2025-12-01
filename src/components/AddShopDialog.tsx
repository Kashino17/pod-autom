import React, { useState, useEffect } from 'react'
import { X, Store, Key, AlertCircle, Loader2, CheckCircle, ExternalLink, Pencil } from 'lucide-react'
import { useCreateShop, useUpdateShop, useTestShopifyConnection } from '../hooks/useShops'
import { Shop } from '../lib/database.types'

interface AddShopDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (shopId: string) => void
  editShop?: Shop | null  // If provided, dialog will be in edit mode
}

export function AddShopDialog({ isOpen, onClose, onSuccess, editShop }: AddShopDialogProps) {
  const isEditMode = !!editShop
  const [step, setStep] = useState<'form' | 'testing' | 'success'>('form')
  const [shopName, setShopName] = useState('')
  const [shopDomain, setShopDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createShop = useCreateShop()
  const updateShop = useUpdateShop()
  const testConnection = useTestShopifyConnection()

  // Pre-fill form when editing
  useEffect(() => {
    if (editShop) {
      setShopName(editShop.internal_name || '')
      setShopDomain(editShop.shop_domain || '')
      setAccessToken(editShop.access_token || '')
    }
  }, [editShop])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep('testing')

    try {
      // Clean up domain
      let cleanDomain = shopDomain.trim()
        .replace('https://', '')
        .replace('http://', '')
        .replace(/\/$/, '')

      if (!cleanDomain.includes('.myshopify.com')) {
        cleanDomain = `${cleanDomain}.myshopify.com`
      }

      // Test connection first
      await testConnection.mutateAsync({
        shopDomain: cleanDomain,
        accessToken: accessToken.trim()
      })

      if (isEditMode && editShop) {
        // Update existing shop
        await updateShop.mutateAsync({
          shopId: editShop.id,
          updates: {
            internal_name: shopName.trim(),
            shop_domain: cleanDomain,
            access_token: accessToken.trim(),
            connection_status: 'connected'
          }
        })

        setStep('success')

        // Auto close after success
        setTimeout(() => {
          onSuccess?.(editShop.id)
          handleClose()
        }, 1500)
      } else {
        // Create new shop in database
        const newShop = await createShop.mutateAsync({
          internal_name: shopName.trim(),
          shop_domain: cleanDomain,
          access_token: accessToken.trim(),
          connection_status: 'connected'
        })

        setStep('success')

        // Auto close after success
        setTimeout(() => {
          onSuccess?.(newShop.id)
          handleClose()
        }, 1500)
      }

    } catch (err: any) {
      setError(err.message || 'Verbindung fehlgeschlagen')
      setStep('form')
    }
  }

  const handleClose = () => {
    setStep('form')
    setShopName('')
    setShopDomain('')
    setAccessToken('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
              {isEditMode ? (
                <Pencil className="w-5 h-5 text-blue-400" />
              ) : (
                <Store className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEditMode ? 'Shop bearbeiten' : 'Shop hinzufügen'}
              </h2>
              <p className="text-sm text-zinc-400">
                {isEditMode ? 'Ändere die Shop-Einstellungen' : 'Verbinde deinen Shopify Store'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'testing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
              <p className="text-white font-medium">Verbindung wird getestet...</p>
              <p className="text-zinc-400 text-sm mt-1">Bitte warte einen Moment</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white font-medium">
                {isEditMode ? 'Shop erfolgreich aktualisiert!' : 'Shop erfolgreich verbunden!'}
              </p>
              <p className="text-zinc-400 text-sm mt-1">Du wirst weitergeleitet...</p>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-zinc-300 mb-2">
                  Shop Name
                </label>
                <input
                  id="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="z.B. Mein Fashion Store"
                  required
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
                <p className="mt-1.5 text-xs text-zinc-500">Ein interner Name für deinen Shop</p>
              </div>

              {/* Shop Domain */}
              <div>
                <label htmlFor="shopDomain" className="block text-sm font-medium text-zinc-300 mb-2">
                  Shop Domain
                </label>
                <div className="relative">
                  <input
                    id="shopDomain"
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="dein-shop.myshopify.com"
                    required
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Die .myshopify.com Domain deines Stores</p>
              </div>

              {/* Access Token */}
              <div>
                <label htmlFor="accessToken" className="block text-sm font-medium text-zinc-300 mb-2">
                  Admin API Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="accessToken"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="shpat_xxxxxxxxxxxxx"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors font-mono text-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Du findest diesen unter Settings → Apps → Develop apps →{' '}
                  <a
                    href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    Mehr erfahren
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              {/* Required Scopes Info */}
              <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                <p className="text-sm font-medium text-zinc-300 mb-3">Benötigte API Scopes:</p>

                {/* Products & Collections */}
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Produkte & Kollektionen</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['read_products', 'write_products'].map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Inventory */}
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Inventar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['read_inventory', 'write_inventory'].map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono bg-blue-500/20 text-blue-300 rounded border border-blue-500/30"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Orders & Analytics */}
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Bestellungen & Analyse</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['read_orders', 'read_analytics', 'read_reports'].map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono bg-purple-500/20 text-purple-300 rounded border border-purple-500/30"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Publishing */}
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Veröffentlichung</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['read_publications', 'write_publications'].map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono bg-amber-500/20 text-amber-300 rounded border border-amber-500/30"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Standorte</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['read_locations', 'write_locations'].map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-1 text-xs font-mono bg-pink-500/20 text-pink-300 rounded border border-pink-500/30"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-xs text-zinc-500">
                  Diese Scopes sind erforderlich für Produktverwaltung, Inventar-Tracking, Verkaufsanalysen, Multi-Channel-Publishing und Standortverwaltung.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!shopName || !shopDomain || !accessToken}
                  className={`flex-1 px-4 py-3 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors ${
                    isEditMode
                      ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50'
                  }`}
                >
                  {isEditMode ? 'Speichern' : 'Shop verbinden'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
