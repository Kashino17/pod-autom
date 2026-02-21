// =====================================================
// SUBSCRIPTION TIERS
// =====================================================

export const SUBSCRIPTION_TIERS = {
  basis: {
    name: 'Basis',
    price: 200,
    maxNiches: 5,
    maxProducts: 100,
    platforms: ['pinterest', 'meta'] as const, // Nur eine waehlbar
    platformLimit: 1,
    winnerScaling: false,
    advancedAnalytics: false,
    support: 'email' as const,
    features: [
      'Pinterest ODER Meta Ads',
      '5 Nischen',
      '100 Produkte/Monat',
      'Basis Analytics',
      'E-Mail Support',
    ],
  },
  premium: {
    name: 'Premium',
    price: 500,
    maxNiches: 15,
    maxProducts: 500,
    platforms: ['pinterest', 'meta'] as const, // Beide nutzbar
    platformLimit: 2,
    winnerScaling: true,
    advancedAnalytics: false,
    support: 'priority' as const,
    features: [
      'Pinterest + Meta Ads',
      '15 Nischen',
      '500 Produkte/Monat',
      'Winner Scaling',
      'Priority Support',
    ],
  },
  vip: {
    name: 'VIP',
    price: 835,
    maxNiches: -1, // Unbegrenzt
    maxProducts: -1, // Unbegrenzt
    platforms: ['pinterest', 'meta', 'google', 'tiktok'] as const,
    platformLimit: -1, // Unbegrenzt
    winnerScaling: true,
    advancedAnalytics: true,
    support: '1:1' as const,
    features: [
      'Alle Plattformen',
      'Unbegrenzte Nischen',
      'Unbegrenzte Produkte',
      'Winner Scaling',
      'Advanced Analytics',
      '1:1 Support',
    ],
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
export type SubscriptionTierData = (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]

// Simplified tier limits for SubscriptionContext
export const TIER_LIMITS: Record<SubscriptionTier, { maxNiches: number; maxProducts: number }> = {
  basis: {
    maxNiches: SUBSCRIPTION_TIERS.basis.maxNiches,
    maxProducts: SUBSCRIPTION_TIERS.basis.maxProducts,
  },
  premium: {
    maxNiches: SUBSCRIPTION_TIERS.premium.maxNiches,
    maxProducts: SUBSCRIPTION_TIERS.premium.maxProducts,
  },
  vip: {
    maxNiches: SUBSCRIPTION_TIERS.vip.maxNiches === -1 ? Infinity : SUBSCRIPTION_TIERS.vip.maxNiches,
    maxProducts: SUBSCRIPTION_TIERS.vip.maxProducts === -1 ? Infinity : SUBSCRIPTION_TIERS.vip.maxProducts,
  },
}

// =====================================================
// ROUTES
// =====================================================

export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  AUTH_CALLBACK: '/auth/callback',
  CATALOG: '/katalog',
  IMPRESSUM: '/impressum',
  DATENSCHUTZ: '/datenschutz',
  AGB: '/agb',

  // Protected
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  CHECKOUT: '/checkout',
  CHECKOUT_SUCCESS: '/checkout/success',
  CHECKOUT_CANCEL: '/checkout/cancel',

  // Dashboard Sub-Routes
  DASHBOARD_OVERVIEW: '/dashboard',
  DASHBOARD_NICHES: '/dashboard/niches',
  DASHBOARD_PROMPTS: '/dashboard/prompts',
  DASHBOARD_PRODUCTS: '/dashboard/products',
  DASHBOARD_CAMPAIGNS: '/dashboard/campaigns',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',
  DASHBOARD_WINNER_SCALING: '/dashboard/winner-scaling',
} as const

// =====================================================
// API CONFIG
// =====================================================

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3001'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'TMS Solvado'

// =====================================================
// GPT CONFIG
// =====================================================

export const GPT_IMAGE_QUALITY = ['LOW', 'MEDIUM', 'HIGH'] as const
export type GPTImageQuality = (typeof GPT_IMAGE_QUALITY)[number]

// =====================================================
// AD PLATFORMS
// =====================================================

export const AD_PLATFORMS = {
  pinterest: {
    name: 'Pinterest',
    icon: 'SiPinterest', // Icon name from simple-icons
    color: '#E60023',
    requiredTier: 'basis' as SubscriptionTier,
  },
  meta: {
    name: 'Meta (Facebook/Instagram)',
    icon: 'SiMeta',
    color: '#0082FB',
    requiredTier: 'basis' as SubscriptionTier,
  },
  google: {
    name: 'Google Ads',
    icon: 'SiGoogleads',
    color: '#4285F4',
    requiredTier: 'vip' as SubscriptionTier,
  },
  tiktok: {
    name: 'TikTok Ads',
    icon: 'SiTiktok',
    color: '#000000',
    requiredTier: 'vip' as SubscriptionTier,
  },
} as const

export type AdPlatform = keyof typeof AD_PLATFORMS

// =====================================================
// PROMPT TYPES
// =====================================================

export const PROMPT_TYPES = {
  image: {
    name: 'Bild-Prompt',
    description: 'Prompt fuer die KI-Bilderstellung',
    placeholder: 'Erstelle ein minimalistisches Design fuer...',
  },
  title: {
    name: 'Titel-Prompt',
    description: 'Prompt fuer Produkttitel-Generierung',
    placeholder: 'Erstelle einen SEO-optimierten Titel fuer...',
  },
  description: {
    name: 'Beschreibungs-Prompt',
    description: 'Prompt fuer Produktbeschreibungen',
    placeholder: 'Erstelle eine verkaufsstarke Beschreibung fuer...',
  },
} as const

export type PromptType = keyof typeof PROMPT_TYPES

// =====================================================
// SHOP CONNECTION STATUS
// =====================================================

export const CONNECTION_STATUS = {
  connected: {
    label: 'Verbunden',
    color: 'success',
  },
  disconnected: {
    label: 'Nicht verbunden',
    color: 'neutral',
  },
  error: {
    label: 'Fehler',
    color: 'error',
  },
} as const

// =====================================================
// VALIDATION
// =====================================================

export const VALIDATION = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
  niche: {
    minLength: 2,
    maxLength: 50,
  },
  prompt: {
    minLength: 10,
    maxLength: 2000,
  },
} as const

// =====================================================
// DATE/TIME FORMATS
// =====================================================

export const DATE_FORMAT = 'dd.MM.yyyy'
export const TIME_FORMAT = 'HH:mm'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'
export const LOCALE = 'de-DE'
export const TIMEZONE = 'Europe/Berlin'

// =====================================================
// PAGINATION
// =====================================================

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// =====================================================
// STRIPE CONFIG
// =====================================================

export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''

// Stripe Price IDs (from environment or test values)
export const STRIPE_PRICES: Record<SubscriptionTier, string> = {
  basis: import.meta.env.VITE_STRIPE_PRICE_BASIS || 'price_basis_test',
  premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM || 'price_premium_test',
  vip: import.meta.env.VITE_STRIPE_PRICE_VIP || 'price_vip_test',
}

// Checkout URLs
export const CHECKOUT_SUCCESS_URL = `${APP_URL}/checkout/success`
export const CHECKOUT_CANCEL_URL = `${APP_URL}/checkout/cancel`
