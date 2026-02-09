# Phase 1.6 - Landing Page mit Pricing

## Ziel
Erstellen einer professionellen, conversion-optimierten Marketing Landing Page mit allen Sektionen, Mobile-Support, GDPR-Compliance und modernem UX.

## Geschätzte Dauer
6-8 Stunden

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                       LANDING PAGE STRUKTUR                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ NAVIGATION (fixed)                                             │ │
│  │ Logo  |  Links (How It Works, Features, Pricing, FAQ)  | CTAs │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ HERO SECTION                                                   │ │
│  │ • Badge  • H1  • Subheadline  • CTA Buttons  • Stats          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ SOCIAL PROOF / TRUST BADGES                                    │ │
│  │ • Partner Logos  • Trust Indicators                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ HOW IT WORKS (4 Steps)                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ FEATURES (6 Cards)                                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ TESTIMONIALS (3 Cards)                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ PRICING (3 Plans)                                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ FAQ (6 Items)                                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ FINAL CTA                                                      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ FOOTER                                                         │ │
│  │ • Logo  • Links  • Social Media  • Newsletter  • Legal        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ COOKIE CONSENT (GDPR)                                          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ BACK TO TOP BUTTON                                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Landing Page (Main Component)

### src/pages/Landing.tsx

```typescript
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '@src/components/landing/Navbar'
import Hero from '@src/components/landing/Hero'
import TrustBadges from '@src/components/landing/TrustBadges'
import HowItWorks from '@src/components/landing/HowItWorks'
import Features from '@src/components/landing/Features'
import Testimonials from '@src/components/landing/Testimonials'
import Pricing from '@src/components/landing/Pricing'
import FAQ from '@src/components/landing/FAQ'
import FinalCTA from '@src/components/landing/FinalCTA'
import Footer from '@src/components/landing/Footer'
import CookieConsent from '@src/components/landing/CookieConsent'
import BackToTop from '@src/components/landing/BackToTop'
import SEOHead from '@src/components/SEOHead'

export default function Landing() {
  const location = useLocation()

  // Smooth scroll to anchor on page load
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }, [location.hash])

  // Enable smooth scrolling for anchor links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]')

      if (anchor) {
        e.preventDefault()
        const href = anchor.getAttribute('href')
        if (href) {
          const element = document.querySelector(href)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            // Update URL without scroll
            window.history.pushState(null, '', href)
          }
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return (
    <>
      <SEOHead
        title="POD AutoM - Vollautomatisiertes Print-on-Demand"
        description="Automatisiere dein Print-on-Demand Business mit KI-generierten Designs, automatischer Produkt-Erstellung und intelligentem Ad-Management. Starte jetzt!"
        keywords="Print on Demand, POD Automation, Shopify, E-Commerce, KI Designs, Passive Income"
        ogImage="/og-image.png"
      />

      <div className="min-h-screen bg-background">
        <Navbar />

        <main>
          <Hero />
          <TrustBadges />
          <HowItWorks />
          <Features />
          <Testimonials />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>

        <Footer />
        <CookieConsent />
        <BackToTop />
      </div>
    </>
  )
}
```

---

## 2. SEO Head Component

### src/components/SEOHead.tsx

```typescript
import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title: string
  description: string
  keywords?: string
  ogImage?: string
  ogType?: string
  canonicalUrl?: string
  noIndex?: boolean
}

export default function SEOHead({
  title,
  description,
  keywords,
  ogImage = '/og-image.png',
  ogType = 'website',
  canonicalUrl,
  noIndex = false,
}: SEOHeadProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pod-autom.de'
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:locale" content="de_DE" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullOgImage} />

      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'POD AutoM',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: description,
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: '200',
            highPrice: '835',
            priceCurrency: 'EUR',
            offerCount: '3',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '127',
          },
        })}
      </script>
    </Helmet>
  )
}
```

---

## 3. Navbar mit Mobile Menu

### src/components/landing/Navbar.tsx

