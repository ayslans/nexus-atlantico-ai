# Instruções para Clonar para Bitbucket

Este documento descreve como fazer espelhamento do repositório GitHub para Bitbucket.

## Opção 1: Mirror Clone (Recomendado - Mantém sincronização)

```bash
# Clonar como mirror
git clone --mirror https://github.com/ayslans/nexus-atlantico-ai.git

# Criar repositório vazio no Bitbucket (via interface web):
# https://bitbucket.org/WORKSPACE/repositories/create

# Fazer push do mirror
cd nexus-atlantico-ai.git
git push --mirror https://bitbucket.org/WORKSPACE/tender-hunter-ai.git
```

## Opção 2: Clone + Push (Mais simples)

```bash
# Clone o repositório com histórico completo
git clone https://github.com/ayslans/nexus-atlantico-ai.git tender-hunter-ai
cd tender-hunter-ai

# Adicionar novo remote
git remote rename origin github
git remote add bitbucket https://bitbucket.org/WORKSPACE/tender-hunter-ai.git

# Push para Bitbucket
git push bitbucket main --all
git push bitbucket --tags
```

## Opção 3: Configurar Sincronização Automática

Após configurar os dois remotes, você pode manter ambos sincronizados:

```bash
cd tender-hunter-ai

# Adicionar ambos os remotes (se não tiver feito ainda)
git remote add github https://github.com/ayslans/nexus-atlantico-ai.git
git remote add bitbucket https://bitbucket.org/WORKSPACE/tender-hunter-ai.git

# Fazer pull do GitHub e push para Bitbucket
git pull github main
git push bitbucket main

# Ou em um passo (após setup inicial)
git push bitbucket main
```

## Estrutura Após Clone

Seu repositório Bitbucket terá a mesma estrutura monorepo:

```
tender-hunter-ai (Bitbucket)
├── frontend/        # React + Vite
├── backend/         # Supabase + Deno Functions
├── smart/           # Lógica de IA
├── AGENTS.md
├── PROJECT_STRUCTURE.md
├── README.md
└── ...
```

## Atualizar URL Local (Após criar no Bitbucket)

Se quiser trabalhar localmente apontando para o Bitbucket:

```bash
# Opção A: Manter como backup
git remote set-url origin https://bitbucket.org/WORKSPACE/tender-hunter-ai.git
git remote add github https://github.com/ayslans/nexus-atlantico-ai.git

# Opção B: Trabalhar com ambos
git remote set-url origin https://bitbucket.org/WORKSPACE/tender-hunter-ai.git
git remote add github https://github.com/ayslans/nexus-atlantico-ai.git

# Verificar remotes
git remote -v
```

## Nota Importante

- O repositório tem histórico completo com ~130 commits
- Tamanho: ~110 MB (com arquivos de node_modules se inclusos)
- Se quiser clonar sem history completo: `git clone --depth=1`

## Próximas Etapas

1. Crie os repositórios no Bitbucket (ou use repositórios existentes)
2. Use uma das opções acima para fazer push
3. Configure webhooks ou CI/CD conforme necessário
4. Atualize documentação com as URLs do Bitbucket
