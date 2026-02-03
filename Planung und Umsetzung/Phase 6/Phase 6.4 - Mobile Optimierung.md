# Phase 6.4 - Mobile Optimierung

## Ziel
Mobile-First Design mit PWA-Unterstützung, Touch-optimierten Komponenten und vollständiger Accessibility für Mobile-Geräte.

---

## 1. Viewport & Meta Tags

### public/index.html

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />

  <!-- Viewport für Mobile -->
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
  />

  <!-- Theme Color für Browser Chrome -->
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#8b5cf6" media="(prefers-color-scheme: light)" />

  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />

  <!-- Status Bar für iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="POD AutoM" />

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- Disable phone number detection -->
  <meta name="format-detection" content="telephone=no" />

  <title>POD AutoM</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 2. PWA Manifest (Vollständig)

### public/manifest.json

```json
{
  "name": "POD AutoM - Print on Demand Automation",
  "short_name": "POD AutoM",
  "description": "Automatisiere dein Print-on-Demand Business",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#000000",
  "theme_color": "#8b5cf6",
  "lang": "de",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Dashboard auf dem Handy"
    },
    {
      "src": "/screenshots/dashboard-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Dashboard auf dem Desktop"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/shortcut-dashboard.png", "sizes": "96x96" }]
    },
    {
      "name": "Produkte",
      "short_name": "Produkte",
      "url": "/dashboard/products",
      "icons": [{ "src": "/icons/shortcut-products.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## 3. Tailwind Mobile-First Konfiguration

### tailwind.config.js (Erweiterung)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  // ... existing config
  theme: {
    extend: {
      // Touch-freundliche Spacing
      spacing: {
        'touch': '44px',  // Minimum touch target
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },

      // Mobile Breakpoints
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Für Touch-Geräte
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
        // Für Non-Touch (Mouse)
        'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
      },

      // Mobile-optimierte Animationen
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Custom Touch Utilities
    function({ addUtilities }) {
      addUtilities({
        '.touch-target': {
          'min-height': '44px',
          'min-width': '44px',
        },
        '.safe-area-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-area-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-area-x': {
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none',
          },
        },
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.overscroll-none': {
          'overscroll-behavior': 'none',
        },
        '.h-screen-safe': {
          'height': '100dvh',
        },
      })
    },
  ],
}
```

---

## 4. Mobile Navigation mit Focus Management

### src/components/layout/MobileNav.tsx

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Menu,
  X,
  Home,
  Package,
  TrendingUp,
  Settings,
  BarChart3,
  Megaphone,
  Crown,
  Palette,
  Wand2,
  LogOut
} from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useFeatureAccess } from '@src/hooks/useFeatureAccess'
import type { Feature } from '@src/types/features.types'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  feature?: Feature
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Übersicht', icon: Home },
  { to: '/dashboard/niches', label: 'Nischen', icon: Palette },
  { to: '/dashboard/prompts', label: 'Prompts', icon: Wand2 },
  { to: '/dashboard/products', label: 'Produkte', icon: Package },
  { to: '/dashboard/campaigns', label: 'Kampagnen', icon: Megaphone },
  { to: '/dashboard/scaling', label: 'Scaling', icon: TrendingUp, feature: 'winnerScaling' },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, feature: 'advancedAnalytics' },
  { to: '/settings', label: 'Einstellungen', icon: Settings },
]

