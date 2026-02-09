import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Lock, Loader2, LogOut, CreditCard, Crown, ArrowUpRight, AlertCircle } from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCheckout } from '@src/hooks/useCheckout'
import { useToastStore } from '@src/lib/store'
import { supabase } from '@src/lib/supabase'

// =====================================================
// ACCOUNT SETTINGS COMPONENT
// =====================================================

export function AccountSettings() {
  const { user, signOut } = useAuth()
  const { subscription, loading: subLoading } = useSubscription()
  const { openCustomerPortal, isLoading: isPortalLoading, error: portalError } = useCheckout()
  const addToast = useToastStore((state) => state.addToast)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: 'Die Passwörter stimmen nicht überein.',
      })
      return
    }

    if (newPassword.length < 8) {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      addToast({
        type: 'success',
        title: 'Passwort geändert',
        description: 'Dein Passwort wurde erfolgreich aktualisiert.',
      })

      setIsChangingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: 'Passwort konnte nicht geändert werden.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const tierLabels = {
    basis: { name: 'Basis', color: 'text-zinc-400', bg: 'bg-zinc-700' },
    premium: { name: 'Premium', color: 'text-violet-400', bg: 'bg-violet-500/20' },
    vip: { name: 'VIP', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  }

  const currentTier = subscription?.tier || 'basis'
  const tierInfo = tierLabels[currentTier as keyof typeof tierLabels] || tierLabels.basis

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-violet-400" />
          Profil
        </h3>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="label">E-Mail Adresse</label>
            <div className="flex items-center gap-3">
              <div className="input flex-1 flex items-center gap-2 bg-zinc-800">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-300">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* User ID */}
          <div>
            <label className="label">Benutzer-ID</label>
            <div className="input bg-zinc-800 text-zinc-500 text-sm font-mono">
              {user?.id}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-violet-400" />
          Abonnement
        </h3>

        {subLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          </div>
        ) : subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Aktueller Plan</p>
                <p className="text-sm text-zinc-400">
                  Nächste Abrechnung:{' '}
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('de-DE')
                    : 'N/A'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.bg} ${tierInfo.color}`}>
                {tierInfo.name}
              </span>
            </div>

            {/* Portal Error */}
            {portalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-300 text-sm">{portalError}</p>
                </div>
              </div>
            )}

            {/* Manage Subscription Button */}
            {subscription.stripe_customer_id ? (
              <button
                onClick={openCustomerPortal}
                disabled={isPortalLoading}
                className="btn-secondary w-full"
              >
                {isPortalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Abonnement verwalten
              </button>
            ) : (
              <p className="text-sm text-zinc-500 text-center">
                Abonnement-Verwaltung noch nicht verfuegbar
              </p>
            )}

            {/* Upgrade Link */}
            {currentTier !== 'vip' && (
              <Link
                to={`/checkout?tier=${currentTier === 'basis' ? 'premium' : 'vip'}`}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                Auf {currentTier === 'basis' ? 'Premium' : 'VIP'} upgraden
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-zinc-400 mb-4">Kein aktives Abonnement</p>
            <Link to="/checkout" className="btn-primary inline-block">
              Plan auswählen
            </Link>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-violet-400" />
          Sicherheit
        </h3>

        {!isChangingPassword ? (
          <button
            onClick={() => setIsChangingPassword(true)}
            className="btn-secondary"
          >
            Passwort ändern
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="label">
                Neues Passwort
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Passwort wiederholen"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Passwort ändern
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-red-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">
          Gefahrenzone
        </h3>

        <button
          onClick={handleSignOut}
          className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Abmelden
        </button>
      </div>
    </div>
  )
}

export default AccountSettings
