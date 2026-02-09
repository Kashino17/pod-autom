import { useState, useEffect, useCallback } from 'react'
import {
  User,
  Building2,
  MapPin,
  Store,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useUserProfile, type OnboardingData } from '@src/hooks/useAdmin'

// =====================================================
// TYPES
// =====================================================

type AccountType = 'individual' | 'company'

interface FormData {
  accountType: AccountType
  firstName: string
  lastName: string
  companyName: string
  phone: string
  taxId: string
  billingStreet: string
  billingCity: string
  billingZip: string
  billingCountry: string
  shopifyDomain: string
}

const INITIAL_FORM_DATA: FormData = {
  accountType: 'individual',
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
}

const STEPS = [
  { id: 1, title: 'Account-Typ', icon: User },
  { id: 2, title: 'Persönliche Daten', icon: User },
  { id: 3, title: 'Rechnungsadresse', icon: MapPin },
  { id: 4, title: 'Shopify Store', icon: Store },
] as const

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
// STEP COMPONENTS
// =====================================================

interface StepProps {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
  errors: Partial<Record<keyof FormData, string>>
}

function Step1AccountType({ formData, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Wie nutzt du POD AutoM?</h2>
        <p className="text-zinc-400">Wähle deinen Account-Typ für die korrekte Rechnungsstellung.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Individual Option */}
        <button
          type="button"
          onClick={() => { onChange('accountType', 'individual') }}
          className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
            formData.accountType === 'individual'
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
          }`}
        >
          {formData.accountType === 'individual' && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-500/20 mb-4">
            <User className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Privatperson</h3>
          <p className="text-sm text-zinc-400">Für persönliche Nutzung ohne Gewerbe.</p>
        </button>

        {/* Company Option */}
        <button
          type="button"
          onClick={() => { onChange('accountType', 'company') }}
          className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
            formData.accountType === 'company'
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
          }`}
        >
          {formData.accountType === 'company' && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20 mb-4">
            <Building2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Unternehmen</h3>
          <p className="text-sm text-zinc-400">Für geschäftliche Nutzung mit USt-ID.</p>
        </button>
      </div>
    </div>
  )
}