const BOTTOM_NAV_ITEMS = NAV_ITEMS.slice(0, 5) // First 5 items for bottom nav

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstFocusableRef = useRef<HTMLAnchorElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { tier } = useSubscription()

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !menuRef.current) return

      const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    // Focus first element
    firstFocusableRef.current?.focus()

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleSignOut = useCallback(async () => {
    setIsOpen(false)
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  return (
    <>
      {/* Mobile Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-zinc-800 md:hidden safe-area-top"
        role="banner"
      >
        <div className="flex items-center justify-between h-14 px-4 safe-area-x">
          <Link
            to="/dashboard"
            className="flex items-center gap-2"
            aria-label="POD AutoM - Zur Startseite"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-semibold text-lg">POD AutoM</span>
          </Link>

          <div className="flex items-center gap-2">
            {tier && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  tier === 'vip'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-primary/20 text-primary'
                }`}
                aria-label={`Aktueller Plan: ${tier.toUpperCase()}`}
              >
                {tier.toUpperCase()}
              </span>
            )}

            <button
              ref={triggerRef}
              onClick={handleToggle}
              className="touch-target flex items-center justify-center rounded-lg hover:bg-surface-highlight transition tap-highlight-none"
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? 'Menü schließen' : 'Menü öffnen'}
            >
              {isOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <nav
            ref={menuRef}
            id="mobile-menu"
            className="absolute top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-surface animate-slide-in-right safe-area-top safe-area-bottom overflow-y-auto"
          >
            <div className="p-4 pt-16">
              <h2 id="mobile-menu-title" className="sr-only">
                Hauptmenü
              </h2>

              {/* User Tier Badge */}
              {tier && (
                <div className="flex items-center gap-3 p-3 bg-surface-highlight rounded-lg mb-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{tier} Plan</p>
                    <Link
                      to="/settings#subscription"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setIsOpen(false)}
                    >
                      Plan verwalten
                    </Link>
                  </div>
                </div>
              )}

              {/* Navigation List */}
              <ul className="space-y-1" role="list">
                {NAV_ITEMS.map((item, index) => (
                  <MobileNavItem
                    key={item.to}
                    item={item}
                    isActive={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
                    onClose={() => setIsOpen(false)}
                    ref={index === 0 ? firstFocusableRef : undefined}
                  />
                ))}
              </ul>

              <div className="my-4 border-t border-zinc-800" aria-hidden="true" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition touch-target tap-highlight-none"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">Abmelden</span>
              </button>

              {/* Upgrade Banner */}
              {tier !== 'vip' && (
                <Link
                  to="/settings#subscription"
                  onClick={() => setIsOpen(false)}
                  className="block mt-6 p-4 bg-gradient-to-r from-primary/20 to-violet-600/20 border border-primary/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-amber-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Upgrade verfügbar</p>
                      <p className="text-sm text-zinc-400">Schalte mehr Features frei</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </nav>
        </div>,
        document.body
      )}

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-zinc-800 md:hidden safe-area-bottom"
        role="navigation"
        aria-label="Schnellnavigation"
      >
        <ul className="flex items-center justify-around h-16 safe-area-x" role="list">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavItem
              key={item.to}
              item={item}
              isActive={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
            />
          ))}
        </ul>
      </nav>

      {/* Spacers for fixed elements */}
      <div className="h-14 md:hidden" aria-hidden="true" /> {/* Top spacer */}
    </>
  )
}

// Sub-components with proper typing

import { forwardRef } from 'react'

interface MobileNavItemProps {
  item: NavItem
  isActive: boolean
  onClose: () => void
}

const MobileNavItem = forwardRef<HTMLAnchorElement, MobileNavItemProps>(
  ({ item, isActive, onClose }, ref) => {
    const { hasAccess } = item.feature
      ? useFeatureAccess(item.feature)
      : { hasAccess: true }

    const Icon = item.icon

    return (
      <li role="listitem">
        <Link
          ref={ref}
          to={hasAccess ? item.to : '/settings#subscription'}
          onClick={onClose}
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl transition touch-target tap-highlight-none
            ${isActive
              ? 'bg-primary text-white'
              : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
            }
            ${!hasAccess ? 'opacity-60' : ''}
          `}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <span className="flex-1 font-medium">{item.label}</span>
          {!hasAccess && (
            <span className="text-xs text-amber-400 font-medium" aria-label="Premium Feature">
              PRO
            </span>
          )}
        </Link>
      </li>
    )
  }
)

MobileNavItem.displayName = 'MobileNavItem'

interface BottomNavItemProps {
  item: NavItem
  isActive: boolean
}

function BottomNavItem({ item, isActive }: BottomNavItemProps) {
  const Icon = item.icon

  return (
    <li role="listitem">
      <Link
        to={item.to}
        className={`
          flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full px-2
          transition tap-highlight-none touch-target
          ${isActive ? 'text-primary' : 'text-zinc-500'}
        `}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
      >
        <Icon
          className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`}
          aria-hidden="true"
        />
        <span className="text-[10px] font-medium truncate">{item.label}</span>
      </Link>
    </li>
  )
}
```

---

## 5. Touch-optimierte Komponenten

### src/components/ui/TouchCard.tsx

```typescript
import { ReactNode, useState, useRef, MouseEvent, TouchEvent } from 'react'