```typescript
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Menu, X } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'
import { cn } from '@src/lib/utils'

const navLinks = [
  { href: '#how-it-works', label: 'So funktioniert\'s' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Preise' },
  { href: '#faq', label: 'FAQ' },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Track scroll position for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-background/95 backdrop-blur-lg border-b border-zinc-800 shadow-lg'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 z-50"
              onClick={closeMobileMenu}
            >
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">POD AutoM</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-zinc-400 hover:text-white transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to={ROUTES.LOGIN}
                className="text-zinc-400 hover:text-white transition-colors font-medium"
              >
                Anmelden
              </Link>
              <Link to={ROUTES.REGISTER} className="btn-primary">
                Kostenlos starten
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors z-50"
              aria-label={isMobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-all duration-300',
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />

        {/* Menu Panel */}
        <div
          className={cn(
            'absolute top-0 right-0 w-full max-w-sm h-full bg-surface border-l border-zinc-800 transform transition-transform duration-300',
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex flex-col h-full pt-20 pb-6 px-6">
            {/* Navigation Links */}
            <nav className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 text-lg font-medium text-zinc-300 hover:text-white hover:bg-surface-highlight rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <div className="h-px bg-zinc-800 my-4" />

              <Link
                to={ROUTES.CATALOG}
                onClick={closeMobileMenu}
                className="block px-4 py-3 text-lg font-medium text-zinc-300 hover:text-white hover:bg-surface-highlight rounded-lg transition-colors"
              >
                Produktkatalog
              </Link>
            </nav>

            {/* CTAs */}
            <div className="space-y-3 pt-6 border-t border-zinc-800">
              <Link
                to={ROUTES.LOGIN}
                onClick={closeMobileMenu}
                className="btn-secondary w-full justify-center"
              >
                Anmelden
              </Link>
              <Link
                to={ROUTES.REGISTER}
                onClick={closeMobileMenu}
                className="btn-primary w-full justify-center"
              >
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

---

## 4. Hero Section (Erweitert)

### src/components/landing/Hero.tsx

```typescript
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, TrendingUp, Zap, Play } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

export default function Hero() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="relative pt-24 md:pt-32 pb-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div
        ref={ref}
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">
              Vollautomatisiertes Print-on-Demand
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in-up animation-delay-100">
            Dein POD-Shop auf{' '}
            <span className="text-gradient">Autopilot</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            KI-generierte Designs, automatische Produkt-Erstellung und intelligentes
            Ad-Management. Starte dein passives Einkommen mit nur wenigen Klicks.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-300">
            <Link
              to={ROUTES.REGISTER}
              className="btn-primary text-lg px-8 py-3 glow-hover group"
            >
              Jetzt starten
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="btn-secondary text-lg px-8 py-3 group"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              So funktioniert's
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-2xl sm:text-3xl font-bold text-white mb-1">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                100%
              </div>
              <p className="text-xs sm:text-sm text-zinc-500">Automatisiert</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-2xl sm:text-3xl font-bold text-white mb-1">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                500+
              </div>
              <p className="text-xs sm:text-sm text-zinc-500">Produkte/Monat</p>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">24/7</div>
              <p className="text-xs sm:text-sm text-zinc-500">Aktiv</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <div className="w-6 h-10 border-2 border-zinc-600 rounded-full p-1">
          <div className="w-1.5 h-2.5 bg-zinc-400 rounded-full mx-auto animate-scroll-down" />
        </div>
      </div>
    </section>
  )
}
```

---

## 5. Trust Badges Section (NEU)

### src/components/landing/TrustBadges.tsx

```typescript
import { Shield, CreditCard, Clock, Award } from 'lucide-react'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

const badges = [
  {
    icon: Shield,
    label: 'SSL-verschlüsselt',
  },
  {
    icon: CreditCard,
    label: 'Sichere Zahlung via Stripe',
  },
  {
    icon: Clock,
    label: 'Jederzeit kündbar',
  },
  {
    icon: Award,
    label: 'DSGVO-konform',
  },
]