function Step2PersonalData({ formData, onChange, errors }: StepProps) {
  const isCompany = formData.accountType === 'company'

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {isCompany ? 'Firmendaten' : 'Persönliche Daten'}
        </h2>
        <p className="text-zinc-400">Diese Daten werden für die Rechnungsstellung verwendet.</p>
      </div>

      <div className="space-y-4">
        {/* Company Name (only for companies) */}
        {isCompany && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Firmenname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => { onChange('companyName', e.target.value) }}
              placeholder="Musterfirma GmbH"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.companyName ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
            )}
          </div>
        )}

        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Vorname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => { onChange('firstName', e.target.value) }}
              placeholder="Max"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.firstName ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nachname <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => { onChange('lastName', e.target.value) }}
              placeholder="Mustermann"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.lastName ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Phone (optional) */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Telefon <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => { onChange('phone', e.target.value) }}
            placeholder="+49 123 456789"
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
        </div>

        {/* Tax ID (optional, only for companies) */}
        {isCompany && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              USt-ID <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => { onChange('taxId', e.target.value) }}
              placeholder="DE123456789"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Step3BillingAddress({ formData, onChange, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Rechnungsadresse</h2>
        <p className="text-zinc-400">Wohin sollen deine Rechnungen adressiert werden?</p>
      </div>

      <div className="space-y-4">
        {/* Street */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Straße & Hausnummer <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.billingStreet}
            onChange={(e) => { onChange('billingStreet', e.target.value) }}
            placeholder="Musterstraße 123"
            className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
              errors.billingStreet ? 'border-red-500' : 'border-zinc-700'
            }`}
          />
          {errors.billingStreet && (
            <p className="mt-1 text-sm text-red-400">{errors.billingStreet}</p>
          )}
        </div>

        {/* City & ZIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              PLZ <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.billingZip}
              onChange={(e) => { onChange('billingZip', e.target.value) }}
              placeholder="12345"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.billingZip ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
            {errors.billingZip && (
              <p className="mt-1 text-sm text-red-400">{errors.billingZip}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Stadt <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.billingCity}
              onChange={(e) => { onChange('billingCity', e.target.value) }}
              placeholder="Berlin"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.billingCity ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
            {errors.billingCity && (
              <p className="mt-1 text-sm text-red-400">{errors.billingCity}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Land <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.billingCountry}
            onChange={(e) => { onChange('billingCountry', e.target.value) }}
            className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all appearance-none cursor-pointer ${
              errors.billingCountry ? 'border-red-500' : 'border-zinc-700'
            }`}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.billingCountry && (
            <p className="mt-1 text-sm text-red-400">{errors.billingCountry}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Step4ShopifyDomain({ formData, onChange, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Dein Shopify Store</h2>
        <p className="text-zinc-400">Gib die Domain deines Shopify Stores ein.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Shopify Domain <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.shopifyDomain}
              onChange={(e) => { onChange('shopifyDomain', e.target.value) }}
              placeholder="dein-store.myshopify.com"
              className={`w-full px-4 py-3 bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.shopifyDomain ? 'border-red-500' : 'border-zinc-700'
              }`}
            />
          </div>
          {errors.shopifyDomain && (
            <p className="mt-1 text-sm text-red-400">{errors.shopifyDomain}</p>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            Beispiel: mein-shop.myshopify.com oder meine-domain.de
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-zinc-300">
                Nach dem Absenden wird dein Account von unserem Team geprüft. Du erhältst dann
                Zugang zur Shopify-App-Installation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface OnboardingModalProps {
  onComplete?: () => void
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { saveOnboardingData, isSavingOnboarding, profile } = useUserProfile()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  // Pre-fill form data from profile if available
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
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
      }))
    }
  }, [profile])

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when field changes
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [])

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Partial<Record<keyof FormData, string>> = {}

      if (step === 2) {
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'Vorname ist erforderlich'
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Nachname ist erforderlich'
        }
        if (formData.accountType === 'company' && !formData.companyName.trim()) {
          newErrors.companyName = 'Firmenname ist erforderlich'
        }
      }

      if (step === 3) {
        if (!formData.billingStreet.trim()) {
          newErrors.billingStreet = 'Straße ist erforderlich'
        }
        if (!formData.billingCity.trim()) {
          newErrors.billingCity = 'Stadt ist erforderlich'
        }
        if (!formData.billingZip.trim()) {
          newErrors.billingZip = 'PLZ ist erforderlich'
        }
        if (!formData.billingCountry.trim()) {
          newErrors.billingCountry = 'Land ist erforderlich'
        }
      }

      if (step === 4) {
        if (!formData.shopifyDomain.trim()) {
          newErrors.shopifyDomain = 'Shopify Domain ist erforderlich'
        }
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [formData]
  )

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }, [currentStep, validateStep])

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) return

    const data: OnboardingData = {
      account_type: formData.accountType,
      first_name: formData.firstName,
      last_name: formData.lastName,
      company_name: formData.companyName || undefined,
      phone: formData.phone || undefined,
      tax_id: formData.taxId || undefined,
      billing_street: formData.billingStreet,
      billing_city: formData.billingCity,
      billing_zip: formData.billingZip,
      billing_country: formData.billingCountry,
      shopify_domain: formData.shopifyDomain,
    }

    try {
      await saveOnboardingData(data)
      onComplete?.()
    } catch (error) {
      console.error('Onboarding error:', error)
    }
  }, [formData, saveOnboardingData, onComplete, validateStep])

  // Prevent escape key and click outside from closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => { document.removeEventListener('keydown', handleKeyDown, true) }
  }, [])

  const CurrentStepComponent = {
    1: Step1AccountType,
    2: Step2PersonalData,
    3: Step3BillingAddress,
    4: Step4ShopifyDomain,
  }[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900/95 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with progress */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Willkommen bei POD AutoM</h1>
                <p className="text-sm text-zinc-400">Schritt {currentStep} von 4</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      isActive
                        ? 'bg-violet-500 text-white'
                        : isCompleted
                          ? 'bg-violet-500/20 text-violet-400'
                          : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded transition-all ${
                        isCompleted ? 'bg-violet-500' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {CurrentStepComponent && (
            <CurrentStepComponent formData={formData} onChange={handleChange} errors={errors} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              currentStep === 1
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSavingOnboarding}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-emerald-500/50 disabled:to-emerald-600/50 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSavingOnboarding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Abschließen
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
