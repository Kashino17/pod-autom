import { DashboardLayout } from '@src/components/layout'
import { NicheSelector } from '@src/components/dashboard/NicheSelector'
import { useShops, useShopSettings } from '@src/hooks/useShopify'
import { useNicheStats } from '@src/hooks/useNicheStats'
import { Loader2 } from 'lucide-react'

// =====================================================
// DASHBOARD NICHES PAGE
// =====================================================

export default function DashboardNiches() {
  const { shops, isLoading: shopsLoading } = useShops()
  const currentShopId = shops[0]?.id || null
  const { settings, isLoading: settingsLoading } = useShopSettings(currentShopId)

  const {
    niches,
    isLoading: nichesLoading,
    addNiche,
    isAdding,
    toggleNiche,
    deleteNiche,
  } = useNicheStats(settings?.id || null)

  const isLoading = shopsLoading || settingsLoading || nichesLoading

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <NicheSelector
        niches={niches}
        isLoading={isLoading}
        onAddNiche={addNiche}
        onToggleNiche={toggleNiche}
        onDeleteNiche={deleteNiche}
        isAdding={isAdding}
      />
    </DashboardLayout>
  )
}
