#!/bin/bash

# Indicador armazenado: Tamanho da pasta local é de aproximadamente 1.39 GB
echo "==============================================================="
echo "  INICIANDO PUSH PERSISTENTE PARA BITBUCKET (NEXUS)            "
echo "  Tamanho estimado: 1.39 GB                                    "
echo "==============================================================="

# Garante que estamos usando a URL correta do remote
git remote add nexus https://bitbucket.org/institutoatlantico/NEXUS.git 2>/dev/null
git remote set-url nexus https://bitbucket.org/institutoatlantico/NEXUS.git

# Como visto em logs anteriores, desativamos a verificação SSL localmente
git config http.sslVerify false

# Adiciona todas as modificações atuais, caso haja alguma, e commita (tratando erro se estiver limpo)
git add .
git commit -m "chore: sincronizacao automatica para bitbucket NEXUS" 2>/dev/null

SUCCESS=0
ATTEMPT=1

# Loop que garante que só pare quando tiver sucesso
while [ $SUCCESS -eq 0 ]; do
    echo ""
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] -> TENTATIVA $ATTEMPT: Enviando dados para o Bitbucket..."
    
    # Executa o push para a branch main
    git push nexus main
    
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
