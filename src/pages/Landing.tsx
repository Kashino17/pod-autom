import { Link } from 'react-router-dom'
import Hero from '@src/components/landing/Hero'
import HowItWorks from '@src/components/landing/HowItWorks'
import Features from '@src/components/landing/Features'
import Pricing from '@src/components/landing/Pricing'
import FAQ from '@src/components/landing/FAQ'
import Footer from '@src/components/landing/Footer'

// =====================================================
// LANDING PAGE HEADER
// =====================================================

function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gradient">TMS EcomPilot</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              So funktioniert&apos;s
            </a>
            <a
              href="#features"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Preise
            </a>
            <a
              href="#faq"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Anmelden
            </Link>
            <Link to="/register" className="btn-primary btn-sm">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

// =====================================================
// LANDING PAGE
// =====================================================

export default function Landing() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <LandingHeader />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <Hero />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* Pricing Section */}
        <Pricing />

        {/* FAQ Section */}
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
