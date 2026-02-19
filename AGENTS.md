# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

Tender Hunter AI is a Vite + React (TypeScript) frontend that uploads edital PDFs (Brazilian public tender documents), extracts criteria, and runs AI analyses via Supabase Edge Functions (Deno) that call Google Gemini 2.0 Flash.

**Key runtime split**: frontend (client-side React) and serverless AI workers under `supabase/functions`.

## Commands

```bash
# Development
npm run dev           # Start Vite dev server (default port 8080)
npm run preview       # Preview production build locally

# Build
npm run build         # Production build
npm run build:dev     # Development build

# Testing
npm run test          # Run tests once (Vitest)
npm run test:watch    # Run tests in watch mode

# Linting
npm run lint          # Run ESLint

# Supabase Functions
supabase functions deploy                    # Deploy all edge functions
supabase functions logs extract-criterios    # View function logs
supabase start                               # Start local Supabase
```

## Architecture

### Frontend (`src/`)
- **Entry**: `src/main.tsx` → `src/App.tsx` → `src/pages/Index.tsx`
- **Auth flow**: `useAuth` hook checks session; unauthenticated users see `AuthForm`, authenticated users see `Dashboard`
- **PDF upload flow**: `UploadZone.tsx` → `pdfParser.ts` (uses pdfjs-dist CDN worker) → calls `extract-criterios` Edge Function
- **Path alias**: `@` resolves to `./src` (configured in `vite.config.ts`)

### Supabase Edge Functions (`supabase/functions/`)
Two Deno-based serverless functions that call Google Gemini:

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `extract-criterios` | Extract selection criteria from PDF text | `{ editalId: UUID, pdfContent: string }` | Writes to `criterios` table; returns `{ criterios: [...] }` |
| `analyze-personas` | Analyze criteria with specialized AI personas | `{ persona, criteriosText, editalNome }` | `{ persona: string, analysis: string (markdown) }` |

**Personas available**: `auditor` (compliance), `consultor` (R&D/innovation), `orcamentario` (budget), `caracteristicas` (proposal requirements)

### Database Tables (Supabase/PostgreSQL)
- `editais` - Main tender documents (user_id, nome, status, arquivo_path)
- `criterios` - Extracted criteria linked to editais (titulo, conteudo, secao, ordem, tags)
- `edital_arquivos` - Multiple files per edital
- `criterio_tags` - User-applied tags on criteria
- `analise_personas_saidas` - Cached AI analysis outputs

## Environment Variables

**Frontend** (prefixed with `VITE_`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Edge Functions** (set in Supabase dashboard or `.env`):
- `GEMINI_API_KEY` - Required for AI functions
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

## Critical Conventions

### Do NOT Edit
- `src/integrations/supabase/client.ts` - Auto-generated Supabase client
- `src/integrations/supabase/types.ts` - Auto-generated DB types (currently has a merge conflict that needs resolution)

### Edge Functions
- Use Deno runtime patterns (no Node.js APIs)
- Maintain existing CORS headers structure
- Keep AI prompt response-format requirements intact — the frontend depends on exact JSON shapes
- `extract-criterios` uses chunking (85KB chunks with 3KB overlap) for long documents

### AI Integration
- Model: `gemini-2.0-flash` via Google Generative AI API
- `extract-criterios`: temperature 0.2, topP 0.9, maxOutputTokens 8192
- `analyze-personas`: temperature 0.7

### When Changing AI Function Contracts
If you modify the JSON response format of an Edge Function, update:
1. The function itself under `supabase/functions/`
2. All frontend consumers that parse that response
3. Any DB insert logic that depends on the schema

## Note

There is currently a merge conflict in `src/integrations/supabase/types.ts` (lines 153-228) between `HEAD` and `parent of bc3d295`. This should be resolved before making DB-related changes.