export default function TrustBadges() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section
      ref={ref}
      className={`py-8 border-y border-zinc-800 bg-surface/50 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-zinc-400"
            >
              <badge.icon className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## 6. How It Works (Erweitert)

### src/components/landing/HowItWorks.tsx

```typescript
import { Store, Palette, Rocket, TrendingUp } from 'lucide-react'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

const steps = [
  {
    icon: Store,
    title: 'Shop verbinden',
    description: 'Verbinde deinen Shopify Store mit einem Klick. Keine technischen Kenntnisse nötig.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Palette,
    title: 'Nischen wählen',
    description: 'Wähle deine Nischen und unsere KI erstellt automatisch passende Designs.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    icon: Rocket,
    title: 'Automatisch veröffentlichen',
    description: 'Produkte werden erstellt, optimiert und in deinem Shop veröffentlicht.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: TrendingUp,
    title: 'Skalieren',
    description: 'Winner werden erkannt und automatisch mit mehr Budget beworben.',
    color: 'from-emerald-500 to-emerald-600',
  },
]

export default function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            4 einfache Schritte
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
            So funktioniert's
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            In nur 4 Schritten zu deinem vollautomatisierten POD-Business
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface StepCardProps {
  step: typeof steps[number]
  index: number
}

function StepCard({ step, index }: StepCardProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Connector Line (Desktop) */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
      )}

      <div className="relative card hover:border-primary/30 transition-all duration-300 group">
        {/* Step Number */}
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-primary to-violet-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/25">
          {index + 1}
        </div>

        {/* Icon */}
        <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <step.icon className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-lg font-semibold mb-2 text-center">{step.title}</h3>
        <p className="text-sm text-zinc-400 text-center">{step.description}</p>
      </div>
    </div>
  )
}
```

---

## 7. Features Section (Erweitert)

### src/components/landing/Features.tsx

```typescript
import {
  Wand2,
  Megaphone,
  BarChart3,
  Repeat,
  Shield,
  Clock,
  Brain,
  Palette,
  Globe,
} from 'lucide-react'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

const features = [
  {
    icon: Wand2,
    title: 'KI-Design Generator',
    description: 'GPT-5 und Midjourney erstellen einzigartige, verkaufsstarke Designs für deine Nischen.',
    highlight: true,
  },
  {
    icon: Megaphone,
    title: 'Multi-Platform Ads',
    description: 'Automatische Kampagnen auf Pinterest, Meta, Google und TikTok.',
  },
  {
    icon: BarChart3,
    title: 'Winner Detection',
    description: 'KI erkennt Top-Performer und skaliert sie automatisch mit mehr Budget.',
    highlight: true,
  },
  {
    icon: Repeat,
    title: 'Auto-Replacement',
    description: 'Underperformer werden automatisch durch neue Designs ersetzt.',
  },
  {
    icon: Brain,
    title: 'Smart Optimization',
    description: 'Kontinuierliche Optimierung von Titeln, Beschreibungen und Keywords.',
  },
  {
    icon: Palette,
    title: 'Trend Analysis',
    description: 'Erkennung von Trends und automatische Anpassung deiner Nischen.',
  },
  {
    icon: Shield,
    title: 'Sichere Integration',
    description: 'Shopify OAuth und verschlüsselte API-Verbindungen für maximale Sicherheit.',
  },
  {
    icon: Clock,
    title: '24/7 Automation',
    description: 'Dein Shop arbeitet rund um die Uhr, auch wenn du schläfst.',
  },
  {
    icon: Globe,
    title: 'Multi-Shop Support',
    description: 'Verwalte mehrere Shops von einem Dashboard aus.',
  },
]

