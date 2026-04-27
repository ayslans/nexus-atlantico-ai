# Smart - AI & Intelligence Layer

Este diretório centraliza toda a lógica de inteligência artificial e análise avançada do projeto Tender Hunter AI.

## Estrutura

```
smart/
├── functions/          # Funções principais de IA
│   ├── extract-criterios/      # Extração de critérios do edital (Gemini 2.0 Flash)
│   ├── analyze-personas/       # Análise com personas especializadas
│   ├── generate-proposal-model/ # Geração de modelos de proposta
│   └── simulate-proposal/       # Simulação de proposta
├── prompts/            # Templates de prompts otimizados
│   ├── extract-criterios.prompt
│   ├── analyze-personas.prompt
│   ├── generate-proposal-model.prompt
│   └── simulate-proposal.prompt
└── README.md          # Este arquivo
```

## Personas Disponíveis

- **auditor** - Análise de conformidade e requisitos regulatórios
- **consultor** - Perspectiva de P&D e inovação
- **orcamentario** - Análise orçamentária e de custos
- **caracteristicas** - Requisitos de características da proposta

## Modelo de IA

- **LLM**: Google Gemini 2.0 Flash
- **Configuração**: 
  - Extract: temperature 0.2, topP 0.9, maxOutputTokens 8192
  - Analyze: temperature 0.7

## Referências

As funções reais estão em `../backend/supabase/functions/`. Este diretório serve como ponto de organização central para:
- Documentação de prompts
- Templates reutilizáveis
- Configurações de modelos
- Métricas e testes de qualidade
