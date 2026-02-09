import { VALIDATION } from '@lib/constants'

/**
 * Validiert Email-Format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validiert Passwort-Staerke
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
  strength: number
  feedback: string
} {
  const errors: string[] = []
  const { minLength, requireUppercase, requireLowercase, requireNumber } =
    VALIDATION.password

  let strength = 0

  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Mindestens ${minLength} Zeichen`)
  } else {
    strength += 1
  }

  // Check for uppercase
  const hasUppercase = /[A-Z]/.test(password)
  if (requireUppercase && !hasUppercase) {
    errors.push('Mindestens ein Grossbuchstabe')
  } else if (hasUppercase) {
    strength += 1
  }

  // Check for lowercase
  const hasLowercase = /[a-z]/.test(password)
  if (requireLowercase && !hasLowercase) {
    errors.push('Mindestens ein Kleinbuchstabe')
  } else if (hasLowercase) {
    strength += 1
  }

  // Check for number
  const hasNumber = /[0-9]/.test(password)
  if (requireNumber && !hasNumber) {
    errors.push('Mindestens eine Zahl')
  } else if (hasNumber) {
    strength += 1
  }

  // Bonus for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength = Math.min(4, strength + 1)
  }

  // Bonus for length > 12
  if (password.length >= 12) {
    strength = Math.min(4, strength + 1)
  }

  // Cap strength at 4
  strength = Math.min(4, strength)

  // Generate feedback
  let feedback: string
  if (password.length === 0) {
    feedback = ''
  } else if (strength === 1) {
    feedback = 'Schwach - verwende mehr verschiedene Zeichen'
  } else if (strength === 2) {
    feedback = 'Maessig - fuege Zahlen oder Sonderzeichen hinzu'
  } else if (strength === 3) {
    feedback = 'Gut - fast perfekt!'
  } else {
    feedback = 'Ausgezeichnet - sehr sicheres Passwort!'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    feedback,
  }
}

/**
 * Validiert Shopify Domain
 */
export function isValidShopifyDomain(domain: string): boolean {
  // Akzeptiert: store.myshopify.com oder nur store
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9](\.myshopify\.com)?$/
  return domainRegex.test(domain)
}

/**
 * Normalisiert Shopify Domain
 */
export function normalizeShopifyDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim()

  // Entferne https:// oder http://
  normalized = normalized.replace(/^https?:\/\//, '')

  // Entferne trailing slash
  normalized = normalized.replace(/\/$/, '')

  // Fuege .myshopify.com hinzu wenn nicht vorhanden
  if (!normalized.endsWith('.myshopify.com')) {
    normalized = `${normalized}.myshopify.com`
  }

  return normalized
}

/**
 * Validiert Niche-Name
 */
export function validateNicheName(name: string): {
  isValid: boolean
  error?: string
} {
  const { minLength, maxLength } = VALIDATION.niche

  if (name.length < minLength) {
    return { isValid: false, error: `Mindestens ${minLength} Zeichen` }
  }

  if (name.length > maxLength) {
    return { isValid: false, error: `Maximal ${maxLength} Zeichen` }
  }

  return { isValid: true }
}

/**
 * Validiert Prompt-Text
 */
export function validatePrompt(text: string): {
  isValid: boolean
  error?: string
} {
  const { minLength, maxLength } = VALIDATION.prompt

  if (text.length < minLength) {
    return { isValid: false, error: `Mindestens ${minLength} Zeichen` }
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `Maximal ${maxLength} Zeichen` }
  }

  return { isValid: true }
}
