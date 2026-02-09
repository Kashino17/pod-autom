import { useState, useEffect } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { SkipLink } from '@src/components/ui/SkipLink'
import { OnboardingGuard } from '@src/components/OnboardingGuard'

// =====================================================
// TYPES
// =====================================================

interface DashboardLayoutProps {
  children: React.ReactNode
}

// =====================================================
// LOCAL STORAGE HELPERS
// =====================================================

const SIDEBAR_COLLAPSED_KEY = 'pod-autom-sidebar-collapsed'
const SELECTED_SHOP_KEY = 'pod-autom-selected-shop'

function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  } catch {
    // Ignore storage errors
  }
}

function getSelectedShopId(): string | null {
  try {
    return localStorage.getItem(SELECTED_SHOP_KEY)
  } catch {
    return null
  }
}

function setSelectedShopId(shopId: string): void {
  try {
    localStorage.setItem(SELECTED_SHOP_KEY, shopId)
  } catch {
    // Ignore storage errors
  }
}

// =====================================================
// DASHBOARD LAYOUT COMPONENT
// =====================================================

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { shops } = useShops()

  const [sidebarCollapsed, setSidebarCollapsedState] = useState(getSidebarCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedShopId, setSelectedShopIdState] = useState<string | null>(getSelectedShopId)

  // Auto-select first shop if none selected
  useEffect(() => {
    const firstShop = shops[0]
    if (firstShop && !selectedShopId) {
      setSelectedShopIdState(firstShop.id)
      setSelectedShopId(firstShop.id)
    }
  }, [shops, selectedShopId])

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsedState(newState)
    setSidebarCollapsed(newState)
  }

  const handleShopChange = (shopId: string) => {
    setSelectedShopIdState(shopId)
    setSelectedShopId(shopId)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Skip Link for keyboard accessibility */}
      <SkipLink />

      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5 pointer-events-none" />

      {/* Sidebar (desktop) */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile nav */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main content area */}
      <div
        className={`relative min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          selectedShopId={selectedShopId}
          onShopChange={handleShopChange}
        />

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-6" tabIndex={-1}>
          <OnboardingGuard>{children}</OnboardingGuard>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
