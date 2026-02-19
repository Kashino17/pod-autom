import { Clock, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react'
import { useUserProfile } from '@src/hooks/useAdmin'

// =====================================================
// VERIFICATION BANNER
// Shows verification status
// Modern, professional design
// =====================================================

export function VerificationBanner() {
  const { profile, isLoading } = useUserProfile()

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-zinc-700/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-zinc-700/50 rounded animate-pulse" />
            <div className="h-3 w-48 bg-zinc-700/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Already verified - don't show banner
  if (profile.verification_status === 'verified') {
    return null
  }

  // Pending verification
  if (profile.verification_status === 'pending') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-900/90 border border-amber-500/20 p-6">
        {/* Subtle glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-start gap-5">
          {/* Icon with animation */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-7 h-7 text-amber-400" />
            </div>
            {/* Animated pulse ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping opacity-20" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">Verifizierung wird bearbeitet</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                In Prüfung
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Dein Account wird von unserem Team geprüft. Nach erfolgreicher Verifizierung
              erhältst du vollen Zugang zu allen Features.
            </p>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-zinc-500">Durchschnittliche Bearbeitungszeit: 24h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Rejected
  if (profile.verification_status === 'rejected') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-900/90 to-zinc-900/90 border border-red-500/20 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />

        <div className="relative flex items-start gap-5">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">Verifizierung abgelehnt</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                Abgelehnt
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Leider konnte dein Account nicht verifiziert werden. Bitte kontaktiere
              unseren Support für weitere Informationen.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors border border-zinc-700">
              Support kontaktieren
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default VerificationBanner
