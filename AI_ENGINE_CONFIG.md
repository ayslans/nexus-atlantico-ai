# Configuração do Motor de IA

## Motor Atual: Google Gemini Pro

O projeto foi configurado para usar exclusivamente **Google Gemini 1.5 Pro** como motor de IA.

### Arquivos Modificados

- `supabase/functions/analyze-personas/index.ts` - Análise de personas
- `supabase/functions/extract-criterios/index.ts` - Extração de critérios de editais

### Variáveis de Ambiente Necessárias

Configure a seguinte variável de ambiente no arquivo `.env` ou no painel Supabase:

```env
# Google Gemini API  
GEMINI_API_KEY=AI...
```

### Como Obter a Chave de API

#### Google Gemini
1. Acesse [https://aistudio.google.com](https://aistudio.google.com)
2. Faça login com sua conta Google
3. Clique em "Get API key"
4. Selecione ou crie um projeto
5. Copie a chave gerada

**Modelo usado**: `gemini-1.5-pro` (modelo Pro com melhor qualidade)

### Motor de IA

O sistema utiliza exclusivamente **Google Gemini 1.5 Pro** para:
- Análise de personas de editais
- Extração de critérios de seleção
- Processamento em formatos JSON estruturados

### Funções Supabase Afetadas

#### 1. `analyze-personas` (Análise de Personas)
Analisa editais com três personas diferentes:
- Auditor de Conformidade
- Consultor Sênior de P&D
- Analista Orçamentário

**Endpoint**: `POST /api/analyze-personas`
**Modelo**: Google Gemini 1.5 Pro

#### 2. `extract-criterios` (Extração de Critérios)
Extrai critérios de seleção de PDFs de editais em formato JSON.

**Endpoint**: `POST /api/extract-criterios`
**Modelo**: Google Gemini 1.5 Pro
**Resposta em JSON**: Sim (estruturada com titulo, conteudo, secao, ordem)

### Configuração no Supabase

1. Abra o painel [Supabase](https://supabase.com)
2. Selecione seu projeto
3. Vá para **Configurações** → **Variáveis de Ambiente**
4. Adicione a chave de API:
   - `GEMINI_API_KEY`

5. Deploy as funções:
```bash
supabase functions deploy
```

### Testes Locais

Para testar localmente com as variáveis de ambiente:

```bash
# Inicie o servidor local do Supabase
supabase start

# Teste um endpoint (exemplo)
curl -X POST http://localhost:54321/functions/v1/extract-criterios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"editalId":"uuid","pdfContent":"texto..."}'
```

### Custos e Limites

**Google Gemini 1.5 Pro**:
- Plano Gratuito: Até 2 requisições por minuto (RPM)
- Plano Pago: 
  - Entrada: $1.25 por 1M tokens
  - Saída: $5.00 por 1M tokens
  - Rate limit: Até 1,000 RPM

### Troubleshooting

**Erro: "AI service not configured"**
- Verifique se `GEMINI_API_KEY` está definida no Supabase
- Verifique se a chave é válida (começa com `AI`)

**Erro: "Rate limit exceeded"**
- Gemini está com limite de 15 RPM atingido (plano gratuito)
- Upgrade para plano pago ou aguarde 1 minuto

**Erro: "AI processing failed"**
- Verifique os logs: `supabase functions logs`
- Verifique se a chave de API é válida
- Verifique a conexão de internet

### Rollback (Voltar para OpenAI + Gemini)

Se precisar voltar para a configuração com fallback:
1. Restaure os arquivos do git: `git checkout supabase/functions/`
2. Configure `OPENAI_API_KEY` e `GEMINI_API_KEY`
3. Deploy novamente: `supabase functions deploy`
