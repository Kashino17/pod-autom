import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =====================================================
// UI STORE
// =====================================================

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Mobile
  mobileMenuOpen: boolean

  // Theme (fuer zukuenftige Light-Mode Unterstuetzung)
  theme: 'dark' | 'light' | 'system'

  // Actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'dark',

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'pod-autom-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)

// =====================================================
// APP STORE (mit Immer fuer komplexe State Updates)
// =====================================================

interface OnboardingData {
  shopDomain: string | undefined
  selectedNiches: string[]
  prompts: {
    image: string | undefined
    title: string | undefined
    description: string | undefined
  }
  adPlatforms: string[]
}

interface AppState {
  // Onboarding
  onboardingStep: number
  onboardingData: OnboardingData
  onboardingCompleted: boolean

  // Selected Shop (fuer Dashboard)
  selectedShopId: string | null

  // Actions
  setOnboardingStep: (step: number) => void
  updateOnboardingData: (data: Partial<OnboardingData>) => void
  resetOnboarding: () => void
  setOnboardingCompleted: (completed: boolean) => void
  setSelectedShopId: (id: string | null) => void
}

const initialOnboardingData: OnboardingData = {
  shopDomain: undefined,
  selectedNiches: [],
  prompts: {
    image: undefined,
    title: undefined,
    description: undefined,
  },
  adPlatforms: [],
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial State
      onboardingStep: 1,
      onboardingData: initialOnboardingData,
      onboardingCompleted: false,
      selectedShopId: null,

      // Actions
      setOnboardingStep: (step) =>
        set((state) => {
          state.onboardingStep = step
        }),

      updateOnboardingData: (data) =>
        set((state) => {
          state.onboardingData = { ...state.onboardingData, ...data }
        }),

      resetOnboarding: () =>
        set((state) => {
          state.onboardingStep = 1
          state.onboardingData = initialOnboardingData
        }),

      setOnboardingCompleted: (completed) =>
        set((state) => {
          state.onboardingCompleted = completed
        }),

      setSelectedShopId: (id) =>
        set((state) => {
          state.selectedShopId = id
        }),
    })),
    {
      name: 'pod-autom-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        selectedShopId: state.selectedShopId,
      }),
    }
  )
)

// =====================================================
// TOAST STORE (fuer Notifications)
// =====================================================

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}))

// =====================================================
// TOAST HOOK (Simplified API)
// =====================================================

export function useToast() {
  const { addToast: addToastStore, removeToast, clearToasts, toasts } = useToastStore()

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    addToastStore({ title: message, type })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  }
}
