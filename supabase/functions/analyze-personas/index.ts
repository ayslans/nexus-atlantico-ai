import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERSONAS = {
  auditor: {
    name: "Auditor de Conformidade",
    prompt: `Você é um Auditor de Conformidade rigoroso de uma agência de fomento governamental. Sua única função é validar os critérios de elegibilidade eliminatórios (Pass/Fail). Ignore o mérito técnico. Extraia:
1) Quem pode participar?
2) Quem está explicitamente proibido?
3) Qual o prazo exato?
Se houver ambiguidade, marque como 'Requer Atenção Humana'.

Responda em formato markdown estruturado com as seções acima. Seja objetivo e cite trechos do edital quando relevante.`
  },
  consultor: {
    name: "Consultor Sênior de P&D e Inovação",
    prompt: `Você é um Consultor Sênior de P&D e Inovação. Sua tarefa é analisar o escopo técnico do edital. Identifique:
1) Quais são as linhas temáticas prioritárias?
2) Qual o nível de maturidade tecnológica (TRL) de entrada e saída exigido?
3) O que o edital define como 'Inovação' (incremental, disruptiva)?
4) Resuma os critérios de pontuação técnica.

Responda em formato markdown estruturado com as seções acima. Seja analítico e cite trechos do edital quando relevante.`
  },
  orcamentario: {
    name: "Analista Orçamentário de Projetos",
    prompt: `Você é um Analista Orçamentário de Projetos. Analise as regras financeiras deste edital. Extraia:
1) O teto e o piso financeiro do apoio.
2) A fórmula ou percentual da contrapartida obrigatória.
3) A lista exata de itens financiáveis (ex: equipamentos, viagens, serviços de terceiros) e itens vedados.

Responda em formato markdown estruturado com as seções acima. Seja preciso com valores e percentuais, citando trechos do edital.`
  }
};

// Call Google Gemini API
async function callGemini(systemPrompt: string, userContent: string, geminiKey: string) {
  console.log('Calling Google Gemini API...');
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
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

    const { persona, criteriosText, editalNome } = await req.json();

    if (!persona || !PERSONAS[persona as keyof typeof PERSONAS]) {
      return new Response(
        JSON.stringify({ error: 'Invalid persona. Use: auditor, consultor, orcamentario' }),
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
