import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Loader2,
  LogOut,
  CreditCard,
  Crown,
  ArrowUpRight,
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  FileText,
  Save,
  Store,
  Edit3,
  X,
} from 'lucide-react'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCheckout } from '@src/hooks/useCheckout'
import { useUserProfile, type OnboardingData } from '@src/hooks/useAdmin'
import { useToastStore } from '@src/lib/store'
import { supabase } from '@src/lib/supabase'

// =====================================================
// COUNTRIES LIST
// =====================================================

const COUNTRIES = [
  { code: 'DE', name: 'Deutschland' },
  { code: 'AT', name: 'Österreich' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'NL', name: 'Niederlande' },
  { code: 'BE', name: 'Belgien' },
  { code: 'FR', name: 'Frankreich' },
  { code: 'IT', name: 'Italien' },
  { code: 'ES', name: 'Spanien' },
  { code: 'PL', name: 'Polen' },
  { code: 'GB', name: 'Großbritannien' },
  { code: 'US', name: 'USA' },
] as const

// =====================================================
// ACCOUNT SETTINGS COMPONENT
// =====================================================

export function AccountSettings() {
  const { user, signOut } = useAuth()
  const { subscription, loading: subLoading } = useSubscription()
  const { openCustomerPortal, isLoading: isPortalLoading, error: portalError } = useCheckout()
  const { profile, isLoading: profileLoading, saveOnboardingData, isSavingOnboarding } =
    useUserProfile()
  const addToast = useToastStore((state) => state.addToast)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    accountType: 'individual' as 'individual' | 'company',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    taxId: '',
    billingStreet: '',
    billingCity: '',
    billingZip: '',
    billingCountry: 'DE',
    shopifyDomain: '',
  })

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setProfileForm({
        accountType: profile.account_type || 'individual',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        companyName: profile.company_name || '',
        phone: profile.phone || '',
        taxId: profile.tax_id || '',
        billingStreet: profile.billing_street || '',
        billingCity: profile.billing_city || '',
        billingZip: profile.billing_zip || '',
        billingCountry: profile.billing_country || 'DE',
        shopifyDomain: profile.shopify_domain || '',
      })
    }
  }, [profile])

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    // Validation
    if (!profileForm.firstName.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Vorname ist erforderlich.' })
      return
    }
    if (!profileForm.lastName.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Nachname ist erforderlich.' })
      return
    }
    if (profileForm.accountType === 'company' && !profileForm.companyName.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Firmenname ist erforderlich.' })
      return
    }
    if (!profileForm.billingStreet.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Straße ist erforderlich.' })
      return
    }
    if (!profileForm.billingCity.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Stadt ist erforderlich.' })
      return
    }
    if (!profileForm.billingZip.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'PLZ ist erforderlich.' })
      return
    }
    if (!profileForm.shopifyDomain.trim()) {
      addToast({ type: 'error', title: 'Fehler', description: 'Shopify Domain ist erforderlich.' })
      return
    }

    const data: OnboardingData = {
      account_type: profileForm.accountType,
      first_name: profileForm.firstName,
      last_name: profileForm.lastName,
      company_name: profileForm.companyName || undefined,
      phone: profileForm.phone || undefined,
      tax_id: profileForm.taxId || undefined,
      billing_street: profileForm.billingStreet,
      billing_city: profileForm.billingCity,
      billing_zip: profileForm.billingZip,
      billing_country: profileForm.billingCountry,
      shopify_domain: profileForm.shopifyDomain,
    }

    try {
      await saveOnboardingData(data)
      setIsEditingProfile(false)
    } catch {
      // Error is handled in the hook
    }
  }

  const handleCancelEdit = () => {
    // Reset form to profile data
    if (profile) {
      setProfileForm({
        accountType: profile.account_type || 'individual',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        companyName: profile.company_name || '',
        phone: profile.phone || '',
        taxId: profile.tax_id || '',
        billingStreet: profile.billing_street || '',
        billingCity: profile.billing_city || '',
        billingZip: profile.billing_zip || '',
        billingCountry: profile.billing_country || 'DE',
        shopifyDomain: profile.shopify_domain || '',
      })
    }
    setIsEditingProfile(false)
  }

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

  const getCountryName = (code: string) => {
    return COUNTRIES.find((c) => c.code === code)?.name || code
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-violet-400" />
            Profil
          </h3>
          {!isEditingProfile ? (
            <button
              onClick={() => { setIsEditingProfile(true) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Bearbeiten
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingOnboarding}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-400 disabled:bg-violet-500/50 text-white rounded-lg transition-colors"
              >
                {isSavingOnboarding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          )}
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : isEditingProfile ? (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Account Type */}
            <div>
              <label className="label">Account-Typ</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { handleProfileChange('accountType', 'individual') }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    profileForm.accountType === 'individual'
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                  Privatperson
                </button>
                <button
                  type="button"
                  onClick={() => { handleProfileChange('accountType', 'company') }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    profileForm.accountType === 'company'
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  Unternehmen
                </button>
              </div>
            </div>

            {/* Company Name (only for companies) */}
            {profileForm.accountType === 'company' && (
              <div>
                <label className="label">
                  Firmenname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.companyName}
                  onChange={(e) => { handleProfileChange('companyName', e.target.value) }}
                  className="input"
                  placeholder="Musterfirma GmbH"
                />
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Vorname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => { handleProfileChange('firstName', e.target.value) }}
                  className="input"
                  placeholder="Max"
                />
              </div>
              <div>
                <label className="label">
                  Nachname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => { handleProfileChange('lastName', e.target.value) }}
                  className="input"
                  placeholder="Mustermann"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">Telefon (optional)</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => { handleProfileChange('phone', e.target.value) }}
                className="input"
                placeholder="+49 123 456789"
              />
            </div>

            {/* Tax ID (only for companies) */}
            {profileForm.accountType === 'company' && (
              <div>
                <label className="label">USt-ID (optional)</label>
                <input
                  type="text"
                  value={profileForm.taxId}
                  onChange={(e) => { handleProfileChange('taxId', e.target.value) }}
                  className="input"
                  placeholder="DE123456789"
                />
              </div>
            )}

            {/* Billing Address */}
            <div className="pt-4 border-t border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-400" />
                Rechnungsadresse
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="label">
                    Straße & Hausnummer <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.billingStreet}
                    onChange={(e) => { handleProfileChange('billingStreet', e.target.value) }}
                    className="input"
                    placeholder="Musterstraße 123"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">
                      PLZ <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.billingZip}
                      onChange={(e) => { handleProfileChange('billingZip', e.target.value) }}
                      className="input"
                      placeholder="12345"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">
                      Stadt <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.billingCity}
                      onChange={(e) => { handleProfileChange('billingCity', e.target.value) }}
                      className="input"
                      placeholder="Berlin"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Land <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={profileForm.billingCountry}
                    onChange={(e) => { handleProfileChange('billingCountry', e.target.value) }}
                    className="input"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Shopify Domain */}
            <div className="pt-4 border-t border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-violet-400" />
                Shopify Store
              </h4>
              <div>
                <label className="label">
                  Shopify Domain <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.shopifyDomain}
                  onChange={(e) => { handleProfileChange('shopifyDomain', e.target.value) }}
                  className="input"
                  placeholder="dein-store.myshopify.com"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Beispiel: mein-shop.myshopify.com oder meine-domain.de
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
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

            {/* Account Type & Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Account-Typ</label>
                <div className="input bg-zinc-800 flex items-center gap-2">
                  {profile?.account_type === 'company' ? (
                    <>
                      <Building2 className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">Unternehmen</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-300">Privatperson</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Name</label>
                <div className="input bg-zinc-800 text-zinc-300">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : '-'}
                </div>
              </div>
            </div>

            {/* Company Name (if company) */}
            {profile?.account_type === 'company' && (
              <div>
                <label className="label">Firmenname</label>
                <div className="input bg-zinc-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{profile.company_name || '-'}</span>
                </div>
              </div>
            )}

            {/* Phone & Tax ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Telefon</label>
                <div className="input bg-zinc-800 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{profile?.phone || '-'}</span>
                </div>
              </div>
              {profile?.account_type === 'company' && (
                <div>
                  <label className="label">USt-ID</label>
                  <div className="input bg-zinc-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-300">{profile.tax_id || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Billing Address */}
            <div className="pt-4 border-t border-zinc-700">
              <label className="label flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-400" />
                Rechnungsadresse
              </label>
              <div className="input bg-zinc-800 text-zinc-300">
                {profile?.billing_street ? (
                  <div>
                    <div>{profile.billing_street}</div>
                    <div>
                      {profile.billing_zip} {profile.billing_city}
                    </div>
                    <div>{getCountryName(profile.billing_country || 'DE')}</div>
                  </div>
                ) : (
                  '-'
                )}
              </div>
            </div>

            {/* Shopify Domain */}
            <div className="pt-4 border-t border-zinc-700">
              <label className="label flex items-center gap-2">
                <Store className="w-4 h-4 text-violet-400" />
                Shopify Domain
              </label>
              <div className="input bg-zinc-800 text-zinc-300 font-mono">
                {profile?.shopify_domain || '-'}
              </div>
            </div>

            {/* User ID */}
            <div className="pt-4 border-t border-zinc-700">
              <label className="label">Benutzer-ID</label>
              <div className="input bg-zinc-800 text-zinc-500 text-sm font-mono">{user?.id}</div>
            </div>
          </div>
        )}
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
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.bg} ${tierInfo.color}`}
              >
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
              <button onClick={openCustomerPortal} disabled={isPortalLoading} className="btn-secondary w-full">
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
          <button onClick={() => { setIsChangingPassword(true) }} className="btn-secondary">
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
                onChange={(e) => { setNewPassword(e.target.value) }}
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
                onChange={(e) => { setConfirmPassword(e.target.value) }}
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
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Passwort ändern
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-red-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Gefahrenzone</h3>

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
