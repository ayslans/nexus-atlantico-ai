// Este arquivo é destinado à execução em ambiente Deno/Supabase Edge Functions.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERSONAS = {
  auditor: {
    name: "Auditor de Conformidade",
    prompt: `Você é um Auditor de Conformidade especializado em agências de fomento. Sua função é validar rigorosamente os critérios de elegibilidade eliminatórios (Pass/Fail). Ignore o mérito técnico. Extraia:
1) Quem pode participar?
2) Quem está explicitamente proibido?
3) Qual o prazo exato?
Se houver ambiguidade, marque como 'Requer Atenção Humana'.

Responda em formato markdown estruturado com as seções acima. Mantenha um tom profissional, técnico e objetivo. Evite o uso de emojis.`
  },
  consultor: {
    name: "Consultor Sênior de P&D e Inovação",
    prompt: `Você é um Consultor Sênior de P&D e Inovação. Analise o escopo técnico do edital e identifique:
1) Linhas temáticas prioritárias.
2) Nível de maturidade tecnológica (TRL) exigido.
3) Definição de inovação do edital.
4) Resumo dos critérios de pontuação técnica.

Responda em formato markdown estruturado com as seções acima. Utilize um tom analítico, refinado e profissional. Não utilize emojis.`
  },
  orcamentario: {
    name: "Analista Orçamentário de Projetos",
    prompt: `Você é um Analista Orçamentário de Projetos. Analise as regras financeiras do edital e extraia:
1) Teto e piso financeiro do apoio.
2) Regras de contrapartida obrigatória.
3) Itens financiáveis e vedações.

Responda em formato markdown estruturado com as seções acima. Seja preciso com valores e percentuais. Mantenha um tom formal e profissional, sem o uso de emojis.`
  },
  caracteristicas: {
    name: "Características da Proposta",
    prompt: `Você é um Especialista Sênior em Elaboração de Propostas para Editais de Fomento. Realize uma análise estratégica detalhada das características necessárias para uma proposta vencedora.

## ANÁLISE OBRIGATÓRIA:

### 1. ESTRUTURA E FORMATO DA PROPOSTA
- Requisitos de páginas e formato.
- Regras de formatação (fonte, idioma, seções).

### 2. CRITÉRIOS DE AVALIAÇÃO E PONTUAÇÃO
- Pesos, pontuações e critérios eliminatórios vs classificatórios.

### 3. REQUISITOS ELIMINATÓRIOS
- Fatores de desclassificação imediata e documentos críticos.

### 4. DOCUMENTOS E ANEXOS OBRIGATÓRIOS
- Lista completa e ordem de apresentação.

### 5. ELEMENTOS DIFERENCIADORES
- Fatores de bonificação e impacto valorizado pelo edital.

### 6. PONTOS DE ATENÇÃO
- Armadilhas e ambiguidades que requerem cuidado.

Responda em formato markdown estruturado. Utilize um tom extremamente profissional, refinado e detalhista. NUNCA utilize emojis ou símbolos informais na sua resposta.`
  }
};

// Call Google Gemini API
async function callGemini(systemPrompt: string, userContent: string, geminiKey: string) {
  console.log('Calling Google Gemini API...');
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt + '\n\n' + userContent }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return { success: true, content };
    } else {
      const error = await geminiResponse.text();
      console.error('Gemini error:', geminiResponse.status, error);
      return { success: false, content: null };
    }
  } catch (error) {
    console.error('Gemini call failed:', error);
    return { success: false, content: null };
  }
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

    const userContent = `Analise os seguintes critérios extraídos do edital "${editalNome}":\n\n${criteriosText}`;

    const aiResult = await callGemini(selectedPersona.prompt, userContent, GEMINI_API_KEY);

    if (!aiResult.success) {
      return new Response(
        JSON.stringify({ error: 'Erro ao processar análise com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = aiResult.content;

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