interface TouchCardProps {
  children: ReactNode
  onClick?: () => void
  onLongPress?: () => void
  className?: string
  disabled?: boolean
}

export default function TouchCard({
  children,
  onClick,
  onLongPress,
  className = '',
  disabled = false
}: TouchCardProps) {
  const [isPressed, setIsPressed] = useState(false)
  const touchTimeout = useRef<NodeJS.Timeout>()
  const longPressTimeout = useRef<NodeJS.Timeout>()
  const isLongPress = useRef(false)

  const handlePressStart = () => {
    if (disabled) return
    isLongPress.current = false

    // Small delay to prevent flash on scroll
    touchTimeout.current = setTimeout(() => {
      setIsPressed(true)
    }, 50)

    // Long press detection
    if (onLongPress) {
      longPressTimeout.current = setTimeout(() => {
        isLongPress.current = true
        onLongPress()
        setIsPressed(false)
      }, 500)
    }
  }

  const handlePressEnd = () => {
    clearTimeout(touchTimeout.current)
    clearTimeout(longPressTimeout.current)
    setIsPressed(false)

    if (onClick && !isLongPress.current && !disabled) {
      onClick()
    }
  }

  const handlePressCancel = () => {
    clearTimeout(touchTimeout.current)
    clearTimeout(longPressTimeout.current)
    setIsPressed(false)
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onKeyDown={(e) => {
        if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`
        card transition-all duration-150 tap-highlight-none select-none
        ${onClick && !disabled ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${isPressed ? 'scale-[0.98] bg-surface-highlight' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface
        ${className}
      `}
      aria-disabled={disabled}
    >
      {children}
    </div>
  )
}
```

### src/components/ui/SwipeableListItem.tsx

```typescript
import { ReactNode, useRef, useState, TouchEvent, useCallback } from 'react'
import { Trash2, Edit2, MoreHorizontal } from 'lucide-react'

interface SwipeableListItemProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  className?: string
  threshold?: number
  maxSwipe?: number
}

export default function SwipeableListItem({
  children,
  onEdit,
  onDelete,
  editLabel = 'Bearbeiten',
  deleteLabel = 'Löschen',
  className = '',
  threshold = 60,
  maxSwipe = 160
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startTime = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startTime.current = Date.now()
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return

    const diff = e.touches[0].clientX - startX.current
    const actionWidth = onEdit && onDelete ? maxSwipe : maxSwipe / 2

    // Only allow swiping left (negative)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -actionWidth))
    } else if (translateX < 0) {
      // Allow swiping back
      setTranslateX(Math.min(0, diff + translateX))
    }
  }, [isDragging, translateX, onEdit, onDelete, maxSwipe])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    const velocity = Math.abs(translateX) / (Date.now() - startTime.current)
    const actionWidth = onEdit && onDelete ? maxSwipe : maxSwipe / 2

    // Fast swipe or past threshold
    if (velocity > 0.5 || Math.abs(translateX) > threshold) {
      setTranslateX(-actionWidth)
    } else {
      setTranslateX(0)
    }
  }, [translateX, threshold, onEdit, onDelete, maxSwipe])

  const handleAction = useCallback((action: () => void) => {
    setTranslateX(0)
    action()
  }, [])

  const handleClose = useCallback(() => {
    setTranslateX(0)
  }, [])

  const hasActions = onEdit || onDelete
  const isOpen = Math.abs(translateX) > threshold

  if (!hasActions) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      role="group"
      aria-label="Eintrag mit Wischaktionen"
    >
      {/* Action Buttons (revealed on swipe) */}
      <div
        className="absolute top-0 right-0 bottom-0 flex items-stretch"
        aria-hidden={!isOpen}
      >
        {onEdit && (
          <button
            onClick={() => handleAction(onEdit)}
            className="flex items-center justify-center w-20 bg-blue-500 text-white transition-opacity"
            tabIndex={isOpen ? 0 : -1}
            aria-label={editLabel}
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => handleAction(onDelete)}
            className="flex items-center justify-center w-20 bg-red-500 text-white transition-opacity"
            tabIndex={isOpen ? 0 : -1}
            aria-label={deleteLabel}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isOpen ? handleClose : undefined}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        className="relative bg-surface touch:cursor-grab"
      >
        {children}
      </div>

      {/* Keyboard-accessible action button */}
      <button
        className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-white md:hidden"
        onClick={() => setTranslateX(isOpen ? 0 : -(onEdit && onDelete ? maxSwipe : maxSwipe / 2))}
        aria-label="Aktionen anzeigen"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {/* SR-only action hints */}
      <div className="sr-only">
        {onEdit && <span>Nach links wischen zum Bearbeiten</span>}
        {onDelete && <span>Nach links wischen zum Löschen</span>}
      </div>
    </div>
  )
}
```

---

## 6. Responsive Table mit Accessibility

### src/components/ui/ResponsiveTable.tsx

```typescript
import { ReactNode, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
  hideOnMobile?: boolean
  mobileLabel?: string
  sortable?: boolean
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  emptyMessage?: string
  onRowClick?: (item: T) => void
  className?: string
  caption?: string
}

