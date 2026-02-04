import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export interface Country {
  code: string
  name: string
  flag: string
}

export const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'DE', name: 'Deutschland', flag: 'de' },
  { code: 'AT', name: 'Oesterreich', flag: 'at' },
  { code: 'CH', name: 'Schweiz', flag: 'ch' },
  { code: 'EU', name: 'EU (andere)', flag: 'eu' },
  { code: 'US', name: 'USA', flag: 'us' },
]

interface CountrySelectorProps {
  value: string
  onChange: (code: string) => void
  className?: string
}

export function CountrySelector({ value, onChange, className = '' }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.code === value) ?? SUPPORTED_COUNTRIES[0]
  const displayCountry = selectedCountry ?? { code: 'DE', name: 'Deutschland', flag: 'de' }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5
                   bg-zinc-800 border border-zinc-700 rounded-lg
                   hover:border-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500
                   transition-colors"
      >
        <div className="flex items-center gap-2">
          <FlagIcon code={displayCountry.flag} />
          <span className="text-white">{displayCountry.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {SUPPORTED_COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.code)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left
                         hover:bg-zinc-700 transition-colors
                         ${country.code === value ? 'bg-violet-500/20 text-violet-400' : 'text-white'}`}
            >
              <FlagIcon code={country.flag} />
              <span>{country.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple flag component using emoji or CSS
function FlagIcon({ code }: { code: string }) {
  // Map to emoji flags
  const flagEmojis: Record<string, string> = {
    de: '\ud83c\udde9\ud83c\uddea',
    at: '\ud83c\udde6\ud83c\uddf9',
    ch: '\ud83c\udde8\ud83c\udded',
    eu: '\ud83c\uddea\ud83c\uddfa',
    us: '\ud83c\uddfa\ud83c\uddf8',
  }

  return (
    <span className="text-lg leading-none">
      {flagEmojis[code] || '\ud83c\udff3\ufe0f'}
    </span>
  )
}
