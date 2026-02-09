# Phase 3.1 - Dashboard Layout (Sidebar + Header)

## Ziel
Erstellen des Haupt-Layouts für das Dashboard mit Navigation, Shop-Auswahl und responsivem Design.

## Übersicht

### Layout-Struktur
```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar]  │        [Header mit Shop-Selector]         │
│             │─────────────────────────────────────────── │
│  Logo       │                                           │
│  ─────────  │        [Main Content Area]                │
│  Navigation │                                           │
│  Items      │        - Overview                         │
│             │        - Nischen                          │
│  ─────────  │        - Prompts                          │
│  Plan Badge │        - Produkte                         │
│  ─────────  │        - Kampagnen                        │
│  Settings   │        - Analytics                        │
│  Logout     │                                           │
└─────────────┴───────────────────────────────────────────┘
```

---

## Store-Erweiterung

### src/lib/store.ts (Dashboard State)

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Shop Selection
  selectedShopId: string | null
  setSelectedShopId: (id: string | null) => void

  // Quick Search
  quickSearchOpen: boolean
  setQuickSearchOpen: (open: boolean) => void

  // Notifications
  notificationPanelOpen: boolean
  setNotificationPanelOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Sidebar - default open on desktop
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Shop Selection
      selectedShopId: null,
      setSelectedShopId: (id) => set({ selectedShopId: id }),

      // Quick Search
      quickSearchOpen: false,
      setQuickSearchOpen: (open) => set({ quickSearchOpen: open }),

      // Notifications
      notificationPanelOpen: false,
      setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
    }),
    {
      name: 'pod-autom-app-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        selectedShopId: state.selectedShopId,
      }),
    }
  )
)
```

---

## Komponenten

### 1. src/components/layout/Sidebar.tsx

```typescript
import { useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useAppStore } from '@src/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  LayoutDashboard,
  Palette,
  Wand2,
  Package,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown,
  HelpCircle
} from 'lucide-react'

// Tooltip für kollabierte Sidebar
import { Tooltip } from '@src/components/ui/Tooltip'

