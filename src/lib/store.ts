import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TabId } from '../../types'

interface AppState {
  // Active Shop
  activeShopId: string | null
  setActiveShopId: (id: string | null) => void

  // Active Tab
  activeTabId: TabId
  setActiveTabId: (id: TabId) => void

  // UI State
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Calculator
  isCalculatorOpen: boolean
  setCalculatorOpen: (open: boolean) => void

  // Add Shop Dialog
  isAddShopDialogOpen: boolean
  setAddShopDialogOpen: (open: boolean) => void

  // Unsaved Changes Warning
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (has: boolean) => void
  pendingTabId: TabId | null
  setPendingTabId: (id: TabId | null) => void
  showUnsavedWarning: boolean
  setShowUnsavedWarning: (show: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Active Shop
      activeShopId: null,
      setActiveShopId: (id) => set({ activeShopId: id }),

      // Active Tab
      activeTabId: 'dashboard',
      setActiveTabId: (id) => set({ activeTabId: id }),

      // UI State
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Calculator
      isCalculatorOpen: false,
      setCalculatorOpen: (open) => set({ isCalculatorOpen: open }),

      // Add Shop Dialog
      isAddShopDialogOpen: false,
      setAddShopDialogOpen: (open) => set({ isAddShopDialogOpen: open }),

      // Unsaved Changes Warning
      hasUnsavedChanges: false,
      setHasUnsavedChanges: (has) => set({ hasUnsavedChanges: has }),
      pendingTabId: null,
      setPendingTabId: (id) => set({ pendingTabId: id }),
      showUnsavedWarning: false,
      setShowUnsavedWarning: (show) => set({ showUnsavedWarning: show })
    }),
    {
      name: 'reboss-app-store',
      partialize: (state) => ({
        activeShopId: state.activeShopId,
        activeTabId: state.activeTabId,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
)
