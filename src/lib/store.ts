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
      setAddShopDialogOpen: (open) => set({ isAddShopDialogOpen: open })
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