const navItems = [
  { path: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { path: '/dashboard/niches', label: 'Nischen', icon: Palette },
  { path: '/dashboard/prompts', label: 'Prompts', icon: Wand2 },
  { path: '/dashboard/products', label: 'Produkte', icon: Package },
  { path: '/dashboard/campaigns', label: 'Kampagnen', icon: Megaphone },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
] as const

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { tier } = useSubscription()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore()
  const sidebarRef = useRef<HTMLElement>(null)

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          toggleSidebar()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleKeyNavigation = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }

  // Animation variants
  const sidebarVariants = {
    open: { width: 256 },
    closed: { width: 80 }
  }

  return (
    <motion.aside
      ref={sidebarRef}
      initial={false}
      animate={sidebarOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-surface border-r border-zinc-800 flex flex-col z-40"
      role="navigation"
      aria-label="Hauptnavigation"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
          aria-label="POD AutoM Dashboard"
        >
          <Zap className="w-8 h-8 text-primary flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xl font-bold whitespace-nowrap overflow-hidden"
              >
                POD AutoM
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label={sidebarOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" role="menubar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

          const linkContent = (
            <Link
              to={item.path}
              role="menuitem"
              tabIndex={0}
              aria-current={isActive ? 'page' : undefined}
              onKeyDown={(e) => handleKeyNavigation(e, item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )

          // Show tooltip when sidebar is collapsed
          if (!sidebarOpen) {
            return (
              <Tooltip key={item.path} content={item.label} side="right">
                {linkContent}
              </Tooltip>
            )
          }

          return <div key={item.path}>{linkContent}</div>
        })}
      </nav>

      {/* Subscription Badge */}
      <AnimatePresence>
        {tier && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mb-4"
          >
            <Link
              to="/settings#subscription"
              className={`block p-3 rounded-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                tier === 'vip'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30'
                  : tier === 'premium'
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-surface-highlight border border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className={`w-4 h-4 ${
                  tier === 'vip' ? 'text-amber-400' : 'text-primary'
                }`} />
                <span className="text-sm font-medium capitalize">{tier} Plan</span>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Actions */}
      <div className="border-t border-zinc-800 p-3 space-y-1">
        {/* Help Link */}
        <Tooltip content="Hilfe & Support" side="right" disabled={sidebarOpen}>
          <Link
            to="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight transition focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Hilfe</span>}
          </Link>
        </Tooltip>

        {/* Settings */}
        <Tooltip content="Einstellungen" side="right" disabled={sidebarOpen}>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              location.pathname === '/settings'
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Einstellungen</span>}
          </Link>
        </Tooltip>

        {/* Logout */}
        <Tooltip content="Abmelden" side="right" disabled={sidebarOpen}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Abmelden</span>}
          </button>
        </Tooltip>
      </div>

      {/* Keyboard Shortcut Hint */}
      {sidebarOpen && (
        <div className="px-6 pb-3">
          <p className="text-xs text-zinc-600">
            Tipp: <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500">[</kbd> zum Ein-/Ausklappen
          </p>
        </div>
      )}
    </motion.aside>
  )
}
```

---

### 2. src/components/ui/Tooltip.tsx (NEU)

```typescript
import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  children: ReactNode
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
  delay?: number
}

export function Tooltip({
  children,
  content,
  side = 'top',
  disabled = false,
  delay = 300
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2'
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-zinc-900 border border-zinc-700 rounded-md shadow-lg whitespace-nowrap pointer-events-none ${positions[side]}`}
            role="tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

### 3. src/components/layout/Header.tsx

```typescript
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  User,
  ChevronDown,
  Store,
  Check,
  Search,
  Command,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle
} from 'lucide-react'

interface HeaderProps {
  title?: string
}

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: shops, isLoading: shopsLoading } = useShops()
  const {
    sidebarOpen,
    selectedShopId,
    setSelectedShopId,
    quickSearchOpen,
    setQuickSearchOpen,
    notificationPanelOpen,
    setNotificationPanelOpen
  } = useAppStore()

  const [shopDropdownOpen, setShopDropdownOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const shopDropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const connectedShops = shops?.filter(s => s.connection_status === 'connected') || []
  const selectedShop = connectedShops.find(s => s.id === selectedShopId) || connectedShops[0]

  // Auto-select first shop
  useEffect(() => {
    if (connectedShops.length > 0 && !selectedShopId) {
      setSelectedShopId(connectedShops[0].id)
    }
  }, [connectedShops, selectedShopId, setSelectedShopId])

  // Keyboard shortcut: Cmd/Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setQuickSearchOpen])

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(e.target as Node)) {
        setShopDropdownOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation for dropdowns
  const handleDropdownKeyDown = useCallback((
    e: React.KeyboardEvent,
    isOpen: boolean,
    setOpen: (open: boolean) => void
  ) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(!isOpen)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-6">
        {/* Left: Title + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-xl font-semibold">{title}</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Search Button */}
          <button
            onClick={() => setQuickSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-highlight rounded-lg text-sm text-zinc-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Schnellsuche öffnen"
          >
            <Search className="w-4 h-4" />
            <span>Suchen...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 rounded text-xs">
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          </button>

          {/* Shop Selector */}
          {connectedShops.length > 0 && (
            <div className="relative" ref={shopDropdownRef}>
              <button
                onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
                onKeyDown={(e) => handleDropdownKeyDown(e, shopDropdownOpen, setShopDropdownOpen)}
                aria-expanded={shopDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Shop auswählen"
                className="flex items-center gap-2 px-3 py-2 bg-surface-highlight rounded-lg hover:bg-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Store className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium max-w-[120px] truncate hidden sm:block">
                  {shopsLoading ? (
                    <span className="animate-pulse">Laden...</span>
                  ) : (
                    selectedShop?.internal_name || selectedShop?.shop_domain || 'Shop wählen'
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${shopDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {shopDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-surface border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
                    role="listbox"
                    aria-label="Verfügbare Shops"
                  >
                    <div className="p-2">
                      <p className="text-xs text-zinc-500 px-2 py-1 font-medium uppercase tracking-wider">
                        Shops ({connectedShops.length})
                      </p>
                      {connectedShops.map((shop, index) => (
                        <button
                          key={shop.id}
                          role="option"
                          aria-selected={shop.id === selectedShop?.id}
                          onClick={() => {
                            setSelectedShopId(shop.id)
                            setShopDropdownOpen(false)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedShopId(shop.id)
                              setShopDropdownOpen(false)
                            }
                          }}
                          tabIndex={0}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                            shop.id === selectedShop?.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-surface-highlight'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            shop.id === selectedShop?.id
                              ? 'bg-primary/20'
                              : 'bg-surface-highlight'
                          }`}>
                            <Store className="w-4 h-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium truncate">
                              {shop.internal_name || shop.shop_domain}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {shop.shop_domain}
                            </p>
                          </div>
                          {shop.id === selectedShop?.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-zinc-800 p-2">
                      <Link
                        to="/settings#shop"
                        onClick={() => setShopDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-surface-highlight transition"
                      >
                        <Settings className="w-4 h-4" />
                        Shops verwalten
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Notifications */}
          <button
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
            className="relative p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Benachrichtigungen"
            aria-expanded={notificationPanelOpen}
          >
            <Bell className="w-5 h-5" />
            {/* Unread indicator */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" aria-label="Ungelesene Benachrichtigungen" />
          </button>

          {/* Profile */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              onKeyDown={(e) => handleDropdownKeyDown(e, profileDropdownOpen, setProfileDropdownOpen)}
              aria-expanded={profileDropdownOpen}
              aria-haspopup="menu"
              aria-label="Profil-Menü"
              className="flex items-center gap-2 p-1 hover:bg-surface-highlight rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform hidden sm:block ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-surface border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
                  role="menu"
                >
                  {/* User Info */}
                  <div className="p-3 border-b border-zinc-800">
                    <p className="font-medium truncate">{displayName}</p>
                    <p className="text-sm text-zinc-400 truncate">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2" role="none">
                    <Link
                      to="/settings#account"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-highlight transition"
                    >
                      <User className="w-4 h-4 text-zinc-400" />
                      Profil
                    </Link>
                    <Link
                      to="/settings#subscription"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-highlight transition"
                    >
                      <CreditCard className="w-4 h-4 text-zinc-400" />
                      Abo verwalten
                    </Link>
                    <Link
                      to="/help"
                      role="menuitem"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-highlight transition"
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-400" />
                      Hilfe & Support
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-zinc-800 p-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        handleSignOut()
                      }}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-red-500/10 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Abmelden
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
```

---

### 4. src/components/layout/QuickSearch.tsx (NEU)

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@src/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  LayoutDashboard,
  Palette,
  Wand2,
  Package,
  Megaphone,
  BarChart3,
  Settings,
  ArrowRight,
  FileText
} from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  description: string
  icon: typeof LayoutDashboard
  path: string
  category: 'page' | 'action' | 'product'
}

const defaultResults: SearchResult[] = [
  { id: 'dashboard', title: 'Übersicht', description: 'Dashboard anzeigen', icon: LayoutDashboard, path: '/dashboard', category: 'page' },
  { id: 'niches', title: 'Nischen', description: 'Nischen verwalten', icon: Palette, path: '/dashboard/niches', category: 'page' },
  { id: 'prompts', title: 'Prompts', description: 'KI-Prompts bearbeiten', icon: Wand2, path: '/dashboard/prompts', category: 'page' },
  { id: 'products', title: 'Produkte', description: 'Produkt-Queue anzeigen', icon: Package, path: '/dashboard/products', category: 'page' },
  { id: 'campaigns', title: 'Kampagnen', description: 'Werbekampagnen verwalten', icon: Megaphone, path: '/dashboard/campaigns', category: 'page' },
  { id: 'analytics', title: 'Analytics', description: 'Statistiken & Reports', icon: BarChart3, path: '/dashboard/analytics', category: 'page' },
  { id: 'settings', title: 'Einstellungen', description: 'Konto & Abo verwalten', icon: Settings, path: '/settings', category: 'page' },
]

export default function QuickSearch() {
  const navigate = useNavigate()
  const { quickSearchOpen, setQuickSearchOpen } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>(defaultResults)

  // Focus input when opened
  useEffect(() => {
    if (quickSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [quickSearchOpen])

  // Filter results
  useEffect(() => {
    if (!query) {
      setResults(defaultResults)
      return
    }

    const filtered = defaultResults.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase())
    )
    setResults(filtered)
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigate(results[selectedIndex].path)
      setQuickSearchOpen(false)
    } else if (e.key === 'Escape') {
      setQuickSearchOpen(false)
    }
  }, [results, selectedIndex, navigate, setQuickSearchOpen])

  if (!quickSearchOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={() => setQuickSearchOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Search Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-surface border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Schnellsuche"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Search className="w-5 h-5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Seite oder Aktion suchen..."
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-zinc-500"
              aria-label="Suchbegriff"
              autoComplete="off"
            />
            <button
              onClick={() => setQuickSearchOpen(false)}
              className="p-1 text-zinc-400 hover:text-white transition"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {results.length > 0 ? (
              <ul className="p-2" role="listbox">
                {results.map((result, index) => (
                  <li key={result.id} role="option" aria-selected={index === selectedIndex}>
                    <button
                      onClick={() => {
                        navigate(result.path)
                        setQuickSearchOpen(false)
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                        index === selectedIndex
                          ? 'bg-primary/10 text-white'
                          : 'hover:bg-surface-highlight'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        index === selectedIndex ? 'bg-primary/20' : 'bg-surface-highlight'
                      }`}>
                        <result.icon className={`w-5 h-5 ${
                          index === selectedIndex ? 'text-primary' : 'text-zinc-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-zinc-400">{result.description}</p>
                      </div>
                      {index === selectedIndex && (
                        <ArrowRight className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-zinc-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Keine Ergebnisse für "{query}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                Navigieren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                Auswählen
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd>
                Schließen
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
```

---

### 5. src/components/layout/MobileNav.tsx

```typescript
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Menu,
  X,
  LayoutDashboard,
  Palette,
  Wand2,
  Package,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Store,
  Bell
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { path: '/dashboard/niches', label: 'Nischen', icon: Palette },
  { path: '/dashboard/prompts', label: 'Prompts', icon: Wand2 },
  { path: '/dashboard/products', label: 'Produkte', icon: Package },
  { path: '/dashboard/campaigns', label: 'Kampagnen', icon: Megaphone },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
] as const

// Bottom Tab Bar items (nur 5 wegen Platz)
const bottomNavItems = navItems.slice(0, 5)

export default function MobileNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: shops } = useShops()
  const { selectedShopId } = useAppStore()

  const connectedShops = shops?.filter(s => s.connection_status === 'connected') || []
  const selectedShop = connectedShops.find(s => s.id === selectedShopId) || connectedShops[0]

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleSignOut = async () => {
    setIsMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface/95 backdrop-blur-lg border-b border-zinc-800 flex items-center justify-between px-4 z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          <span className="text-lg font-bold">POD AutoM</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Shop indicator */}
          {selectedShop && (
            <div className="flex items-center gap-1 px-2 py-1 bg-surface-highlight rounded-lg text-xs text-zinc-400">
              <Store className="w-3 h-3" />
              <span className="max-w-[80px] truncate">{selectedShop.internal_name || 'Shop'}</span>
            </div>
          )}

          {/* Notifications */}
          <button
            className="relative p-2 text-zinc-400 hover:text-white"
            aria-label="Benachrichtigungen"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>

          {/* Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white"
            aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-14 right-0 bottom-0 w-72 bg-surface border-l border-zinc-800 overflow-y-auto"
              role="navigation"
              aria-label="Mobile Navigation"
            >
              <div className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}

                <hr className="border-zinc-800 my-4" />

                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Einstellungen</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Abmelden</span>
                </button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-lg border-t border-zinc-800 z-50"
        role="navigation"
        aria-label="Schnellnavigation"
      >
        <div className="h-full flex items-center justify-around px-2">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition ${
                  isActive ? 'text-primary' : 'text-zinc-500 active:text-zinc-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
```

---

### 6. src/pages/Dashboard.tsx (Layout Wrapper)

```typescript
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@src/lib/store'
import Sidebar from '@src/components/layout/Sidebar'
import Header from '@src/components/layout/Header'
import MobileNav from '@src/components/layout/MobileNav'
import QuickSearch from '@src/components/layout/QuickSearch'
import { Loader2 } from 'lucide-react'

// Lazy load tab components for code splitting
const Overview = lazy(() => import('@src/components/dashboard/Overview'))
const NicheSelector = lazy(() => import('@src/components/dashboard/NicheSelector'))
const PromptManager = lazy(() => import('@src/components/dashboard/PromptManager'))
const ProductQueue = lazy(() => import('@src/components/dashboard/ProductQueue'))
const CampaignManager = lazy(() => import('@src/components/dashboard/CampaignManager'))
const Analytics = lazy(() => import('@src/components/dashboard/Analytics'))

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

// Page wrapper for consistent layout
interface DashboardPageProps {
  title: string
  children: React.ReactNode
}

function DashboardPage({ title, children }: DashboardPageProps) {
  return (
    <>
      <Header title={title} />
      <main className="p-4 sm:p-6">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </>
  )
}

export default function Dashboard() {
  const { sidebarOpen } = useAppStore()

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Nav */}
      <MobileNav />

      {/* Quick Search Modal */}
      <QuickSearch />

      {/* Main Content */}
      <div
        className={`min-h-screen transition-all duration-200 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        } pt-14 pb-20 lg:pt-0 lg:pb-0`}
      >
        <Routes>
          <Route
            index
            element={
              <DashboardPage title="Übersicht">
                <Overview />
              </DashboardPage>
            }
          />
          <Route
            path="niches"
            element={
              <DashboardPage title="Nischen verwalten">
                <NicheSelector />
              </DashboardPage>
            }
          />
          <Route
            path="prompts"
            element={
              <DashboardPage title="KI-Prompts">
                <PromptManager />
              </DashboardPage>
            }
          />
          <Route
            path="products"
            element={
              <DashboardPage title="Produkt-Queue">
                <ProductQueue />
              </DashboardPage>
            }
          />
          <Route
            path="campaigns"
            element={
              <DashboardPage title="Kampagnen">
                <CampaignManager />
              </DashboardPage>
            }
          />
          <Route
            path="analytics"
            element={
              <DashboardPage title="Analytics">
                <Analytics />
              </DashboardPage>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  )
}
```

---

### 7. App.tsx Route Update

```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@src/contexts/AuthContext'
import { SubscriptionProvider } from '@src/contexts/SubscriptionContext'
import ProtectedRoute from '@src/components/ProtectedRoute'
import LoadingSpinner from '@src/components/ui/LoadingSpinner'

// Lazy load pages
const Landing = lazy(() => import('@src/pages/Landing'))
const Login = lazy(() => import('@src/pages/Login'))
const Register = lazy(() => import('@src/pages/Register'))
const ForgotPassword = lazy(() => import('@src/pages/ForgotPassword'))
const Onboarding = lazy(() => import('@src/pages/Onboarding'))
const Dashboard = lazy(() => import('@src/pages/Dashboard'))
const Settings = lazy(() => import('@src/pages/Settings'))
const Catalog = lazy(() => import('@src/pages/Catalog'))
const Help = lazy(() => import('@src/pages/Help'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/katalog" element={<Catalog />} />

                {/* Protected */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <Help />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
```

---

## CSS Animationen

### src/index.css (Ergänzung)

```css
/* Smooth scrollbar for sidebar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(113, 113, 122, 0.3);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(113, 113, 122, 0.5);
}

/* Hide scrollbar utility */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## Verifizierung

- [ ] Sidebar zeigt alle Navigation-Items mit Icons
- [ ] Sidebar kann mit Button oder `[`-Taste ein-/ausgeklappt werden
- [ ] Tooltips erscheinen bei eingeklappter Sidebar
- [ ] Aktiver Nav-Item ist hervorgehoben
- [ ] Sidebar-State wird im localStorage persistiert
- [ ] Header zeigt Shop-Selector mit Dropdown
- [ ] Shop-Auswahl wechselt den aktiven Shop
- [ ] Quick Search öffnet mit ⌘K
- [ ] Quick Search Navigation mit Pfeiltasten
- [ ] Benachrichtigungs-Button mit Unread-Badge
- [ ] Profil-Dropdown mit Avatar
- [ ] Keyboard-Navigation funktioniert (Tab, Enter, Escape)
- [ ] ARIA-Attribute für Screen Reader
- [ ] Mobile Header mit Logo und Menü-Button
- [ ] Mobile Slide-in Menü von rechts
- [ ] Mobile Bottom Tab Bar mit 5 Items
- [ ] Body-Scroll wird bei offenem Menü gesperrt
- [ ] Lazy Loading für Dashboard-Tabs
- [ ] Responsive Layout auf allen Breakpoints

---

## Abhängigkeiten

- Phase 1.5 (AuthContext, SubscriptionContext)
- Phase 2.2 (useShops Hook)
- framer-motion für Animationen
- Zustand für State Management

---

## Nächster Schritt
→ Phase 3.2 - Overview Tab mit Metriken