export default function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  emptyMessage = 'Keine Einträge vorhanden',
  onRowClick,
  className = '',
  caption
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const visibleColumns = columns.filter(col => !col.hideOnMobile)
  const hiddenColumns = columns.filter(col => col.hideOnMobile)

  if (data.length === 0) {
    return (
      <div
        className="text-center py-12 text-zinc-400"
        role="status"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="w-full" role="table">
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-sm font-medium text-zinc-400"
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={String(item[keyField])}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRowClick(item)
                  }
                }}
                className={`
                  border-b border-zinc-800/50 last:border-0
                  ${onRowClick ? 'cursor-pointer hover:bg-surface-highlight transition focus:bg-surface-highlight focus:outline-none' : ''}
                `}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : 'row'}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-3 text-sm"
                  >
                    {col.render
                      ? col.render(item)
                      : String(item[col.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div
        className={`md:hidden space-y-3 ${className}`}
        role="list"
        aria-label={caption || 'Datenliste'}
      >
        {data.map((item) => {
          const id = String(item[keyField])
          const isExpanded = expandedRows.has(id)

          return (
            <div
              key={id}
              className="card p-4 tap-highlight-none"
              role="listitem"
            >
              {/* Main Content */}
              <div
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRowClick(item)
                  }
                }}
                className={`
                  flex items-center justify-between
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                <div className="flex-1 space-y-1">
                  {visibleColumns.slice(0, 2).map((col, index) => (
                    <div
                      key={String(col.key)}
                      className={index === 0 ? 'font-medium' : 'text-sm text-zinc-400'}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? '-')}
                    </div>
                  ))}
                </div>

                {hiddenColumns.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRow(id)
                    }}
                    className="touch-target flex items-center justify-center text-zinc-400 hover:text-white"
                    aria-expanded={isExpanded}
                    aria-controls={`details-${id}`}
                    aria-label={isExpanded ? 'Details ausblenden' : 'Details anzeigen'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && hiddenColumns.length > 0 && (
                <div
                  id={`details-${id}`}
                  className="mt-3 pt-3 border-t border-zinc-800 space-y-2"
                  role="region"
                  aria-label="Zusätzliche Details"
                >
                  {hiddenColumns.map((col) => (
                    <div
                      key={String(col.key)}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-zinc-400">
                        {col.mobileLabel || col.header}
                      </span>
                      <span>
                        {col.render
                          ? col.render(item)
                          : String(item[col.key as keyof T] ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
```

---

## 7. Pull-to-Refresh

### src/hooks/usePullToRefresh.ts

```typescript
import { useRef, useCallback, useEffect, useState } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  resistance?: number
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 0.4
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return
    if (window.scrollY > 0) return

    startY.current = e.touches[0].clientY
    isPulling.current = true
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    const diff = e.touches[0].clientY - startY.current

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault()
      // Apply resistance for natural feel
      const pull = Math.min(diff * resistance, maxPull)
      setPullDistance(pull)
    }
  }, [isRefreshing, maxPull, resistance])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Hold at threshold during refresh

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isTriggered: pullDistance >= threshold
  }
}
```

### src/components/ui/PullToRefresh.tsx

```typescript
import { ReactNode } from 'react'
import { usePullToRefresh } from '@src/hooks/usePullToRefresh'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export default function PullToRefresh({
  children,
  onRefresh,
  className = ''
}: PullToRefreshProps) {
  const {
    containerRef,
    pullDistance,
    isRefreshing,
    isTriggered
  } = usePullToRefresh({
    onRefresh,
    threshold: 80
  })

  return (
    <div
      ref={containerRef}
      className={`relative overscroll-none ${className}`}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          top: -60,
          transform: `translateY(${pullDistance}px)`,
          opacity: Math.min(pullDistance / 60, 1)
        }}
        aria-hidden="true"
      >
        <div className="w-10 h-10 bg-surface-highlight rounded-full flex items-center justify-center shadow-lg">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={`w-5 h-5 transition-transform duration-200 ${
                isTriggered ? 'rotate-180 text-primary' : 'text-zinc-400'
              }`}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>

      {/* SR Announcement */}
      {isRefreshing && (
        <div className="sr-only" role="status" aria-live="polite">
          Wird aktualisiert...
        </div>
      )}
    </div>
  )
}
```

---

## 8. CSS Mobile Utilities

### src/index.css (Ergänzungen)

```css
@layer utilities {
  /* Safe Area Insets */
  .pt-safe { padding-top: env(safe-area-inset-top); }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
  .pl-safe { padding-left: env(safe-area-inset-left); }
  .pr-safe { padding-right: env(safe-area-inset-right); }

  /* Dynamic Viewport Height (accounts for mobile browser chrome) */
  .h-screen-safe {
    height: 100vh;
    height: 100dvh;
  }

  .min-h-screen-safe {
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* Touch-friendly minimum sizes */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }

  /* Tap highlight removal */
  .tap-highlight-none {
    -webkit-tap-highlight-color: transparent;
  }

  /* Prevent overscroll bounce */
  .overscroll-none {
    overscroll-behavior: none;
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Momentum scrolling for iOS */
  .scroll-momentum {
    -webkit-overflow-scrolling: touch;
  }

  /* Prevent text selection on interactive elements */
  .select-none-touch {
    -webkit-user-select: none;
    user-select: none;
  }

  /* Touch action utilities */
  .touch-pan-y { touch-action: pan-y; }
  .touch-pan-x { touch-action: pan-x; }
  .touch-pinch-zoom { touch-action: pinch-zoom; }
  .touch-manipulation { touch-action: manipulation; }
}

/* Mobile-first responsive hiding */
@layer components {
  .mobile-only {
    @apply block md:hidden;
  }

  .desktop-only {
    @apply hidden md:block;
  }
}

/* Bottom navigation spacer */
.bottom-nav-spacer {
  height: calc(64px + env(safe-area-inset-bottom));
}

/* Header spacer */
.header-spacer {
  height: calc(56px + env(safe-area-inset-top));
}
```

---

## 9. Verifizierung

### PWA Tests
- [ ] Manifest wird korrekt geladen
- [ ] Icons in allen Größen vorhanden (72-512px)
- [ ] Maskable Icons vorhanden
- [ ] App installierbar auf iOS
- [ ] App installierbar auf Android
- [ ] Shortcuts funktionieren

### Touch Tests
- [ ] Touch-Targets mindestens 44x44px
- [ ] Swipe-to-action funktioniert flüssig
- [ ] Pull-to-refresh funktioniert
- [ ] Keine Tap-Highlight-Flashes
- [ ] Scroll-Momentum auf iOS
- [ ] Keine versehentlichen Aktionen bei Scroll

### Accessibility Tests
- [ ] Focus-Trap im Mobile Menu
- [ ] Escape schließt Menu
- [ ] aria-expanded auf Toggle-Buttons
- [ ] aria-current auf aktiven Nav-Items
- [ ] SR-Announcements für Loading States
- [ ] Keyboard-Navigation möglich
- [ ] aria-label auf allen Icon-Buttons

### Responsive Tests
- [ ] Layout korrekt auf 320px Breite
- [ ] Layout korrekt auf 375px (iPhone SE)
- [ ] Layout korrekt auf 390px (iPhone 14)
- [ ] Layout korrekt auf 768px (iPad)
- [ ] Safe Areas für iPhone Notch/Dynamic Island
- [ ] Tabellen werden zu Cards auf Mobile
- [ ] Navigation wechselt zu Bottom-Bar

---

## 10. Abhängigkeiten

- Tailwind CSS 3.4+
- React 18+ mit createPortal
- Lucide React Icons
- Phase 6.3 (Feature Gating für Nav Items)

---

## 11. Nächster Schritt

→ Phase 6.5 - Performance Optimierung
