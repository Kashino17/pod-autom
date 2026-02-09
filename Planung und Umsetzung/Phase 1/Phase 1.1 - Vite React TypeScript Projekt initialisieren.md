# Phase 1.1 - Vite + React + TypeScript Projekt initialisieren

## Ziel
Erstellen des Grundgerüsts für die POD AutoM WebApp mit Vite 6.x als Build-Tool und React 19.

## Technische Anforderungen (Stand 2026)
- **Node.js**: >= 20.x LTS
- **npm**: >= 10.x
- **React**: 19.x
- **TypeScript**: 5.6+
- **Vite**: 6.x

---

## Schritte

### 1. Projekt erstellen
```bash
# In den POD AutoM Ordner wechseln
cd "POD AutoM"

# Vite Projekt mit React-TS Template erstellen
npm create vite@latest . -- --template react-ts

# Bei Abfrage "Current directory is not empty" → "y" für Ignore files
```

### 2. Dependencies installieren

#### Core Dependencies
```bash
npm install react@19 react-dom@19 react-router-dom@7 @tanstack/react-query@5 zustand@5 @supabase/supabase-js@2 lucide-react@latest recharts@2 framer-motion@11
```

#### Dev Dependencies
```bash
npm install -D tailwindcss@4 postcss autoprefixer @types/node @types/react@19 @types/react-dom@19 eslint@9 @eslint/js typescript-eslint prettier eslint-plugin-react-hooks eslint-plugin-react-refresh
```

### 3. package.json vollständig konfigurieren
```json
{
  "name": "pod-autom",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "type-check": "tsc --noEmit",
    "db:types": "npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "@supabase/supabase-js": "^2.46.0",
    "lucide-react": "^0.460.0",
    "recharts": "^2.14.0",
    "framer-motion": "^11.12.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.15.0",
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.15.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "postcss": "^8.4.49",
    "prettier": "^3.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.15.0",
    "vite": "^6.0.0"
  }
}
```

### 4. Ordnerstruktur erstellen
```bash
# Ordner erstellen
mkdir -p src/{pages,components/{layout,landing,dashboard,catalog,onboarding,ui,common},hooks,contexts,lib,styles,types,utils}
mkdir -p public/images
```

**Finale Struktur:**
```
POD AutoM/
├── public/
│   ├── favicon.svg
│   ├── logo.svg
│   ├── og-image.png              # Social Media Preview
│   └── images/
│       └── hero-mockup.webp      # Hero Section Bild
├── src/
│   ├── main.tsx                  # App Entry Point
│   ├── App.tsx                   # Root Component + Routes
│   ├── vite-env.d.ts             # Vite Type Declarations
│   │
│   ├── pages/                    # Route Pages
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── ResetPassword.tsx     # NEU: Passwort Reset
│   │   ├── VerifyEmail.tsx       # NEU: Email Verification
│   │   ├── Dashboard.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Settings.tsx
│   │   ├── Catalog.tsx
│   │   └── NotFound.tsx          # NEU: 404 Page
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── PageWrapper.tsx   # NEU: Layout Wrapper
│   │   │
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Pricing.tsx
│   │   │   ├── Testimonials.tsx  # NEU
│   │   │   ├── FAQ.tsx
│   │   │   └── CTA.tsx           # NEU: Final CTA Section
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Overview.tsx
│   │   │   ├── NicheSelector.tsx
│   │   │   ├── PromptManager.tsx
│   │   │   ├── ProductQueue.tsx
│   │   │   ├── CampaignManager.tsx
│   │   │   └── Analytics.tsx
│   │   │
│   │   ├── catalog/
│   │   │   ├── CatalogGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductDetailDialog.tsx
│   │   │   └── CountrySelector.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   ├── OnboardingLayout.tsx
│   │   │   ├── ShopConnection.tsx
│   │   │   ├── NicheSelection.tsx
│   │   │   ├── PromptConfig.tsx
│   │   │   └── AdPlatformSetup.tsx
│   │   │
│   │   ├── ui/                   # Atomic UI Components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx        # NEU
│   │   │   ├── Checkbox.tsx      # NEU
│   │   │   ├── Toggle.tsx        # NEU
│   │   │   ├── Textarea.tsx      # NEU
│   │   │   ├── Modal.tsx
│   │   │   ├── Dialog.tsx        # NEU
│   │   │   ├── Dropdown.tsx      # NEU
│   │   │   ├── Badge.tsx
│   │   │   ├── Tooltip.tsx       # NEU
│   │   │   ├── Toast.tsx         # NEU
│   │   │   ├── Skeleton.tsx      # NEU
│   │   │   ├── Spinner.tsx       # NEU
│   │   │   ├── Progress.tsx      # NEU
│   │   │   └── Avatar.tsx        # NEU
│   │   │
│   │   └── common/               # NEU: Shared Components
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingScreen.tsx
│   │       ├── EmptyState.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   ├── usePodSettings.ts
│   │   ├── useProducts.ts
│   │   ├── useMediaQuery.ts      # NEU
│   │   ├── useDebounce.ts        # NEU
│   │   ├── useLocalStorage.ts    # NEU
│   │   └── useToast.ts           # NEU
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── SubscriptionContext.tsx
│   │   ├── ThemeContext.tsx      # NEU
│   │   └── ToastContext.tsx      # NEU
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── database.types.ts     # Auto-generated
│   │   ├── store.ts
│   │   ├── constants.ts
│   │   ├── api.ts                # NEU: API Helper
│   │   └── utils.ts              # NEU: Utility Functions
│   │
│   ├── styles/
│   │   ├── index.css             # Tailwind + Custom CSS
│   │   └── animations.css        # NEU: Custom Animations
│   │
│   ├── types/
│   │   ├── index.ts              # NEU: Shared Types
│   │   └── api.ts                # NEU: API Response Types
│   │
│   └── utils/
│       ├── format.ts             # NEU: Formatierungsfunktionen
│       ├── validation.ts         # NEU: Validierungsfunktionen
│       └── cn.ts                 # NEU: className Utility
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts            # .ts statt .js für Type Safety
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── eslint.config.js
├── .prettierrc
├── .env.example
├── .env.local                    # Nicht committen!
└── .gitignore
```

