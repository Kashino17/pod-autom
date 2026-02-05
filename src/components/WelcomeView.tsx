import React from 'react'
import { Store, ArrowRight, Sparkles } from 'lucide-react'
import { useAppStore } from '../lib/store'

export function WelcomeView() {
  const { setAddShopDialogOpen } = useAppStore()

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 mb-6">
          <Sparkles className="w-10 h-10 text-emerald-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Willkommen bei ReBoss
        </h1>

        {/* Description */}
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Verbinde deinen ersten Shopify Store, um mit der automatischen
          Produktoptimierung und Kampagnenverwaltung zu beginnen.
        </p>

        {/* Add Shop Button */}
        <button
          onClick={() => setAddShopDialogOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
        >
          <Store className="w-5 h-5" />
          Shop hinzufügen
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm font-medium text-white mb-1">Automatisch</p>
            <p className="text-xs text-zinc-500">Produkte werden automatisch optimiert</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm font-medium text-white mb-1">Multi-Channel</p>
            <p className="text-xs text-zinc-500">Pinterest, Meta & Google Ads</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm font-medium text-white mb-1">Analytics</p>
            <p className="text-xs text-zinc-500">Echtzeit Verkaufsdaten</p>
          </div>
        </div>
      </div>
    </div>
  )
}
