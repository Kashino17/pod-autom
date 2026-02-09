import { DashboardLayout } from '@src/components/layout'
import { PromptManager } from '@src/components/dashboard/PromptManager'
import { useShops, useShopSettings } from '@src/hooks/useShopify'
import { usePrompts } from '@src/hooks/usePrompts'
import { Loader2 } from 'lucide-react'

// =====================================================
// DASHBOARD PROMPTS PAGE
// =====================================================

export default function DashboardPrompts() {
  const { shops, isLoading: shopsLoading } = useShops()
  const currentShopId = shops[0]?.id || null
  const { settings, isLoading: settingsLoading } = useShopSettings(currentShopId)

  const {
    prompts,
    isLoading: promptsLoading,
    savePrompt,
    isSaving,
    resetPrompt,
  } = usePrompts(settings?.id || null)

  const isLoading = shopsLoading || settingsLoading || promptsLoading

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
      <PromptManager
        prompts={prompts}
        isLoading={isLoading}
        onSave={savePrompt}
        onReset={resetPrompt}
        isSaving={isSaving}
      />
    </DashboardLayout>
  )
}
