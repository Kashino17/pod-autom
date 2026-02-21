import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import {
  NicheSelection,
  PromptConfig,
  AdPlatformSetup,
} from '@src/components/onboarding'

// =====================================================
// TYPES
// =====================================================

type OnboardingStep = 1 | 2 | 3

interface StepInfo {
  number: number
  title: string
  description: string
}

const STEPS: StepInfo[] = [
  { number: 1, title: 'Nischen wählen', description: 'Zielgruppen definieren' },
  { number: 2, title: 'KI konfigurieren', description: 'Prompts anpassen' },
  { number: 3, title: 'Ads verbinden', description: 'Werbeplattformen' },
]

// =====================================================
// ONBOARDING PAGE
// =====================================================

export default function Onboarding() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [isCompleting, setIsCompleting] = useState(false)

  // Step navigation
  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step)
  }

  const handleComplete = async () => {
    setIsCompleting(true)

    // Mark onboarding as complete (could update user metadata)
    // For now, just navigate to dashboard

    setTimeout(() => {
      navigate('/dashboard')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5" />

      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12 safe-top safe-bottom">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            TMS <span className="text-violet-500">Solvado</span>
          </h1>
        </div>

        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      currentStep > step.number
                        ? 'bg-emerald-500 text-white'
                        : currentStep === step.number
                        ? 'bg-violet-500 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-2 text-center hidden sm:block">
                    <p
                      className={`text-xs font-medium ${
                        currentStep >= step.number ? 'text-white' : 'text-zinc-500'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 sm:mx-2 ${
                      currentStep > step.number ? 'bg-emerald-500' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 sm:p-8">
          {/* Step 1: Niche Selection */}
          {currentStep === 1 && (
            <NicheSelection
              shopId={null}
              onComplete={() => goToStep(2)}
              onBack={() => navigate('/dashboard')}
            />
          )}

          {/* Step 2: Prompt Config */}
          {currentStep === 2 && (
            <PromptConfig
              shopId={null}
              onComplete={() => goToStep(3)}
              onBack={() => goToStep(1)}
            />
          )}

          {/* Step 3: Ad Platform Setup */}
          {currentStep === 3 && (
            <AdPlatformSetup
              shopId={null}
              onComplete={handleComplete}
              onBack={() => goToStep(2)}
            />
          )}

          {/* Completing overlay */}
          {isCompleting && (
            <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fertig!</h3>
              <p className="text-zinc-400">Weiterleitung zum Dashboard...</p>
            </div>
          )}
        </div>

        {/* Skip link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors py-3 px-4 touch-manipulation"
          >
            Setup überspringen und zum Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