export default function Features() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
            Leistungsstarke Features
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Alles was du brauchst, um dein POD-Business zu automatisieren
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  feature: typeof features[number]
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${(index % 3) * 100}ms` }}
    >
      <div
        className={`card-hover group h-full ${
          feature.highlight ? 'border-primary/30 bg-primary/5' : ''
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 ${
            feature.highlight
              ? 'bg-primary/20 group-hover:bg-primary/30'
              : 'bg-primary/10 group-hover:bg-primary/20'
          }`}
        >
          <feature.icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
        <p className="text-sm text-zinc-400">{feature.description}</p>
      </div>
    </div>
  )
}
```

---

## 8. Testimonials Section (NEU)

### src/components/landing/Testimonials.tsx

```typescript
import { Star, Quote } from 'lucide-react'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

const testimonials = [
  {
    name: 'Michael S.',
    role: 'E-Commerce Entrepreneur',
    avatar: '/avatars/michael.jpg',
    content:
      'POD AutoM hat mein Business komplett verändert. In 3 Monaten habe ich meinen Umsatz verdreifacht - und das fast ohne eigenen Aufwand!',
    rating: 5,
    highlight: '3x Umsatz in 3 Monaten',
  },
  {
    name: 'Sandra K.',
    role: 'Side Hustler',
    avatar: '/avatars/sandra.jpg',
    content:
      'Als Vollzeit-Angestellte habe ich kaum Zeit für mein Nebenprojekt. Mit POD AutoM läuft alles automatisch und ich verdiene passiv dazu.',
    rating: 5,
    highlight: '€2.500/Monat nebenbei',
  },
  {
    name: 'Thomas B.',
    role: 'POD Seller',
    avatar: '/avatars/thomas.jpg',
    content:
      'Die KI-generierten Designs sind der absolute Wahnsinn. Viel besser als alles was ich selbst hätte erstellen können. Winner Scaling ist ein Game-Changer!',
    rating: 5,
    highlight: 'ROI von 340%',
  },
]

export default function Testimonials() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
            Was unsere Kunden sagen
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Echte Ergebnisse von echten Nutzern
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value="500+" label="Aktive Nutzer" />
          <Stat value="2M+" label="Produkte erstellt" />
          <Stat value="€5M+" label="Generierter Umsatz" />
          <Stat value="4.8" label="Durchschnittliche Bewertung" showStars />
        </div>
      </div>
    </section>
  )
}

interface TestimonialCardProps {
  testimonial: typeof testimonials[number]
  index: number
}

function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="card h-full flex flex-col">
        {/* Quote Icon */}
        <Quote className="w-8 h-8 text-primary/30 mb-4" />

        {/* Content */}
        <p className="text-zinc-300 flex-1 mb-6">"{testimonial.content}"</p>

        {/* Highlight Badge */}
        <div className="inline-flex self-start items-center gap-1 bg-emerald-500/10 text-emerald-400 text-sm font-medium px-3 py-1 rounded-full mb-4">
          <Star className="w-4 h-4 fill-current" />
          {testimonial.highlight}
        </div>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet-600 rounded-full flex items-center justify-center text-white font-bold">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{testimonial.name}</p>
            <p className="text-sm text-zinc-500">{testimonial.role}</p>
          </div>
          {/* Rating */}
          <div className="ml-auto flex gap-0.5">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatProps {
  value: string
  label: string
  showStars?: boolean
}

function Stat({ value, label, showStars }: StatProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.5 })

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className="text-3xl md:text-4xl font-bold text-white">{value}</span>
        {showStars && <Star className="w-6 h-6 text-amber-400 fill-amber-400" />}
      </div>
      <p className="text-sm text-zinc-500 mt-1">{label}</p>
    </div>
  )
}
```

---

## 9. Pricing Section (Erweitert)

### src/components/landing/Pricing.tsx

```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Sparkles, ArrowRight } from 'lucide-react'
import { ROUTES, SUBSCRIPTION_TIERS } from '@src/lib/constants'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'
import { cn } from '@src/lib/utils'

const plans = [
  {
    key: 'basis' as const,
    name: 'Basis',
    description: 'Perfekt für den Einstieg',
    features: [
      { text: 'Pinterest ODER Meta Ads', included: true },
      { text: '5 Nischen', included: true },
      { text: '100 Produkte/Monat', included: true },
      { text: 'Basis Analytics', included: true },
      { text: 'E-Mail Support', included: true },
      { text: 'Winner Scaling', included: false },
      { text: 'Advanced Analytics', included: false },
      { text: '1:1 Support', included: false },
    ],
    popular: false,
  },
  {
    key: 'premium' as const,
    name: 'Premium',
    description: 'Für ambitionierte Seller',
    features: [
      { text: 'Pinterest + Meta Ads', included: true },
      { text: '15 Nischen', included: true },
      { text: '500 Produkte/Monat', included: true },
      { text: 'Erweiterte Analytics', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Winner Scaling', included: true },
      { text: 'Advanced Analytics', included: false },
      { text: '1:1 Support', included: false },
    ],
    popular: true,
  },
  {
    key: 'vip' as const,
    name: 'VIP',
    description: 'Maximale Power',
    features: [
      { text: 'Alle Plattformen', included: true },
      { text: 'Unbegrenzte Nischen', included: true },
      { text: 'Unbegrenzte Produkte', included: true },
      { text: 'Advanced Analytics', included: true },
      { text: '1:1 Support', included: true },
      { text: 'Winner Scaling', included: true },
      { text: 'Custom Integrations', included: true },
      { text: 'Dedicated Account Manager', included: true },
    ],
    popular: false,
  },
]

export default function Pricing() {
  const { ref, isVisible } = useScrollAnimation()
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
            Transparente Preise
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Wähle den Plan, der zu deinen Zielen passt. Jederzeit kündbar.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={cn('text-sm', !isAnnual ? 'text-white' : 'text-zinc-500')}>
              Monatlich
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                'relative w-14 h-7 rounded-full transition-colors',
                isAnnual ? 'bg-primary' : 'bg-zinc-700'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform',
                  isAnnual ? 'translate-x-8' : 'translate-x-1'
                )}
              />
            </button>
            <span className={cn('text-sm', isAnnual ? 'text-white' : 'text-zinc-500')}>
              Jährlich
              <span className="ml-1 text-emerald-400 text-xs">(2 Monate gratis)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              index={index}
              isAnnual={isAnnual}
            />
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center mt-12 text-zinc-400 text-sm">
          <p>
            30 Tage Geld-zurück-Garantie • Keine versteckten Kosten • SSL-verschlüsselt
          </p>
        </div>
      </div>
    </section>
  )
}

interface PricingCardProps {
  plan: typeof plans[number]
  index: number
  isAnnual: boolean
}

function PricingCard({ plan, index, isAnnual }: PricingCardProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 })
  const tierData = SUBSCRIPTION_TIERS[plan.key]
  const monthlyPrice = tierData.price
  const annualPrice = Math.round(monthlyPrice * 10) // 2 months free
  const displayPrice = isAnnual ? Math.round(annualPrice / 12) : monthlyPrice

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        className={cn(
          'relative card h-full flex flex-col',
          plan.popular && 'border-primary ring-2 ring-primary/20 scale-105 z-10'
        )}
      >
        {/* Popular Badge */}
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-primary to-violet-600 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-lg shadow-primary/25">
              <Sparkles className="w-4 h-4" />
              Beliebt
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
          <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl lg:text-5xl font-bold">{displayPrice}€</span>
            <span className="text-zinc-400">/Monat</span>
          </div>
          {isAnnual && (
            <p className="text-sm text-emerald-400 mt-1">
              {annualPrice}€/Jahr (spare {monthlyPrice * 2}€)
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {feature.included ? (
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <X className="w-5 h-5 text-zinc-600 flex-shrink-0" />
              )}
              <span className={feature.included ? '' : 'text-zinc-500'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <Link
          to={ROUTES.REGISTER}
          className={cn(
            'w-full group',
            plan.popular ? 'btn-primary' : 'btn-secondary'
          )}
        >
          Jetzt starten
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
```

---

## 10. FAQ Section (Erweitert)

### src/components/landing/FAQ.tsx

```typescript
import { useState } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@src/lib/constants'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'
import { cn } from '@src/lib/utils'

const faqs = [
  {
    question: 'Brauche ich technische Kenntnisse?',
    answer:
      'Nein, POD AutoM ist so konzipiert, dass jeder es nutzen kann. Die Einrichtung erfolgt über einen einfachen Wizard und alles Weitere läuft automatisch. Unser Support-Team hilft dir bei Fragen gerne weiter.',
  },
  {
    question: 'Welche Kosten kommen zusätzlich auf mich zu?',
    answer:
      'Neben dem monatlichen Abo benötigst du ein Werbebudget für deine Ad-Kampagnen. Wir empfehlen mindestens 500€/Monat für den Start. Die Fulfillment-Kosten werden pro Bestellung vom Verkaufspreis abgezogen. Eine Übersicht findest du in unserem Produktkatalog.',
  },
  {
    question: 'Wie funktioniert das Winner Scaling?',
    answer:
      'Unsere KI analysiert täglich die Performance deiner Produkte. Produkte mit überdurchschnittlichen Verkaufszahlen werden automatisch identifiziert und erhalten mehr Werbebudget. Gleichzeitig werden Underperformer pausiert oder durch neue Designs ersetzt.',
  },
  {
    question: 'Kann ich jederzeit kündigen?',
    answer:
      'Ja, alle Pläne sind monatlich kündbar. Nach der Kündigung läuft dein Abo bis zum Ende der bezahlten Periode weiter. Du behältst vollen Zugriff bis zum Ablauf. Bei Jahreszahlern gibt es eine anteilige Rückerstattung.',
  },
  {
    question: 'Welche Shopify-Version benötige ich?',
    answer:
      'POD AutoM funktioniert mit allen Shopify-Plänen, einschließlich Shopify Basic. Du benötigst lediglich die Berechtigung für Custom Apps. Die Verbindung erfolgt über OAuth - sicher und schnell.',
  },
  {
    question: 'Wie lange dauert es bis zu den ersten Verkäufen?',
    answer:
      'Das hängt von verschiedenen Faktoren ab. In der Regel sehen Kunden erste Verkäufe innerhalb der ersten 2-4 Wochen nach dem Start der Kampagnen. Mit Winner Scaling können profitable Produkte dann schnell skaliert werden.',
  },
  {
    question: 'Welche Ad-Plattformen werden unterstützt?',
    answer:
      'Aktuell unterstützen wir Pinterest, Meta (Facebook/Instagram), Google Ads und TikTok Ads. Die Verfügbarkeit hängt von deinem Plan ab. Weitere Plattformen sind in Planung.',
  },
  {
    question: 'Kann ich mehrere Shops verwalten?',
    answer:
      'Ja! Mit POD AutoM kannst du mehrere Shopify-Stores von einem Dashboard aus verwalten. Jeder Shop kann eigene Nischen, Designs und Kampagnen haben.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
            Häufige Fragen
          </h2>
          <p className="text-zinc-400 text-lg">
            Noch Fragen? Hier findest du Antworten.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-zinc-400 mb-4">
            Deine Frage nicht dabei?
          </p>
          <Link
            to={ROUTES.REGISTER}
            className="btn-secondary inline-flex"
          >
            <MessageCircle className="w-5 h-5" />
            Kontaktiere uns
          </Link>
        </div>
      </div>
    </section>
  )
}

interface FAQItemProps {
  faq: typeof faqs[number]
  index: number
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ faq, index, isOpen, onToggle }: FAQItemProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.5 })

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-full card text-left transition-colors',
          isOpen && 'border-primary/30 bg-primary/5'
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-medium pr-4">{faq.question}</h3>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform duration-300',
              isOpen && 'rotate-180 text-primary'
            )}
          />
        </div>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-96 mt-4' : 'max-h-0'
          )}
        >
          <p className="text-sm text-zinc-400 leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </button>
    </div>
  )
}
```

---

## 11. Final CTA Section (NEU)

### src/components/landing/FinalCTA.tsx

```typescript
import { Link } from 'react-router-dom'
import { ArrowRight, Rocket, Zap } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'
import { useScrollAnimation } from '@src/hooks/useScrollAnimation'

export default function FinalCTA() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-violet-600/10 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl" />

      <div
        ref={ref}
        className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
          <Rocket className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Starte noch heute</span>
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
          Bereit, dein POD-Business zu{' '}
          <span className="text-gradient">automatisieren</span>?
        </h2>

        <p className="text-lg text-zinc-300 mb-8 max-w-2xl mx-auto">
          Schließe dich über 500 erfolgreichen Sellern an und lass dein Business
          auf Autopilot laufen. Keine Kreditkarte für den Start erforderlich.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={ROUTES.REGISTER}
            className="btn-primary text-lg px-8 py-4 glow-hover group"
          >
            <Zap className="w-5 h-5" />
            Jetzt kostenlos starten
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to={ROUTES.CATALOG} className="btn-ghost text-lg">
            Produktkatalog ansehen
          </Link>
        </div>

        <p className="text-sm text-zinc-500 mt-6">
          Keine Kreditkarte • 30 Tage Geld-zurück-Garantie • Jederzeit kündbar
        </p>
      </div>
    </section>
  )
}
```

---

## 12. Footer (Erweitert)

### src/components/landing/Footer.tsx

```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Mail, Loader2, CheckCircle } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'

// Social Icons (Custom für kleinere Bundle Size)
const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)

const LinkedInIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const socialLinks = [
  { icon: TwitterIcon, href: 'https://twitter.com/podautom', label: 'Twitter' },
  { icon: InstagramIcon, href: 'https://instagram.com/podautom', label: 'Instagram' },
  { icon: LinkedInIcon, href: 'https://linkedin.com/company/podautom', label: 'LinkedIn' },
  { icon: YouTubeIcon, href: 'https://youtube.com/@podautom', label: 'YouTube' },
]

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Preise', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Produktkatalog', href: ROUTES.CATALOG },
  ],
  company: [
    { label: 'Über uns', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Karriere', href: '/careers' },
    { label: 'Partner', href: '/partners' },
  ],
  legal: [
    { label: 'Impressum', href: '/impressum' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'AGB', href: '/agb' },
    { label: 'Cookie-Einstellungen', href: '#cookie-settings' },
  ],
}

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSuccess(true)
    setIsSubmitting(false)
    setEmail('')

    // Reset success state after 3 seconds
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-surface border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">POD AutoM</span>
            </Link>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs">
              Vollautomatisiertes Print-on-Demand für deinen Shopify Store.
              KI-generierte Designs, automatische Ads und Winner Scaling.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-surface-highlight rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-primary/20 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Produkt</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('#') || link.href.startsWith('/') ? (
                    <Link
                      to={link.href}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Unternehmen</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Rechtliches</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-sm text-zinc-400 mb-4">
              Tipps & News für dein POD-Business.
            </p>

            {isSuccess ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-5 h-5" />
                Erfolgreich angemeldet!
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    required
                    className="input pl-10 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full text-sm py-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Anmelden'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            © {currentYear} POD AutoM. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-zinc-500">
            Made with ❤️ in Germany
          </p>
        </div>
      </div>
    </footer>
  )
}
```

---

## 13. Cookie Consent (GDPR)

### src/components/landing/CookieConsent.tsx

```typescript
import { useState, useEffect } from 'react'
import { Cookie, X, Settings } from 'lucide-react'
import { cn } from '@src/lib/utils'

const COOKIE_CONSENT_KEY = 'pod_autom_cookie_consent'

type ConsentType = 'all' | 'essential' | 'custom' | null

interface ConsentSettings {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ConsentSettings>({
    essential: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
  })

  // Check for existing consent on mount
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for better UX
      setTimeout(() => setIsVisible(true), 1500)
    }
  }, [])

  const handleAcceptAll = () => {
    const fullConsent: ConsentSettings = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    saveConsent('all', fullConsent)
  }

  const handleAcceptEssential = () => {
    const essentialConsent: ConsentSettings = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    saveConsent('essential', essentialConsent)
  }

  const handleSaveCustom = () => {
    saveConsent('custom', settings)
  }

  const saveConsent = (type: ConsentType, consentSettings: ConsentSettings) => {
    const consent = {
      type,
      settings: consentSettings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
    setIsVisible(false)

    // Here you would typically also:
    // - Initialize analytics if consented
    // - Initialize marketing pixels if consented
    if (consentSettings.analytics) {
      // initAnalytics()
    }
    if (consentSettings.marketing) {
      // initMarketing()
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div
        className={cn(
          'max-w-4xl mx-auto bg-surface border border-zinc-800 rounded-2xl shadow-2xl',
          'animate-slide-up'
        )}
      >
        {showSettings ? (
          // Settings View
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cookie-Einstellungen</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-surface-highlight rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-center justify-between p-4 bg-surface-highlight rounded-lg">
                <div>
                  <p className="font-medium">Essenziell</p>
                  <p className="text-sm text-zinc-400">
                    Notwendig für die Grundfunktionen der Website.
                  </p>
                </div>
                <div className="toggle toggle-checked opacity-50 cursor-not-allowed" />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-center justify-between p-4 bg-surface-highlight rounded-lg">
                <div>
                  <p className="font-medium">Analyse</p>
                  <p className="text-sm text-zinc-400">
                    Helfen uns, die Nutzung zu verstehen und zu verbessern.
                  </p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, analytics: !s.analytics }))}
                  className={cn(
                    'toggle',
                    settings.analytics && 'toggle-checked'
                  )}
                />
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-4 bg-surface-highlight rounded-lg">
                <div>
                  <p className="font-medium">Marketing</p>
                  <p className="text-sm text-zinc-400">
                    Für personalisierte Werbung und Retargeting.
                  </p>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, marketing: !s.marketing }))}
                  className={cn(
                    'toggle',
                    settings.marketing && 'toggle-checked'
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSaveCustom} className="btn-primary flex-1">
                Auswahl speichern
              </button>
              <button onClick={handleAcceptAll} className="btn-secondary flex-1">
                Alle akzeptieren
              </button>
            </div>
          </div>
        ) : (
          // Main View
          <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Wir nutzen Cookies, um dein Erlebnis zu verbessern.{' '}
                  <a href="/datenschutz" className="text-primary hover:underline">
                    Mehr erfahren
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="btn-ghost text-sm py-2 px-3"
              >
                <Settings className="w-4 h-4" />
                Einstellungen
              </button>
              <button
                onClick={handleAcceptEssential}
                className="btn-secondary text-sm py-2 px-4"
              >
                Nur Essenziell
              </button>
              <button
                onClick={handleAcceptAll}
                className="btn-primary text-sm py-2 px-4"
              >
                Alle akzeptieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 14. Back to Top Button

### src/components/landing/BackToTop.tsx

```typescript
import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@src/lib/utils'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Nach oben scrollen"
      className={cn(
        'fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary rounded-full',
        'flex items-center justify-center shadow-lg shadow-primary/25',
        'hover:bg-primary-hover hover:scale-110 transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
```

---

## 15. Scroll Animation Hook

### src/hooks/useScrollAnimation.ts

```typescript
import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  triggerOnce?: boolean
  rootMargin?: string
}

export function useScrollAnimation({
  threshold = 0.1,
  triggerOnce = true,
  rootMargin = '0px',
}: UseScrollAnimationOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, triggerOnce, rootMargin])

  return { ref, isVisible }
}
```

---

## 16. Animationen (Ergänzung zu animations.css)

### src/animations.css (Ergänzung)

```css
/* Slide Up Animation (für Cookie Banner) */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.4s ease-out;
}

