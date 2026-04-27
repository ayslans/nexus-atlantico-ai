# Tender Hunter AI - Estrutura Monorepo

Projeto reorganizado em três componentes principais: **frontend**, **backend** e **smart**.

## Estrutura de Diretórios

```
tender-hunter-ai/
├── frontend/              # React + Vite (TypeScript)
│   ├── src/               # Código-fonte do React
│   ├── public/            # Arquivos estáticos
│   ├── dist/              # Build de produção
│   ├── package.json       # Dependências do frontend
│   ├── vite.config.ts     # Configuração do Vite
│   ├── tsconfig.app.json  # TypeScript config
│   ├── vitest.config.ts   # Testes
│   ├── index.html         # Ponto de entrada HTML
│   └── ...
│
├── backend/               # Supabase + Deno (Edge Functions)
│   ├── supabase/          # Configuração e funções Supabase
│   │   ├── config.toml    # Config Supabase local
│   │   ├── functions/     # Funções Edge (Deno)
│   │   │   ├── extract-criterios/
│   │   │   ├── analyze-personas/
│   │   │   ├── generate-proposal-model/
│   │   │   ├── simulate-proposal/
│   │   │   └── _shared/
│   │   └── migrations/    # Migrations do banco de dados
│   ├── deno.json          # Configuração Deno
│   └── ...
│
├── smart/                 # Lógica de IA e Inteligência
│   ├── functions/         # Referência às funções de IA
│   ├── prompts/           # Templates de prompts
│   └── README.md          # Documentação de IA
│
├── README.md              # Este arquivo
├── AGENTS.md              # Instruções para agentes (WARP)
├── .env                   # Variáveis de ambiente (raiz)
├── tsconfig.json          # TypeScript config da raiz
├── COMPLETE_SCHEMA_MIGRATION.sql
└── ...
```

## Como Trabalhar com Cada Componente

### Frontend
```bash
cd frontend

# Desenvolvimento
npm run dev              # Inicia dev server Vite (porta 8080)
npm run build           # Build de produção
npm run preview         # Preview do build

# Testes e Linting
npm run test            # Testes com Vitest
npm run test:watch      # Modo watch
npm run lint            # ESLint
```

### Backend (Supabase/Deno)
```bash
cd backend

# Supabase local
supabase start          # Inicia Supabase localmente

# Funções Edge
supabase functions deploy                    # Deploy de todas
supabase functions logs extract-criterios    # Ver logs de uma função

# Deno (direto)
deno task dev           # Se houver task definida
```

### Smart (IA)
```bash
cd smart
# Contém documentação, prompts e referências às funções de IA
# Ver smart/README.md para detalhes
```

## Variáveis de Ambiente

### Frontend (`.env` em `frontend/` ou raiz)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Backend (`.env` em `backend/` ou raiz)
```env
GEMINI_API_KEY=your-gemini-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## Arquitetura

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase Edge Functions (Deno) com Google Gemini 2.0 Flash
- **Database**: PostgreSQL (Supabase)
- **AI Model**: Google Generative AI (Gemini 2.0 Flash)

## Build de Produção

```bash
# Frontend
cd frontend
npm run build       # Gera em frontend/dist

# Backend (Edge Functions)
cd backend
supabase functions deploy

# Deploy no Vercel (frontend) + Supabase (backend)
```

## Notas

- Arquivos de configuração raiz (tsconfig.json, README.md, etc.) gerenciam o projeto como um todo
- Cada componente (frontend, backend, smart) é semi-independente
- Variáveis de ambiente podem estar na raiz ou em cada componente
- `.git` está na raiz - todo o monorepo é um único repositório

## Resolução de Conflitos

Se houve conflito em `src/integrations/supabase/types.ts` antes da reorganização, ele agora estará em:
```
frontend/src/integrations/supabase/types.ts
```
Resolva seguindo as instruções em AGENTS.md.
