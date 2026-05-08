#!/bin/bash

# Indicador armazenado: Tamanho da pasta local é de aproximadamente 1.39 GB
echo "==============================================================="
echo "  INICIANDO PUSH ORGANIZADO PARA BITBUCKET (MULTIREPO)         "
echo "  Tamanho estimado do projeto total: 1.39 GB                   "
echo "==============================================================="

# Carrega variáveis do arquivo .env (incluindo o BITBUCKET_API_TOKEN)
. "$(dirname "$0")/.env"

# Desativa a verificação SSL/TLS localmente para contornar erros de certificado
git config --local http.sslVerify false

# Desativa o Credential Helper para evitar o fluxo de autenticação do navegador
export GIT_TERMINAL_PROMPT=1
git config --local credential.helper ""

# Definir URLs e Remotes para cada parte do projeto
BACKEND_REMOTE="bitbucket_m5_backend"
FRONTEND_REMOTE="bitbucket_m5_frontend"
SMART_REMOTE="bitbucket_m5_smart"
ROOT_REMOTE="bitbucket_nexus_root"

BACKEND_URL="https://ayslan_silva:${BITBUCKET_API_TOKEN}@bitbucket.org/institutoatlantico/m5_backend.git"
FRONTEND_URL="https://ayslan_silva:${BITBUCKET_API_TOKEN}@bitbucket.org/institutoatlantico/m5_frontend.git"
SMART_URL="https://ayslan_silva:${BITBUCKET_API_TOKEN}@bitbucket.org/institutoatlantico/m5_smart.git"
ROOT_URL="https://ayslan_silva:${BITBUCKET_API_TOKEN}@bitbucket.org/institutoatlantico/NEX/NEXUS.git"

# Adicionar/Atualizar remotes
git remote add $BACKEND_REMOTE $BACKEND_URL 2>/dev/null || git remote set-url $BACKEND_REMOTE $BACKEND_URL
git remote add $FRONTEND_REMOTE $FRONTEND_URL 2>/dev/null || git remote set-url $FRONTEND_REMOTE $FRONTEND_URL
git remote add $SMART_REMOTE $SMART_URL 2>/dev/null || git remote set-url $SMART_REMOTE $SMART_URL
git remote add $ROOT_REMOTE $ROOT_URL 2>/dev/null || git remote set-url $ROOT_REMOTE $ROOT_URL

# Garante que todas as modificações atuais sejam adicionadas e commitadas
git add .
git commit -m "chore: sincronizacao organizada para bitbucket" 2>/dev/null

# --- Função para PUSH persistente --- 
persistent_push() {
    local prefix=$1
    local remote=$2
    local url=$3
    local description=$4

    echo "\n---------------------------------------------------------------"
    echo "  INICIANDO PUSH para $description ($prefix)"
    echo "---------------------------------------------------------------"

    SUCCESS=0
    ATTEMPT=1
    while [ $SUCCESS -eq 0 ]; do
        echo "\n[$(date +'%Y-%m-%d %H:%M:%S')] -> TENTATIVA $ATTEMPT: Enviando $description..."
        
        # Garante a desativação SSL e helper de credenciais para esta tentativa
        git config --local http.sslVerify false
        git config --local credential.helper ""

        if [ -z "$prefix" ]; then
            # Push para arquivos da raiz (com exclusão das subpastas)
            # Usando rsync para criar um 'tree' temporário sem as subpastas e fazer o push
            echo "Copiando arquivos da raiz para push temporário..."
            TEMP_DIR="$(mktemp -d)"
            rsync -av --exclude 'm5_backend/' --exclude 'm5_frontend/' --exclude 'm5_smart/' --exclude '.git/' ./ "$TEMP_DIR"/
            (cd "$TEMP_DIR" && git init && git add . && git commit -m "Root files sync" 2>/dev/null && git remote add origin "$url" && git push -f origin main)
            RM_RESULT=$?
            rm -rf "$TEMP_DIR"
        else
            # Push para subpastas usando git subtree
            git subtree push --prefix="$prefix" "$remote" main
            RM_RESULT=$?
        fi
        
        if [ $RM_RESULT -eq 0 ]; then
            echo "\n==============================================================="
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ PUSH DE $description REALIZADO COM SUCESSO!"
            echo "==============================================================="
            SUCCESS=1
        else
            echo "\n==============================================================="
            echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ FALHA NO PUSH PARA $description."
            echo "Verifique: 1) Nome do Repositório/Projeto no Bitbucket. 2) API Token/Permissões. 3) Status do Bitbucket."
            echo "Tentando novamente em 30 segundos... (Pressione Ctrl+C para abortar)"
            echo "==============================================================="
            sleep 30
            ((ATTEMPT++))
        fi
    done
}

# --- Executar PUSH para cada parte do projeto ---
persistent_push "m5_backend" "$BACKEND_REMOTE" "$BACKEND_URL" "Backend (m5_backend)"
persistent_push "m5_frontend" "$FRONTEND_REMOTE" "$FRONTEND_URL" "Frontend (m5_frontend)"
persistent_push "m5_smart" "$SMART_REMOTE" "$SMART_URL" "Smart Logic (m5_smart)"
persistent_push "" "$ROOT_REMOTE" "$ROOT_URL" "Arquivos da Raiz do Projeto"

echo "\n==============================================================="
echo "TODAS AS TAREFAS DE PUSH FORAM CONCLUÍDAS. O Bitbucket está sincronizado."
echo "==============================================================="
