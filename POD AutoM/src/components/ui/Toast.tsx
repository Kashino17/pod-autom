import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type Toast as ToastType } from '@src/lib/store'
import { cn } from '@src/lib/utils'

// =====================================================
// TOAST ICONS
// =====================================================

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

// =====================================================
// TOAST COLORS
// =====================================================

const colors = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-500',
    progress: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-500',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-500',
    progress: 'bg-amber-500',
  },
  info: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    icon: 'text-violet-500',
    progress: 'bg-violet-500',
  },
} as const

// =====================================================
// SINGLE TOAST
// =====================================================

interface ToastItemProps {
  toast: ToastType
  onRemove: () => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  const Icon = icons[toast.type]
  const colorClasses = colors[toast.type]
  const duration = toast.duration ?? 5000

  // Animate progress bar
  useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration])

  // Handle exit animation
  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(onRemove, 200)
  }

  return (
    <div
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-lg border backdrop-blur-sm',
        'transform transition-all duration-200',
        colorClasses.bg,
        colorClasses.border,
        isExiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100'
      )}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <Icon className={cn('h-5 w-5 flex-shrink-0', colorClasses.icon)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-zinc-400">{toast.description}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleRemove}
          className="flex-shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/50">
          <div
            className={cn('h-full transition-all duration-100', colorClasses.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// =====================================================
// TOAST CONTAINER
// =====================================================

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

// =====================================================
// EXPORTS
// =====================================================

export default ToastContainer
export { ToastItem }