/* Scroll Down Indicator */
@keyframes scroll-down {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(6px);
    opacity: 0.5;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-scroll-down {
  animation: scroll-down 1.5s ease-in-out infinite;
}

/* Pulse Slow (für Hero Background) */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}

/* Animation Delays */
.animation-delay-100 {
  animation-delay: 100ms;
}

.animation-delay-200 {
  animation-delay: 200ms;
}

.animation-delay-300 {
  animation-delay: 300ms;
}

.animation-delay-400 {
  animation-delay: 400ms;
}

.animation-delay-1000 {
  animation-delay: 1000ms;
}
```

---

## 17. Dependencies

### package.json (Ergänzung)

```json
{
  "dependencies": {
    "react-helmet-async": "^2.0.5"
  }
}
```

### src/main.tsx (Ergänzung für Helmet)

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import './animations.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)
```

---

## Datei-Struktur

```
src/
├── pages/
│   └── Landing.tsx                    # NEU (komplett überarbeitet)
│
├── components/
│   ├── SEOHead.tsx                    # NEU
│   │
│   └── landing/
│       ├── Navbar.tsx                 # NEU (mit Mobile Menu)
│       ├── Hero.tsx                   # NEU (erweitert)
│       ├── TrustBadges.tsx            # NEU
│       ├── HowItWorks.tsx             # NEU (erweitert)
│       ├── Features.tsx               # NEU (erweitert)
│       ├── Testimonials.tsx           # NEU
│       ├── Pricing.tsx                # NEU (erweitert)
│       ├── FAQ.tsx                    # NEU (erweitert)
│       ├── FinalCTA.tsx               # NEU
│       ├── Footer.tsx                 # NEU (mit Newsletter + Social)
│       ├── CookieConsent.tsx          # NEU (GDPR)
│       └── BackToTop.tsx              # NEU
│
├── hooks/
│   └── useScrollAnimation.ts          # NEU
│
└── animations.css                     # Erweitert
```

