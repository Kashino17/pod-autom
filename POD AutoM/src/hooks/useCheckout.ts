import { useState } from 'react'
import { api } from '@src/lib/api'
import { useAuth } from '@src/contexts/AuthContext'
import {
  STRIPE_PUBLIC_KEY,
  STRIPE_PRICES,
  CHECKOUT_SUCCESS_URL,
  CHECKOUT_CANCEL_URL,
  type SubscriptionTier,
} from '@src/lib/constants'

// =====================================================
// TYPES
// =====================================================

interface CheckoutSessionResponse {
  success: boolean
  url: string
  session_id: string
}

interface PortalSessionResponse {
  success: boolean
  url: string
}

// =====================================================
// HOOK
// =====================================================

export function useCheckout() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Creates a Stripe Checkout session and redirects to payment
   */
  const createCheckoutSession = async (tier: SubscriptionTier) => {
    if (!user) {
      setError('Du musst eingeloggt sein')
      return
    }

    if (!STRIPE_PUBLIC_KEY) {
      setError('Stripe ist nicht konfiguriert')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const priceId = STRIPE_PRICES[tier]

      const response = await api.post<CheckoutSessionResponse>('/api/stripe/create-checkout', {
        price_id: priceId,
        user_id: user.id,
        success_url: CHECKOUT_SUCCESS_URL,
        cancel_url: CHECKOUT_CANCEL_URL,
      })

      if (response.success && response.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.url
      } else {
        throw new Error('Checkout-Session konnte nicht erstellt werden')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setError(message)
      console.error('Checkout error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Opens Stripe Customer Portal for subscription management
   */
  const openCustomerPortal = async () => {
    if (!user) {
      setError('Du musst eingeloggt sein')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post<PortalSessionResponse>('/api/stripe/portal', {
        user_id: user.id,
        return_url: `${window.location.origin}/settings`,
      })

      if (response.success && response.url) {
        // Redirect to Stripe Portal
        window.location.href = response.url
      } else {
        throw new Error('Portal-Session konnte nicht erstellt werden')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setError(message)
      console.error('Portal error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // State
    isLoading,
    error,
    isStripeConfigured: !!STRIPE_PUBLIC_KEY,

    // Actions
    createCheckoutSession,
    openCustomerPortal,

    // Helpers
    clearError: () => setError(null),
  }
}
