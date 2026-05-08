#!/bin/bash

# Indicador armazenado: Tamanho da pasta local é de aproximadamente 1.39 GB
echo "==============================================================="
echo "  INICIANDO PUSH PERSISTENTE PARA BITBUCKET (NEXUS)            "
echo "  Tamanho estimado: 1.39 GB                                    "
echo "==============================================================="

# Garante que estamos usando a URL correta do remote
git remote add nexus https://bitbucket.org/institutoatlantico/NEX/NEXUS.git 2>/dev/null
git remote set-url nexus https://bitbucket.org/institutoatlantico/NEX/NEXUS.git



# Carrega variáveis do arquivo .env (incluindo o BITBUCKET_API_TOKEN)
. "$(dirname "$0")/.env"

# Desativa a verificação SSL/TLS localmente para contornar erros de certificado
git config --local http.sslVerify false

# Desativa o Credential Helper para evitar o fluxo de autenticação do navegador
export GIT_TERMINAL_PROMPT=1
git config --local credential.helper ""

# Ajusta a URL injetando o token diretamente para forçar a autorização
REPO_URL="https://ayslan_silva:${BITBUCKET_API_TOKEN}@bitbucket.org/institutoatlantico/NEX/NEXUS.git"

SUCCESS=0
ATTEMPT=1

# Loop que garante que só pare quando tiver sucesso
while [ $SUCCESS -eq 0 ]; do
    echo ""
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] -> TENTATIVA $ATTEMPT: Enviando dados para o Bitbucket..."
    
    # Garante que a verificação SSL/TLS seja desativada localmente antes de cada push (dupla checagem)
    git config --local http.sslVerify false

    # Executa o push para a branch main usando a URL com token
    git push "$REPO_URL" main
    
    # Verifica o código de saída do comando git push
    if [ $? -eq 0 ]; then
        echo "==============================================================="
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ PUSH REALIZADO COM SUCESSO!"
        echo "==============================================================="
        SUCCESS=1
    else
        echo "==============================================================="
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ FALHA NO PUSH."
        echo "Possível causa: Erro de Autenticação. "
        echo "Se você possui 2FA (Múltiplos Fatores) no Bitbucket, você DEVE usar uma 'App Password' em vez da sua senha normal."
        echo "Tentando novamente em 30 segundos... (Pressione Ctrl+C para abortar)"
        echo "==============================================================="
        sleep 30
        ((ATTEMPT++))
    fi
done

echo "Tarefa finalizada! O repositório NEXUS está atualizado."
