import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Store,
  Plus,
} from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useShops } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface HeaderProps {
  onMenuClick: () => void
  selectedShopId: string | null
  onShopChange: (shopId: string) => void
}

// =====================================================
// HEADER COMPONENT
// =====================================================

export function Header({ onMenuClick, selectedShopId, onShopChange }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { shops } = useShops()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showShopMenu, setShowShopMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const shopMenuRef = useRef<HTMLDivElement>(null)

  const currentShop = shops.find((s) => s.id === selectedShopId) || shops[0]

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (shopMenuRef.current && !shopMenuRef.current.contains(event.target as Node)) {
        setShowShopMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 safe-top">
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors touch-manipulation"
          aria-label="Menu oeffnen"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Shop selector */}
        {shops.length > 0 && (
          <div className="relative min-w-0 flex-1 sm:flex-none" ref={shopMenuRef}>
            <button
              onClick={() => setShowShopMenu(!showShopMenu)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors touch-manipulation w-full sm:w-auto"
            >
              <Store className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span className="text-white font-medium truncate text-sm sm:text-base max-w-[100px] sm:max-w-[150px]">
                {currentShop?.internal_name || currentShop?.shop_domain || 'Shop'}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0 hidden sm:block" />
            </button>

            {/* Shop dropdown */}
            {showShopMenu && (
              <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  {shops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => {
                        onShopChange(shop.id)
                        setShowShopMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors touch-manipulation ${
                        shop.id === selectedShopId
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600'
                      }`}
                    >
                      <Store className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {shop.internal_name || shop.shop_domain}
                        </p>
                        {shop.internal_name && (
                          <p className="text-xs text-zinc-500 truncate">
                            {shop.shop_domain}
                          </p>
                        )}
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          shop.connection_status === 'connected'
                            ? 'bg-emerald-500'
                            : shop.connection_status === 'error'
                            ? 'bg-red-500'
                            : 'bg-zinc-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-700 p-2">
                  <Link
                    to="/settings"
                    onClick={() => setShowShopMenu(false)}
                    className="flex items-center gap-2 px-3 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors touch-manipulation"
                  >
                    <Plus className="w-4 h-4" />
                    Neuen Shop verbinden
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Notifications */}
        <button
          className="relative p-2.5 rounded-lg hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-white transition-colors touch-manipulation"
          aria-label="Benachrichtigungen"
        >
          <Bell className="w-5 h-5" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 active:bg-zinc-700 transition-colors touch-manipulation"
            aria-label="Benutzermenu"
          >
            <div className="w-9 h-9 sm:w-8 sm:h-8 bg-violet-500/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-violet-400" />
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400 hidden sm:block" />
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-[280px] bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50">
              {/* User info */}
              <div className="p-4 border-b border-zinc-700">
                <p className="text-white font-medium truncate text-sm sm:text-base">{user?.email}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  ID: {user?.id?.slice(0, 8)}...
                </p>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600 hover:text-white transition-colors touch-manipulation"
                >
                  <Settings className="w-4 h-4" />
                  Einstellungen
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-zinc-700 active:bg-zinc-600 hover:text-red-300 transition-colors touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
