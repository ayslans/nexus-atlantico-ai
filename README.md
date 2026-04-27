# Tender Hunter AI

**Análise inteligente de editais brasileiros com IA (Google Gemini 2.0 Flash)**

Veja [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) para detalhes sobre a nova arquitetura monorepo (frontend, backend, smart).

## Início Rápido

Requisitos: Node.js, npm e [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Frontend

```sh
cd frontend
npm install
npm run dev          # Abre em http://localhost:8080
```

### Backend (Supabase + Deno)

```sh
cd backend
supabase start       # Inicia Supabase localmente
supabase functions deploy  # Deploy das funções
```

### Setup Completo

```sh
# Clone o repositório
git clone <YOUR_GIT_URL>
cd tender-hunter-ai

# Configure variáveis de ambiente
cp .env.example .env    # Edite com suas credenciais

# Frontend
cd frontend
npm install
npm run dev

# Em outro terminal - Backend
cd backend
supabase start
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?



Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

