// =====================================================
// SUBSCRIPTION TIERS
// =====================================================

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    credits: 0,
    maxNiches: 0,
    maxDesigns: 0,
    maxProducts: -1,
    maxManualProducts: 0,
    maxCollections: 0,
    productCategories: [] as readonly string[],
    analytics: false,
    platforms: ['pinterest', 'meta'] as const,
    platformLimit: 0,
    activePlatforms: 0,
    autoErsetzung: false,
    winnerScaling: false,
    advancedAnalytics: false,
    support: 'email' as const,
    features: [
      'Demo-Account zum Erkunden (keine echte Funktion)',
    ],
  },
  basis: {
    name: 'Basis',
    price: 199,
    credits: 50,
    maxNiches: 1,
    maxDesigns: 50,
    maxProducts: -1,
    maxManualProducts: 250,
    maxCollections: 30,
    productCategories: ['t-shirts'] as const,  // DB slugs from pod_autom_categories
    analytics: true,
    platforms: ['pinterest', 'meta'] as const,
    platformLimit: 1,
    activePlatforms: 1,
    autoErsetzung: true,
    winnerScaling: false,
    advancedAnalytics: false,
    supportResponseTime: '24-48h' as const,
    support: 'ticket' as const,
    fastLineCredits: 100,
    features: [
      '50 Credits/Monat',
      '1 Nische',
      'Max. 50 Motive/Monat (automatisch)',
      'Motive via Credits (Pay as you Go)',
      'Produktkatalog: T-Shirts',
      'Analytics + LiveView',
      'Pinterest oder Meta Ads (1 aktiv)',
      'Auto-Ersetzung & Kollektionsmanagement',
      'Winner Scaling (Coming Soon)',
      'KI-Prompts bearbeiten',
      'Interaktives Dashboard (2D & 3D Office)',
      'Shoporu Fast-Line Shop-Erstellung (100 Credits)',
      'Shoporu Shop (exklusiv mit TMS Solvado)',
      'Bis zu 250 manuelle Produkte',
      'Bis zu 30 Collections',
      '20 GB Speicherplatz (max. 5 MB/Datei)',
      'Custom Domain',
      'Versandoptionen Management',
      'Zahlungs-Gateways: PayPal & Stripe',
      'Shoporu Dashboard & Go-Live Checkliste',
      'Bestellverwaltung',
      'Kundenmanagement',
      'Shoporu Analytics & Live-Seite',
      'E-Mail Agent (Pay as you Go mit Credits)',
      'Produkt-Bewertungsmanagement',
      'Shop Conversion & POD-optimiert individualisierbar',
      'Custom Seiten & Legal Page Generator',
      'Menü Management System',
      'Abgebrochene Warenkörbe Recovery-Mail',
      'E-Mail-Automatisierungen (individualisierbar)',
      'Conversion-optimierter Cart Drawer',
      'Conversion-optimierter Checkout',
      'Conversion-optimierte Produkt- & Collectionsseite',
      '2 Mitarbeiterkonten (max. 15 Rollen)',
      'Ticket-Support (Antwortzeit: 24–48h)',
    ],
  },
  growth: {
    name: 'Growth',
    price: 399,
    credits: 100,
    maxNiches: 4,
    maxDesigns: 100,
    maxProducts: -1,
    maxManualProducts: 500,
    maxCollections: 100,
    productCategories: ['t-shirts', 'hoodies-pullover', 'kappen', 'taschen'] as const,
    analytics: true,
    platforms: ['pinterest', 'meta'] as const,
    platformLimit: 2,
    activePlatforms: 2,
    autoErsetzung: true,
    winnerScaling: false,
    advancedAnalytics: false,
    fastLineCredits: 100,
    supportResponseTime: '24h' as const,
    support: 'ticket' as const,
    features: [
      '100 Credits/Monat',
      '4 Nischen',
      'Max. 100 Motive/Monat (automatisch)',
      'Motive via Credits (Pay as you Go)',
      'Produktkatalog: T-Shirts, Hoodies, Kappen, Taschen',
      'Analytics + LiveView',
      'Pinterest + Meta Ads (beide aktiv)',
      'Auto-Ersetzung & Kollektionsmanagement',
      'Winner Scaling (Coming Soon)',
      'KI-Prompts bearbeiten',
      'Interaktives Dashboard (2D & 3D Office)',
      'Shoporu Fast-Line Shop-Erstellung (100 Credits)',
      'Shoporu Shop (exklusiv mit TMS Solvado)',
      'Bis zu 500 manuelle Produkte',
      'Bis zu 100 Collections',
      '40 GB Speicherplatz (max. 5 MB/Datei)',
      'Custom Domain',
      'Versandoptionen Management',
      'Zahlungs-Gateways: PayPal & Stripe',
      'Shoporu Dashboard & Go-Live Checkliste',
      'Bestellverwaltung',
      'Kundenmanagement',
      'Shoporu Analytics & Live-Seite',
      'E-Mail Agent (Pay as you Go mit Credits)',
      'Produkt-Bewertungsmanagement',
      'Shop Conversion & POD-optimiert individualisierbar',
      'Custom Seiten & Legal Page Generator',
      'Menü Management System',
      'Abgebrochene Warenkörbe Recovery-Mail',
      'E-Mail-Automatisierungen (individualisierbar)',
      'Conversion-optimierter Cart Drawer',
      'Conversion-optimierter Checkout',
      'Conversion-optimierte Produkt- & Collectionsseite',
      '5 Mitarbeiterkonten (max. 15 Rollen)',
      'Kauf auf Rechnung (Coming Soon)',
      'Ticket-Support (Antwortzeit: 24h)',
    ],
  },
  pro: {
    name: 'Pro',
    price: 799,
    credits: 200,
    maxNiches: 10,
    maxDesigns: 200,
    maxProducts: -1,
    maxManualProducts: 1000,
    maxCollections: 300,
    productCategories: ['all'] as const,
    analytics: true,
    platforms: ['pinterest', 'meta'] as const,
    platformLimit: 2,
    activePlatforms: 2,
    autoErsetzung: true,
    winnerScaling: false,
    advancedAnalytics: true,
    fastLineCredits: 100,
    supportResponseTime: '12h' as const,
    support: 'ticket' as const,
    features: [
      '200 Credits/Monat',
      '10 Nischen',
      'Max. 200 Motive/Monat (automatisch)',
      'Motive via Credits (Pay as you Go)',
      'Produktkatalog: Alle Kategorien',
      'Analytics + LiveView',
      'Pinterest + Meta Ads (beide aktiv)',
      'Auto-Ersetzung & Kollektionsmanagement',
      'Winner Scaling (Coming Soon)',
      'KI-Prompts bearbeiten',
      'Interaktives Dashboard (2D & 3D Office)',
      'Shoporu Fast-Line Shop-Erstellung (100 Credits)',
      'Shoporu Shop (exklusiv mit TMS Solvado)',
      'Bis zu 1.000 manuelle Produkte',
      'Bis zu 300 Collections',
      '60 GB Speicherplatz (max. 5 MB/Datei)',
      'Custom Domain',
      'Versandoptionen Management',
      'Zahlungs-Gateways: PayPal & Stripe',
      'Shoporu Dashboard & Go-Live Checkliste',
      'Bestellverwaltung',
      'Kundenmanagement',
      'Shoporu Analytics & Live-Seite',
      'E-Mail Agent (Pay as you Go mit Credits)',
      'Produkt-Bewertungsmanagement',
      'Shop Conversion & POD-optimiert individualisierbar',
      'Custom Seiten & Legal Page Generator',
      'Menü Management System',
      'Abgebrochene Warenkörbe Recovery-Mail',
      'E-Mail-Automatisierungen (individualisierbar)',
      'Conversion-optimierter Cart Drawer',
      'Conversion-optimierter Checkout',
      'Conversion-optimierte Produkt- & Collectionsseite',
      '10 Mitarbeiterkonten (max. 15 Rollen)',
      'Kauf auf Rechnung (Coming Soon)',
      'Ticket-Support (Antwortzeit: 12h)',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: -1, // Auf Anfrage
    credits: -1,
    maxNiches: -1,
    maxDesigns: -1,
    maxProducts: -1,
    maxManualProducts: -1, // Unlimited
    maxCollections: -1, // Unlimited
    productCategories: ['all'] as const,
    analytics: true,
    platforms: ['pinterest', 'meta', 'google', 'tiktok'] as const,
    platformLimit: -1,
    activePlatforms: -1,
    autoErsetzung: true,
    winnerScaling: false,
    advancedAnalytics: true,
    fastLineCredits: 100,
    supportResponseTime: 'individuell' as const,
    support: '1:1' as const,
    features: [
      'Credits: Auf Anfrage',
      'Nischen: Auf Anfrage',
      'Motive: Auf Anfrage',
      'Motive via Credits (Pay as you Go)',
      'Produktkatalog: Auf Anfrage',
      'Analytics + LiveView',
      'Ad-Plattformen: Auf Anfrage',
      'Auto-Ersetzung & Kollektionsmanagement',
      'Winner Scaling (Coming Soon)',
      'KI-Prompts bearbeiten',
      'Interaktives Dashboard (2D & 3D Office)',
      'Shoporu Fast-Line Shop-Erstellung (100 Credits)',
      'Shoporu Shop (exklusiv mit TMS Solvado)',
      'Manuelle Produkte: Auf Anfrage',
      'Collections: Auf Anfrage',
      'Medien Speicher: Auf Anfrage',
      'Custom Domain',
      'Versandoptionen Management',
      'Zahlungs-Gateways: PayPal & Stripe',
      'Shoporu Dashboard & Go-Live Checkliste',
      'Bestellverwaltung',
      'Kundenmanagement',
      'Shoporu Analytics & Live-Seite',
      'E-Mail Agent (Pay as you Go mit Credits)',
      'Produkt-Bewertungsmanagement',
      'Shop Conversion & POD-optimiert individualisierbar',
      'Custom Seiten & Legal Page Generator',
      'Menü Management System',
      'Abgebrochene Warenkörbe Recovery-Mail',
      'E-Mail-Automatisierungen (individualisierbar)',
      'Conversion-optimierter Cart Drawer',
      'Conversion-optimierter Checkout',
      'Conversion-optimierte Produkt- & Collectionsseite',
      'Mitarbeiterkonten: Auf Anfrage',
      'Kauf auf Rechnung (Coming Soon)',
      '1:1 Dedizierter Support',
    ],
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
export type SubscriptionTierData = (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]

// =====================================================
// PLAN FEATURE COMPARISON (for pricing table)
// =====================================================

export type FeaturePlatform = 'solvado' | 'shoporu' | 'both'

export interface MvpFeature {
  label: string
  values: Record<SubscriptionTier, string>
  platform: FeaturePlatform
}

export interface StandardFeature {
  label: string
  plans: Record<SubscriptionTier, boolean | string>
  platform: FeaturePlatform
}

export const PLAN_DEFS: { id: SubscriptionTier; name: string; price: number; description: string; popular?: boolean }[] = [
  { id: 'free', name: 'Free', price: 0, description: 'Demo zum Erkunden' },
  { id: 'basis', name: 'Basis', price: 199, description: 'Für den Einstieg' },
  { id: 'growth', name: 'Growth', price: 399, description: 'Für wachsende Businesses', popular: true },
  { id: 'pro', name: 'Pro', price: 799, description: 'Für ambitionierte Seller' },
  { id: 'enterprise', name: 'Enterprise', price: -1, description: 'Maximale Skalierung' },
]

export const MVP_FEATURES: MvpFeature[] = [
  {
    label: 'Credits / Monat',
    values: { free: '—', basis: '50', growth: '100', pro: '200', enterprise: 'Auf Anfrage' },
    platform: 'both',
  },
  {
    label: 'Nischen',
    values: { free: '—', basis: '1', growth: '4', pro: '10', enterprise: 'Auf Anfrage' },
    platform: 'solvado',
  },
  {
    label: 'Motive / Monat',
    values: { free: '—', basis: '50', growth: '100', pro: '200', enterprise: 'Auf Anfrage' },
    platform: 'solvado',
  },
  {
    label: 'Ad-Plattformen',
    values: { free: '—', basis: '1 (Pinterest ODER Meta)', growth: '2 (Pinterest + Meta)', pro: '2 (Pinterest + Meta)', enterprise: 'Auf Anfrage' },
    platform: 'solvado',
  },
  {
    label: 'Mitarbeiterkonten',
    values: { free: '—', basis: '2', growth: '5', pro: '10', enterprise: 'Auf Anfrage' },
    platform: 'shoporu',
  },
  {
    label: 'Medien Speicher',
    values: { free: '—', basis: '20 GB', growth: '40 GB', pro: '60 GB', enterprise: 'Auf Anfrage' },
    platform: 'shoporu',
  },
  {
    label: 'Produktkatalog',
    values: { free: '—', basis: 'T-Shirts', growth: 'T-Shirts, Hoodies, Kappen, Taschen', pro: 'Alle Kategorien', enterprise: 'Auf Anfrage' },
    platform: 'both',
  },
  {
    label: 'Manuelle Produkte',
    values: { free: '—', basis: '250', growth: '500', pro: '1.000', enterprise: 'Auf Anfrage' },
    platform: 'shoporu',
  },
  {
    label: 'Collections',
    values: { free: '—', basis: '30', growth: '100', pro: '300', enterprise: 'Auf Anfrage' },
    platform: 'both',
  },
]

export const STANDARD_FEATURES: StandardFeature[] = [
  { label: 'Conversion-optimierte Produkt- & Collectionsseiten', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Cart & Checkout Optimiertes Shop System', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Abgebrochene Warenkörbe Recovery-Mail', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'E-Mail-Automatisierungen (individualisierbar)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Motive via Credits (Pay as you Go)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'solvado' },
  { label: 'Auto-Ersetzung & Kollektionsmanagement', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'solvado' },
  { label: 'Winner Scaling', plans: { free: false, basis: 'Coming Soon', growth: 'Coming Soon', pro: 'Coming Soon', enterprise: 'Coming Soon' }, platform: 'solvado' },
  { label: 'KI-Prompts bearbeiten', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'solvado' },
  { label: 'Interaktives Dashboard (2D & 3D Office)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'solvado' },
  { label: 'Shoporu Fast-Line Shop-Erstellung', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Shoporu Shop (exklusiv mit TMS Solvado)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'both' },
  { label: 'Custom Domain Verknüpfung', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Versandoptionen Management', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Zahlungs-Gateways (Stripe & PayPal)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Shoporu Dashboard & Go-Live Checkliste', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Bestellverwaltung', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Kundenmanagement', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Analytics + LiveView', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'both' },
  { label: 'Kundensupport AI Agent (Credits)', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Produkt-Bewertungsmanagement', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Custom Seiten & Legal Page Generator', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Menü Management System', plans: { free: false, basis: true, growth: true, pro: true, enterprise: true }, platform: 'shoporu' },
  { label: 'Kauf auf Rechnung', plans: { free: false, basis: false, growth: 'Coming Soon', pro: 'Coming Soon', enterprise: 'Coming Soon' }, platform: 'shoporu' },
  { label: 'Kundensupport Ticket-System', plans: { free: false, basis: true, growth: 'VIP', pro: 'VIP', enterprise: 'VIP' }, platform: 'both' },
]

// Simplified tier limits for SubscriptionContext
export const TIER_LIMITS: Record<SubscriptionTier, { maxNiches: number; maxProducts: number; maxDesigns: number }> = {
  free: { maxNiches: 0, maxProducts: Infinity, maxDesigns: 0 },
  basis: { maxNiches: 1, maxProducts: Infinity, maxDesigns: 50 },
  growth: { maxNiches: 4, maxProducts: Infinity, maxDesigns: 100 },
  pro: { maxNiches: 10, maxProducts: Infinity, maxDesigns: 200 },
  enterprise: { maxNiches: Infinity, maxProducts: Infinity, maxDesigns: Infinity },
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

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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
    requiredTier: 'free' as SubscriptionTier,
  },
  meta: {
    name: 'Meta (Facebook/Instagram)',
    icon: 'SiMeta',
    color: '#0082FB',
    requiredTier: 'free' as SubscriptionTier,
  },
  google: {
    name: 'Google Ads',
    icon: 'SiGoogleads',
    color: '#4285F4',
    requiredTier: 'free' as SubscriptionTier,
  },
  tiktok: {
    name: 'TikTok Ads',
    icon: 'SiTiktok',
    color: '#000000',
    requiredTier: 'free' as SubscriptionTier,
  },
} as const

export type AdPlatform = keyof typeof AD_PLATFORMS

// =====================================================
// PROMPT TYPES
// =====================================================

export const PROMPT_TYPES = {
  image: {
    name: 'Bild-Prompt',
    description: 'Prompt für die KI-Bilderstellung',
    placeholder: 'Erstelle ein minimalistisches Design für...',
  },
  title: {
    name: 'Titel-Prompt',
    description: 'Prompt für Produkttitel-Generierung',
    placeholder: 'Erstelle einen SEO-optimierten Titel für...',
  },
  description: {
    name: 'Beschreibungs-Prompt',
    description: 'Prompt für Produktbeschreibungen',
    placeholder: 'Erstelle eine verkaufsstarke Beschreibung für...',
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
  free: '',
  basis: import.meta.env.VITE_STRIPE_PRICE_BASIS || 'price_basis_test',
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_pro_test',
  growth: import.meta.env.VITE_STRIPE_PRICE_GROWTH || 'price_growth_test',
  enterprise: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_enterprise_test',
}

// Checkout URLs
// Branding
export const LOGO_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/logo.png`

export const CHECKOUT_SUCCESS_URL = `${APP_URL}/checkout/success`
export const CHECKOUT_CANCEL_URL = `${APP_URL}/checkout/cancel`
