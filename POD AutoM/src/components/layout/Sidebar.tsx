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
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// TYPES
// =====================================================

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  badge?: string
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
// SIDEBAR COMPONENT
// =====================================================

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const { tier, subscription } = useSubscription()

  const tierLabels = {
    basis: { name: 'Basis', color: 'text-zinc-400', bg: 'bg-zinc-700' },
    premium: { name: 'Premium', color: 'text-violet-400', bg: 'bg-violet-500/20' },
    vip: { name: 'VIP', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  }

  const currentTier = tier || 'basis'
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-600 cursor-not-allowed ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? `${item.label} (${item.requiredTier}+)` : undefined}
        >
          {item.icon}
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              <Crown className="w-4 h-4 text-amber-500/50" />
            </>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/dashboard'}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          isCollapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-violet-500/20 text-violet-300'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        }`}
        title={isCollapsed ? item.label : undefined}
      >
        {item.icon}
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
        {!isCollapsed && (
          <span className="text-xl font-bold text-white">
            POD Auto<span className="text-violet-500">M</span>
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(renderNavItem)}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        {BOTTOM_NAV_ITEMS.map(renderNavItem)}

        {/* Subscription Badge */}
        {!isCollapsed && subscription && (
          <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Plan</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierInfo.bg} ${tierInfo.color}`}
              >
                {tierInfo.name}
              </span>
            </div>
            {currentTier !== 'vip' && (
              <a
                href="/pricing"
                className="block mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Upgrade verfügbar
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
