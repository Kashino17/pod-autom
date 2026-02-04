import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Tag,
  Wand2,
  TrendingUp,
  Megaphone,
  BarChart3,
  Settings,
  HelpCircle,
  X,
  Crown,
} from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// TYPES
// =====================================================

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  requiredTier?: 'basis' | 'premium' | 'vip'
}

// =====================================================
// NAV ITEMS
// =====================================================

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Übersicht',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    path: '/dashboard/niches',
    label: 'Nischen',
    icon: <Tag className="w-5 h-5" />,
  },
  {
    path: '/dashboard/prompts',
    label: 'KI-Prompts',
    icon: <Wand2 className="w-5 h-5" />,
  },
  {
    path: '/dashboard/products',
    label: 'Produkte',
    icon: <Package className="w-5 h-5" />,
  },
  {
    path: '/dashboard/campaigns',
    label: 'Kampagnen',
    icon: <Megaphone className="w-5 h-5" />,
  },
  {
    path: '/dashboard/winners',
    label: 'Winner Scaling',
    icon: <TrendingUp className="w-5 h-5" />,
    requiredTier: 'premium',
  },
  {
    path: '/dashboard/analytics',
    label: 'Analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    requiredTier: 'premium',
  },
]

const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    path: '/settings',
    label: 'Einstellungen',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    path: '/help',
    label: 'Hilfe',
    icon: <HelpCircle className="w-5 h-5" />,
  },
]

// =====================================================
// MOBILE NAV COMPONENT
// =====================================================

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation()
  const { tier, subscription } = useSubscription()

  const currentTier = tier || 'basis'

  const tierLabels = {
    basis: { name: 'Basis', color: 'text-zinc-400', bg: 'bg-zinc-700' },
    premium: { name: 'Premium', color: 'text-violet-400', bg: 'bg-violet-500/20' },
    vip: { name: 'VIP', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  }

  const tierInfo = tierLabels[currentTier]

  const hasAccess = (requiredTier?: 'basis' | 'premium' | 'vip') => {
    if (!requiredTier) return true
    const tierOrder = ['basis', 'premium', 'vip']
    const currentIndex = tierOrder.indexOf(currentTier)
    const requiredIndex = tierOrder.indexOf(requiredTier)
    return currentIndex >= requiredIndex
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path
    const canAccess = hasAccess(item.requiredTier)

    if (!canAccess) {
      return (
        <div
          key={item.path}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-zinc-600 cursor-not-allowed"
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          <Crown className="w-4 h-4 text-amber-500/50" />
        </div>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/dashboard'}
        onClick={onClose}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors touch-manipulation ${
          isActive
            ? 'bg-violet-500/20 text-violet-300'
            : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
        }`}
      >
        {item.icon}
        <span>{item.label}</span>
      </NavLink>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 h-full w-[280px] max-w-[85vw] bg-zinc-900 border-r border-zinc-800 z-50 lg:hidden flex flex-col safe-top safe-bottom">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          <span className="text-xl font-bold text-white">
            POD Auto<span className="text-violet-500">M</span>
          </span>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-white transition-colors touch-manipulation"
            aria-label="Menu schliessen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-zinc-800 space-y-1 safe-bottom">
          {BOTTOM_NAV_ITEMS.map(renderNavItem)}

          {/* Subscription Badge */}
          {subscription && (
            <div className="mt-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Plan</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${tierInfo.bg} ${tierInfo.color}`}
                >
                  {tierInfo.name}
                </span>
              </div>
              {currentTier !== 'vip' && (
                <a
                  href="/checkout"
                  className="block mt-2 py-2 text-center text-sm text-violet-400 hover:text-violet-300 active:text-violet-200 transition-colors touch-manipulation"
                >
                  Upgrade verfuegbar
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MobileNav