---

## Verifizierung

### Landing Page
- [ ] Lädt korrekt unter `/`
- [ ] SEO Meta Tags vorhanden
- [ ] Schema.org Structured Data
- [ ] Alle Sektionen sichtbar

### Navigation
- [ ] Desktop Navigation funktioniert
- [ ] Mobile Hamburger Menu öffnet/schließt
- [ ] Anchor Links scrollen smooth
- [ ] Sticky Navbar bei Scroll

### Sektionen
- [ ] Hero mit Badge, H1, Stats
- [ ] Trust Badges sichtbar
- [ ] How It Works mit 4 Schritten
- [ ] Features Grid (9 Cards)
- [ ] Testimonials mit Ratings
- [ ] Pricing mit Toggle (Monatlich/Jährlich)
- [ ] FAQ Accordion funktioniert
- [ ] Final CTA mit Gradient

### Footer
- [ ] Newsletter Signup funktioniert
- [ ] Social Media Links vorhanden
- [ ] Dynamisches Copyright Jahr
- [ ] Alle Links funktionieren

### GDPR & UX
- [ ] Cookie Consent erscheint
- [ ] Cookie Einstellungen speicherbar
- [ ] Back to Top Button erscheint bei Scroll
- [ ] Scroll Animations funktionieren
- [ ] Responsive auf Mobile (320px+)

### Performance
- [ ] Lighthouse Score > 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Bilder lazy loaded

---

## Abhängigkeiten

- Phase 1.2 (Tailwind Styling, UI Components)
- Phase 1.5 (AuthContext für Login-Links, ROUTES)

---

## Nächster Schritt

→ Phase 2.1 - Login/Register Pages
