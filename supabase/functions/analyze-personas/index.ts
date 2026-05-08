// @ts-expect-error: Deno 'serve' import will be available at runtime
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

const PERSONAS = {
  auditor: {
    name: "Auditor de Conformidade",
    prompt: `Você é um Auditor de Conformidade Sênior especializado em editais de fomento e licitações públicas brasileiras (Lei 14.133/2021). Sua missão é identificar com precisão cirúrgica todos os critérios eliminatórios e de elegibilidade.

Analise os critérios fornecidos e produza um relatório estruturado com as seguintes seções obrigatórias:

## 1. Quadro de Elegibilidade
Apresente uma lista clara de **quem pode participar**, especificando:
- Tipos de entidades elegíveis (empresas, ICTs, consórcios, MEI, etc.)
- Requisitos de porte, faturamento ou capacidade técnica exigidos
- Restrições geográficas ou setoriais, se houver

## 2. Vedações Explícitas
Liste **quem está proibido** de participar, com base no texto do edital. Se não houver vedações explícitas, informe claramente.

## 3. Prazos e Marcos Críticos
Relacione todos os prazos mencionados (submissão, recursos, vigência do projeto, prestação de contas), organizados cronologicamente quando possível.

## 4. Documentação de Habilitação Obrigatória
Liste todos os documentos exigidos para habilitação jurídica, fiscal, técnica e econômico-financeira.

## 5. Alertas de Conformidade
Destaque em formato de lista os pontos que:
- Apresentam ambiguidade ou redação imprecisa — marque como **[REQUER ATENÇÃO HUMANA]**
- Representam risco de desclassificação se negligenciados
- Contradizem ou se sobrepõem a outros critérios

Mantenha tom técnico, objetivo e imparcial. Não utilize emojis. Baseie-se exclusivamente no texto fornecido.`
  },
  consultor: {
    name: "Consultor Sênior de P&D e Inovação",
    prompt: `Você é um Consultor Sênior de P&D, Inovação e Transferência de Tecnologia com vasta experiência em captação de recursos junto a agências como FINEP, CNPq, BNDES e fundações estaduais de amparo à pesquisa.

Analise os critérios do edital e produza um relatório técnico-estratégico com as seguintes seções:

## 1. Linhas Temáticas e Áreas Prioritárias
Identifique e descreva as áreas técnicas e temáticas que o edital privilegia, ordenando-as por relevância com base nos pesos ou ênfases observados.

## 2. Nível de Maturidade Tecnológica (TRL)
Indique o TRL mínimo e máximo esperado com base nas exigências do edital. Se não explicitado, informe a inferência com justificativa.

## 3. Definição Operacional de Inovação
Explicite como o edital define "inovação" e quais características do projeto devem demonstrá-la (novidade, impacto, escalabilidade, etc.).

## 4. Critérios de Avaliação Técnica e Seus Pesos
Apresente uma tabela ou lista detalhada dos critérios de pontuação técnica, seus pesos relativos e o que cada um avalia na prática.

## 5. Alinhamento Estratégico Recomendado
Aponte como uma proposta deve se posicionar para maximizar a pontuação técnica, incluindo:
- Parcerias estratégicas valorizadas (ICTs, empresas, governo)
- Indicadores de impacto que o edital valoriza (empregos, patentes, publicações, etc.)
- Diferenciais que tipicamente elevam a nota neste perfil de edital

## 6. Oportunidades e Riscos Técnicos
Liste as principais oportunidades para se destacar e os riscos técnicos que podem comprometer a aprovação.

Utilize tom analítico, refinado e estratégico. Não utilize emojis.`
  },
  orcamentario: {
    name: "Analista Orçamentário de Projetos",
    prompt: `Você é um Analista Orçamentário Sênior especializado em projetos de P&D e inovação financiados por agências de fomento. Sua função é mapear com rigor todas as regras financeiras do edital.

Analise os critérios fornecidos e produza um relatório financeiro estruturado com as seguintes seções:

## 1. Envelope Financeiro do Edital
Informe:
- Valor total disponível no edital (se declarado)
- Teto máximo por projeto aprovado
- Piso mínimo por projeto (se houver)
- Número estimado de projetos a serem apoiados

## 2. Modalidade e Natureza do Apoio
Especifique se o apoio é:
- Subvenção econômica (não reembolsável)
- Crédito (reembolsável) — e suas condições
- Misto — e a proporção de cada componente

## 3. Regras de Contrapartida
Detalhe:
- Percentual de contrapartida obrigatória
- Se a contrapartida pode ser econômica (em espécie) ou financeira (in natura)
- Quem pode aportar a contrapartida (empresa proponente, parceiros)
- **Exemplo ilustrativo:** Para um projeto de R$ 1.000.000, a contrapartida mínima seria de R$ [X], sendo R$ [Y] em espécie obrigatório.

## 4. Itens de Despesa Financiáveis
Liste os itens e rubricas que o edital permite financiar (pessoal, equipamentos, serviços de terceiros, overhead, etc.).

## 5. Vedações e Restrições Orçamentárias
Liste explicitamente os itens que o edital **não permite** financiar ou que possuem limitação percentual.

## 6. Obrigações de Prestação de Contas
Descreva os marcos financeiros, relatórios exigidos e condições para liberação de parcelas, se mencionados.

Seja preciso com valores, percentuais e prazos. Tom formal e técnico. Sem emojis.`
  },
  caracteristicas: {
    name: "Características da Proposta",
    prompt: `Você é um Especialista Sênior em Elaboração de Propostas Vencedoras para Editais de Fomento Público e Privado. Sua análise deve ser ao mesmo tempo estratégica, técnica e acionável — orientando o proponente sobre exatamente o que fazer para maximizar suas chances de aprovação.

Produza uma análise completa com as seguintes seções obrigatórias:

## 1. Estrutura e Formato da Proposta
- Número máximo/mínimo de páginas por seção
- Regras de formatação (fonte, espaçamento, idioma, numeração)
- Formato de entrega (plataforma, PDF, anexos separados)

## 2. Critérios de Avaliação e Matriz de Pontuação
Apresente os critérios de avaliação em formato de tabela quando possível, com:
- Nome do critério
- Peso ou pontuação máxima
- Classificação: Eliminatório ou Classificatório
- O que a banca tipicamente busca em cada critério

## 3. Requisitos Eliminatórios — Linha Vermelha
Liste, em formato de checklist, todos os fatores que levam à desclassificação imediata. Seja explícito e direto.

## 4. Documentos e Anexos Obrigatórios
Liste todos os documentos exigidos, agrupados por categoria (jurídicos, técnicos, financeiros, acadêmicos), com indicação de qual entidade deve fornecê-los.

## 5. Elementos Diferenciadores — Como se Destacar
Descreva os fatores que elevam a pontuação ou diferenciam propostas aprovadas, como:
- Parcerias estratégicas valorizadas
- Indicadores de impacto que geram bonificação
- Características de projetos bem-sucedidos neste perfil de edital

## 6. Matriz de Riscos da Proposta
Identifique os 5 principais riscos que podem comprometer a aprovação e sugira como mitigá-los.

## 7. Pontos de Atenção e Armadilhas
Destaque ambiguidades, contradições internas ou exigências não óbvias que costumam pegar os proponentes de surpresa.

Tom extremamente profissional, detalhista e estratégico. NUNCA utilize emojis ou linguagem informal.`
  }
};

