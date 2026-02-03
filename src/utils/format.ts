import { LOCALE, TIMEZONE } from '@lib/constants'

/**
 * Formatiert Preis in Euro
 */
export function formatPrice(
  amount: number,
  options?: { minimumFractionDigits?: number }
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
  }).format(amount)
}

/**
 * Formatiert Zahl mit Tausender-Trennzeichen
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(LOCALE).format(num)
}

/**
 * Formatiert Datum
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
    ...options,
  }).format(d)
}

/**
 * Formatiert Datum relativ (z.B. "vor 2 Stunden")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute')
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour')
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return rtf.format(-diffInDays, 'day')
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return rtf.format(-diffInMonths, 'month')
}

/**
 * Kuerzt Text auf maximale Laenge
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Formatiert Bytes in lesbare Groesse
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}
