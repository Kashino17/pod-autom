# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReBoss NextGen is an e-commerce automation platform for Shopify stores. It automates product lifecycle management, ad campaign syncing (Pinterest, Meta, Google), and sales tracking with automated product replacement based on performance.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Python Flask API + Render Cron Jobs
- Database: Supabase (PostgreSQL + Auth)
- State: TanStack React Query (server) + Zustand (client)

## Development Commands

```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run db:types     # Generate Supabase types (update project ID in package.json first)

# Backend API (backend/api/)
cd backend/api
pip install -r requirements.txt
python main.py                          # Dev server on port 5001
gunicorn main:app --bind 0.0.0.0:5001   # Production

# Backend Jobs - run locally (backend/jobs/<job_name>/)
cd backend/jobs/<job_name>
pip install -r requirements.txt
python main.py
```

## Architecture

### Frontend Structure
- `src/pages/` - Route pages (Login, Dashboard, Register, ForgotPassword)
- `src/components/` - Core UI (ShopDashboard, Sidebar, AddShopDialog)
- `src/hooks/` - React hooks (useShops, usePinterest, useFastFashionResearch)
- `src/contexts/` - AuthContext for auth state
- `src/lib/` - supabase.ts client, store.ts (Zustand), database.types.ts
- `components/tabs/` - Feature tabs rendered in ShopDashboard (StartPhase, PostPhase, PinterestSync, WinnerScaling, CampaignOptimization, etc.)

Path aliases configured in tsconfig.json and vite.config.ts:
- `@/*` → root
- `@src/*` → `./src/*`
- `@components/*` → `./components/*`

### Backend Structure
```
backend/
├── api/                              # Flask API service
│   ├── main.py                       # App entry, CORS, blueprint registration
│   └── routes/                       # Route blueprints
│       ├── shopify.py                # Shopify proxy endpoints
│       ├── pinterest_oauth.py        # Pinterest OAuth flow
│       └── auth.py                   # Auth routes
└── jobs/                             # Cron jobs (each is independent with own deps)
    ├── sales_tracker_job/            # 02:00 UTC - Collect sales data from Shopify
    ├── replace_job/                  # 04:00 UTC - Replace underperforming products
    ├── product_creation_job/         # 06:00 UTC - Create products from fast fashion research
    ├── product_optimize_job/         # 08:00 UTC - GPT-powered title/description optimization
    ├── pinterest_sync_job/           # Every 4h - Sync products to Pinterest as pins/ads
    ├── pinterest_campaign_optimization_job/  # Campaign budget/bid optimization
    └── winner_scaling_job/           # Scale winning products with AI creatives
```

### Job Pattern
Each job follows the same structure:
- `main.py` - Entry point with async `run()` method, processes shops in parallel
- `models.py` - Pydantic models for data validation
- `services/supabase_service.py` - Database operations
- `services/shopify_service.py` - Shopify REST API client
- `services/pinterest_service.py` - Pinterest API client (where applicable)

Jobs use `asyncio.Semaphore` to limit concurrent shop processing (typically 2-3 at a time).

### Database Schema
Key tables (full definitions in `supabase/Aktuelle Tabellen und Spalten/`):
- `shops` - Shopify stores linked to users
- `shop_rules` - Replacement rules per shop (min_sales thresholds, phase durations)
- `pinterest_campaigns` - Pinterest campaign configs with targeting
- `campaign_batch_assignments` - Links campaigns to collection batches
- `pinterest_sync_log` - Tracks synced products/pins
- `product_analytics` - Product lifecycle tracking (start_phase → post_phase → winner/loser)
- `job_runs` - Job execution history for monitoring

## Key Patterns

### Frontend
- React Query for server state, Zustand for client state
- Supabase client initialized in `src/lib/supabase.ts`
- Auth handled via `AuthContext` with session management
- Environment variables prefixed with `VITE_`

### Backend
- Service layer pattern isolates external API calls
- All jobs use `python-dotenv` for environment variables
- Jobs log to stdout (captured by Render)
- Token refresh handled automatically for Pinterest OAuth

## Environment Variables

**Frontend (.env.local):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` - Backend API URL
- `GEMINI_API_KEY` - For AI features

**Backend API (.env):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`
- `FRONTEND_URL`, `API_URL` - For OAuth redirects

**Backend Jobs (.env per job):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY` - For product_optimize_job, winner_scaling_job

## Deployment

Render blueprint defined in `backend/render.yaml`:
- API service: `reboss-api` (Starter plan)
- Cron jobs: Each job runs on schedule with own environment

## Language

User communication is in German. Code comments and commit messages in English.