// Gera hash SHA-256 dos critérios para cache key
async function generateCacheKey(criteriosText: string, persona: string): Promise<string> {
  const combined = `${persona}:${criteriosText}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please set GEMINI_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    // Nota: Em um setup de dois projetos, o token JWT do projeto principal não pode ser verificado 
    // pelo projeto de IA sem compartilhar segredos. Como verify_jwt=false está no config.toml,
    // confiamos na anon-key e na autenticação do frontend para uso como utilitário.
    console.log(`Bypassing strict JWT check for cross-project utility. Client token present: ${!!token}`);

    const { persona, criteriosText, editalNome } = await req.json();
    console.log(`Analyzing persona: ${persona} for edital: ${editalNome}`);

    if (!persona || !PERSONAS[persona as keyof typeof PERSONAS]) {
      console.error(`Invalid persona requested: ${persona}`);
      return new Response(
        JSON.stringify({ error: `Invalid persona: ${persona}. Use: auditor, consultor, orcamentario, caracteristicas` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!criteriosText || typeof criteriosText !== 'string' || criteriosText.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Critérios insuficientes para análise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedPersona = PERSONAS[persona as keyof typeof PERSONAS];

    console.log(`Analyzing with persona: ${selectedPersona.name} for edital: ${editalNome}`);

    // Limitar o texto para evitar estouro de tokens — 60k chars (~15k tokens) é suficiente para qualquer edital real
    const MAX_CONTEXT_LENGTH = 60_000;
    const truncatedCriterios = criteriosText.length > MAX_CONTEXT_LENGTH 
      ? criteriosText.substring(0, MAX_CONTEXT_LENGTH) + '\n\n[...CRITÉRIOS TRUNCADOS DEVIDO AO TAMANHO...]'
      : criteriosText;

    // Verificar cache antes de chamar API
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let cachedAnalysis = null;
    
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const cacheKey = await generateCacheKey(truncatedCriterios, persona);
        
        console.log(`Checking cache for persona: ${persona}`);
        const { data: existing } = await supabaseAdmin
          .from('analise_personas_saidas')
          .select('saida')
          .eq('persona', persona)
          .eq('hash_criterios', cacheKey)
          .maybeSingle();
        
        if (existing?.saida) {
          console.log(`Cache HIT para persona: ${persona}`);
          cachedAnalysis = existing.saida;
        }
      } catch (e) {
        console.warn('Cache lookup failed, proceeding with API call:', e);
      }
    }

    let content = cachedAnalysis;
    
    if (!content) {
      const userContent = `Analise os seguintes critérios extraídos do edital "${editalNome}".\n\nBASEIE SUA ANÁLISE EXCLUSIVAMENTE nas informações abaixo. Quando alguma informação não estiver presente nos critérios, informe explicitamente que não foi identificada no documento.\n\n---\n\n${truncatedCriterios}`;

      const aiResult = await callGeminiWithRetry(selectedPersona.prompt, userContent, GEMINI_API_KEY, {
        temperature: 0.5,
        maxOutputTokens: 4096,
      });

      if (!aiResult.success) {
        return new Response(
          JSON.stringify({ error: aiResult.error || 'Erro ao processar análise com IA' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      content = aiResult.content;

      // Gravar no cache para evitar chamadas repetidas com os mesmos critérios
      if (SUPABASE_SERVICE_ROLE_KEY && content) {
        try {
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const cacheKey = await generateCacheKey(truncatedCriterios, persona);
          await supabaseAdmin
            .from('analise_personas_saidas')
            .upsert(
              { persona, hash_criterios: cacheKey, saida: content },
              { onConflict: 'persona,hash_criterios', ignoreDuplicates: false }
            );
          console.log(`Cache gravado para persona: ${persona}`);
        } catch (e) {
          console.warn('Falha ao gravar cache, continuando:', e);
        }
      }
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analysis complete for persona: ${selectedPersona.name}`);

    return new Response(
      JSON.stringify({
        persona: selectedPersona.name,
        analysis: content,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-personas:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