### 5. index.html konfigurieren
```html
<!DOCTYPE html>
<html lang="de" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>POD AutoM - Vollautomatisierte Print-on-Demand Lösung</title>
    <meta name="title" content="POD AutoM - Vollautomatisierte Print-on-Demand Lösung" />
    <meta name="description" content="KI-generierte Designs, automatische Produkt-Erstellung und intelligentes Ad-Management. Starte dein passives Einkommen mit nur wenigen Klicks." />
    <meta name="keywords" content="Print-on-Demand, POD, Shopify, Automatisierung, KI, Passives Einkommen" />
    <meta name="author" content="POD AutoM" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://podautom.de/" />
    <meta property="og:title" content="POD AutoM - Dein POD-Shop auf Autopilot" />
    <meta property="og:description" content="KI-generierte Designs, automatische Produkt-Erstellung und intelligentes Ad-Management." />
    <meta property="og:image" content="https://podautom.de/og-image.png" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://podautom.de/" />
    <meta property="twitter:title" content="POD AutoM - Dein POD-Shop auf Autopilot" />
    <meta property="twitter:description" content="KI-generierte Designs, automatische Produkt-Erstellung und intelligentes Ad-Management." />
    <meta property="twitter:image" content="https://podautom.de/og-image.png" />

    <!-- Theme Color -->
    <meta name="theme-color" content="#000000" />

    <!-- Preconnect to External Resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- Font Loading (Optional: für Self-Hosting siehe Phase 1.2) -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

    <!-- Structured Data for SEO -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "POD AutoM",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "200",
        "highPrice": "835",
        "priceCurrency": "EUR"
      },
      "description": "Vollautomatisierte Print-on-Demand Lösung für Shopify Stores"
    }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 6. vite.config.ts konfigurieren
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // React 19 Compiler (wenn verfügbar)
      // babel: {
      //   plugins: ['babel-plugin-react-compiler']
      // }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@src': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  server: {
    port: 3001,
    strictPort: true,
    host: true,
    open: true,
  },

  preview: {
    port: 3001,
  },

  build: {
    target: 'ES2024',
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
```

### 7. tsconfig.json konfigurieren
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "useDefineForClassFields": true,
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@src/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@lib/*": ["./src/lib/*"],
      "@contexts/*": ["./src/contexts/*"],
      "@styles/*": ["./src/styles/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 8. tsconfig.node.json erstellen
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["vite.config.ts"]
}
```

### 9. ESLint konfigurieren (eslint.config.js)
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  }
)
```

### 10. Prettier konfigurieren (.prettierrc)
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 11. PostCSS konfigurieren (postcss.config.js)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 12. .env.example erstellen
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API
VITE_API_URL=http://localhost:5001

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx

# App Config
VITE_APP_NAME=POD AutoM
VITE_APP_URL=http://localhost:3001

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

### 13. .gitignore erstellen/erweitern
```gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Build
dist
dist-ssr
*.local

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# Testing
coverage
*.lcov

# Debug
*.tsbuildinfo
```

### 14. Utility-Datei erstellen (src/utils/cn.ts)
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Zusätzliche Dependencies für cn:**
```bash
npm install clsx tailwind-merge
```

### 15. Initiale main.tsx erstellen
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@styles/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## Verifizierung

### Funktionale Tests
- [ ] `npm install` läuft ohne Fehler
- [ ] `npm run dev` startet den Dev-Server
- [ ] App ist unter http://localhost:3001 erreichbar
- [ ] Hot Module Replacement (HMR) funktioniert
- [ ] `npm run build` erstellt Production Build ohne Fehler
- [ ] `npm run preview` zeigt Production Build

### Code-Qualität Tests
- [ ] `npm run lint` zeigt keine Fehler
- [ ] `npm run type-check` zeigt keine TypeScript-Fehler
- [ ] `npm run format` formatiert Code korrekt

### Path Aliases Tests
- [ ] `@src/*` Import funktioniert
- [ ] `@components/*` Import funktioniert
- [ ] `@lib/*` Import funktioniert

### Browser Tests
- [ ] Chrome DevTools zeigt keine Console-Errors
- [ ] Network Tab zeigt korrektes Chunk-Loading
- [ ] React DevTools erkennt die App

---

## Abhängigkeiten
- Node.js >= 20.x muss installiert sein
- npm >= 10.x muss installiert sein

## Geschätzte Dauer
- Erfahrener Entwickler: 30-45 Minuten
- Anfänger: 1-2 Stunden

## Nächster Schritt
→ Phase 1.2 - Tailwind Dark Theme konfigurieren
