# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TMS EcomPilot is a standalone E-Commerce automation web application. It provides automated product creation, ad campaign management, and winner scaling for online stores. This project uses Supabase database (using `pod_autom_*` prefixed tables for backwards compatibility).

**Tech Stack:**
- Frontend: React 19 + TypeScript 5.6 + Vite 6 + Tailwind CSS 3.4
- State: TanStack React Query 5 (server) + Zustand 5 (client)
- Auth & DB: Supabase
- Payments: Stripe
- Charts: Recharts

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3001)
npm run build        # TypeScript check + production build
npm run type-check   # TypeScript only (no build)
npm run lint         # ESLint with zero warnings
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier formatting
```

## Architecture

### Frontend Structure
```
src/
├── App.tsx              # Routes with React.lazy, ErrorBoundary, Suspense
├── pages/               # Route pages (lazy loaded)
├── components/
│   ├── layout/          # DashboardLayout, Header, Sidebar, MobileNav
│   ├── dashboard/       # Overview, NicheSelector, PromptManager, ProductQueue
│   ├── landing/         # Hero, HowItWorks, Features, Pricing, FAQ
│   ├── catalog/         # ProductCard, ProductDetailDialog, CatalogGrid
│   ├── onboarding/      # 4-step wizard components
│   ├── subscription/    # SubscriptionGate, UpgradePrompt, UsageLimits
│   ├── settings/        # AccountSettings, ShopSettings, BillingSettings
│   └── ui/              # Toast, SkipLink
├── contexts/            # AuthContext, SubscriptionContext
├── hooks/               # useShopify, usePinterest, useAnalytics, useCheckout
├── lib/                 # supabase.ts, store.ts (Zustand), constants.ts
└── types/               # TypeScript type definitions
```

### Path Aliases
Configured in both `tsconfig.json` and `vite.config.ts`:
- `@src/*` → `./src/*`
- `@components/*` → `./src/components/*`
- `@hooks/*` → `./src/hooks/*`
- `@lib/*` → `./src/lib/*`
- `@contexts/*` → `./src/contexts/*`

### Key Patterns

**Authentication Flow:**
- `AuthContext` wraps app, provides `user`, `session`, `signIn`, `signOut`
- `ProtectedRoute` / `PublicOnlyRoute` for route guarding
- Supabase handles OAuth and email auth

**Subscription Gating:**
- `SubscriptionContext` provides `tier`, `canUseFeature`, `maxNiches`, `maxProducts`
- `SubscriptionGate` component wraps premium features
- Three tiers: `basis`, `premium`, `vip` (defined in `lib/constants.ts`)

**State Management:**
- React Query for server state (shops, products, analytics)
- Zustand for client state (toasts, UI preferences)
- Queries configured with 5min staleTime, 30min gcTime

**Code Splitting:**
- All pages lazy loaded via `React.lazy()`
- Vendor chunks: react, query, ui, charts, supabase

### Database Tables (pod_autom_* prefix)
- `pod_autom_subscriptions` - User subscription state, Stripe IDs
- `pod_autom_shops` - Connected Shopify stores
- `pod_autom_settings` - Per-shop automation settings
- `pod_autom_niches` - Selected niches per shop
- `pod_autom_prompts` - AI prompts for product generation

## Environment Variables

```bash
# Required
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=              # Backend API URL

# Stripe (optional for development)
VITE_STRIPE_PUBLIC_KEY=
VITE_STRIPE_PRICE_BASIS=
VITE_STRIPE_PRICE_PREMIUM=
VITE_STRIPE_PRICE_VIP=

# App Config
VITE_APP_URL=http://localhost:3001
VITE_APP_NAME=POD AutoM
```

## TypeScript Configuration

Strict mode enabled with additional checks:
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

Common patterns to handle these:
```typescript
// Array access - use optional chaining
const first = items[0]  // Type: T | undefined

// Optional properties - use explicit undefined
interface Props {
  value?: string | undefined  // Required by exactOptionalPropertyTypes
}
```

## Language

User-facing text is in German. Code comments and commit messages in English.
