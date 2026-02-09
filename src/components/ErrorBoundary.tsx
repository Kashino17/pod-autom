import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// =====================================================
// ERROR FALLBACK COMPONENT
// =====================================================

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Etwas ist schiefgelaufen
        </h1>

        {/* Description */}
        <p className="text-zinc-400 mb-6">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder
          kehre zur Startseite zurueck.
        </p>

        {/* Error Details (Development only) */}
        {import.meta.env.DEV && error && (
          <div className="mb-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-left">
            <p className="text-xs text-zinc-500 mb-1">Fehlerdetails:</p>
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
          <button
            onClick={handleGoHome}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Zur Startseite
          </button>
        </div>

        {/* Reload hint */}
        <p className="text-xs text-zinc-600 mt-6">
          Falls das Problem weiterhin besteht,{' '}
          <button
            onClick={handleReload}
            className="text-violet-400 hover:text-violet-300 underline"
          >
            lade die Seite neu
          </button>
        </p>
      </div>
    </div>
  )
}

// =====================================================
// ERROR BOUNDARY CLASS
// =====================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // In production, you could send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

// =====================================================
// ROUTE ERROR BOUNDARY (smaller variant)
// =====================================================

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  hasError: boolean
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): Partial<RouteErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('RouteErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Fehler beim Laden
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Diese Seite konnte nicht geladen werden.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-secondary text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Erneut versuchen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
