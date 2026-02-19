// @ts-nocheck
// Edge function para geração avançada de modelo de proposta usando IA
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Prompts especializados para análise multi-etapa
const ANALYSIS_PROMPTS = {
  estrutura: `Você é um especialista em elaboração de propostas para editais de fomento. Analise os critérios do edital e extraia a ESTRUTURA COMPLETA que a proposta deve seguir.

Para cada seção identificada, forneça:
- Título da seção
- Descrição do que deve conter
- Se é obrigatória ou opcional
- Pontuação máxima (se mencionada)
- Conteúdo sugerido baseado nas melhores práticas

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "estrutura": [
    {
      "id": "uuid-único",
      "titulo": "Nome da Seção",
      "descricao": "O que deve conter esta seção",
      "conteudo_sugerido": "Orientações detalhadas de como escrever esta seção",
      "pontuacao_maxima": 20,
      "obrigatorio": true,
      "ordem": 1
    }
  ]
}`,

  checklist: `Você é um auditor de conformidade especializado em propostas de fomento. Analise os critérios e crie um CHECKLIST COMPLETO de todos os itens que devem ser verificados antes da submissão.

Categorize cada item em:
- documento: documentos que devem ser anexados
- conteudo: informações que devem estar presentes na proposta
- formato: requisitos de formatação (páginas, fonte, etc)
- prazo: datas e prazos importantes

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "checklist": [
    {
      "id": "uuid-único",
      "item": "Descrição do item a verificar",
      "categoria": "documento|conteudo|formato|prazo",
      "obrigatorio": true,
      "verificado": false
    }
  ]
}`,

  criterios_avaliacao: `Você é um avaliador de propostas de fomento. Analise os critérios do edital e identifique todos os CRITÉRIOS DE AVALIAÇÃO e seus pesos.

Para cada critério, forneça uma dica estratégica de como maximizar a pontuação.

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "criterios_avaliacao": [
    {
      "criterio": "Nome do critério",
      "peso": 25,
      "dica": "Estratégia para maximizar pontuação neste critério"
    }
  ]
}`,

  analise_estrategica: `Você é um consultor estratégico especializado em propostas vencedoras de fomento. Analise os critérios do edital e forneça:

1. Um resumo executivo do que o edital busca
2. Lista de anexos necessários
3. Requisitos obrigatórios que, se não atendidos, eliminam a proposta
4. Dicas estratégicas para aumentar as chances de aprovação

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "resumo_executivo": "Texto resumindo o objetivo do edital e perfil ideal do proponente",
  "anexos_necessarios": ["Anexo 1", "Anexo 2"],
  "requisitos_obrigatorios": ["Requisito 1", "Requisito 2"],
  "dicas_estrategicas": ["Dica 1", "Dica 2", "Dica 3"]
}`
};

// Função para gerar UUID simples
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para chamar Gemini com retry
async function callGeminiWithRetry(
  systemPrompt: string,
  userContent: string,
  geminiKey: string,
  maxRetries: number = 3
): Promise<{ success: boolean; content: any }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Gemini call attempt ${attempt + 1}/${maxRetries}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: systemPrompt + '\n\nCRITÉRIOS DO EDITAL:\n' + userContent }]
            }],
            generationConfig: {
              temperature: 0.3, // Baixa temperatura para respostas mais consistentes
              topP: 0.8,
              topK: 40,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini error (attempt ${attempt + 1}):`, response.status, errorText);

        // Se for rate limit, esperar antes de retry
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error('Empty response from Gemini');
      }

      // Extrair JSON da resposta (pode vir com markdown code blocks)
      let jsonContent = textContent.trim();

      // Remove possible markdown code blocks
      if (jsonContent.startsWith('```')) {
        const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1].trim();
        }
      }

      // If there's still extra text around the JSON, try to find the first { and last }
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      // Tentar parsear JSON
      try {
        const parsed = JSON.parse(jsonContent);
        return { success: true, content: parsed };
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Content:', jsonContent.substring(0, 500));
        if (attempt < maxRetries - 1) continue;
        throw new Error('Failed to parse AI response as JSON');
      }

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) {
        return { success: false, content: null };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return { success: false, content: null };
}

// Função principal para gerar modelo de proposta
async function generateProposalModel(
  criteriosText: string,
  editalNome: string,
  geminiKey: string
): Promise<any> {
  console.log(`Generating proposal model for: ${editalNome}`);

  // Executar análises em paralelo para otimizar tempo
  const [estruturaResult, checklistResult, criteriosResult, estrategiaResult] = await Promise.all([
    callGeminiWithRetry(ANALYSIS_PROMPTS.estrutura, criteriosText, geminiKey),
    callGeminiWithRetry(ANALYSIS_PROMPTS.checklist, criteriosText, geminiKey),
    callGeminiWithRetry(ANALYSIS_PROMPTS.criterios_avaliacao, criteriosText, geminiKey),
    callGeminiWithRetry(ANALYSIS_PROMPTS.analise_estrategica, criteriosText, geminiKey),
  ]);

  // Verificar se todas as análises foram bem sucedidas
  if (!estruturaResult.success || !checklistResult.success ||
    !criteriosResult.success || !estrategiaResult.success) {
    throw new Error('Falha em uma ou mais análises de IA. Tente novamente.');
  }

  // Garantir que todos os itens tenham IDs únicos
  const estrutura = (estruturaResult.content.estrutura || []).map((item: any, idx: number) => ({
    ...item,
    id: item.id || generateUUID(),
    ordem: item.ordem || idx + 1,
    obrigatorio: item.obrigatorio !== false,
  }));

  const checklist = (checklistResult.content.checklist || []).map((item: any) => ({
    ...item,
    id: item.id || generateUUID(),
    verificado: false,
    obrigatorio: item.obrigatorio !== false,
    categoria: ['documento', 'conteudo', 'formato', 'prazo'].includes(item.categoria)
      ? item.categoria
      : 'conteudo',
  }));

  const criteriosAvaliacao = (criteriosResult.content.criterios_avaliacao || []).map((item: any) => ({
    criterio: item.criterio || 'Critério não especificado',
    peso: typeof item.peso === 'number' ? item.peso : 0,
    dica: item.dica || '',
  }));

  // Montar modelo completo
  const proposalModel = {
    titulo: `Modelo de Proposta - ${editalNome}`,
    resumo_executivo: estrategiaResult.content.resumo_executivo ||
      'Análise do edital para construção de proposta competitiva.',
    estrutura,
    checklist,
    criterios_avaliacao: criteriosAvaliacao,
    anexos_necessarios: estrategiaResult.content.anexos_necessarios || [],
    requisitos_obrigatorios: estrategiaResult.content.requisitos_obrigatorios || [],
    dicas_estrategicas: estrategiaResult.content.dicas_estrategicas || [],
  };

  // Adicionar itens de checklist baseados na estrutura (se não houver para conteúdo)
  const contentChecklistItems = checklist.filter((c: any) => c.categoria === 'conteudo');
  if (contentChecklistItems.length === 0 && estrutura.length > 0) {
    estrutura.forEach((section: any) => {
      proposalModel.checklist.push({
        id: generateUUID(),
        item: `Incluir seção "${section.titulo}" na proposta`,
        categoria: 'conteudo',
        obrigatorio: section.obrigatorio,
        verificado: false,
      });
    });
  }

  // Adicionar itens de checklist baseados nos anexos
  const docChecklistItems = checklist.filter((c: any) => c.categoria === 'documento');
  if (docChecklistItems.length === 0 && proposalModel.anexos_necessarios.length > 0) {
    proposalModel.anexos_necessarios.forEach((anexo: string) => {
      proposalModel.checklist.push({
        id: generateUUID(),
        item: `Anexar: ${anexo}`,
        categoria: 'documento',
        obrigatorio: true,
        verificado: false,
      });
    });
  }

  return proposalModel;
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

    // Autenticar usuário
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
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { criteriosText, editalNome, editalId } = await req.json();

    if (!criteriosText || typeof criteriosText !== 'string' || criteriosText.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Critérios insuficientes para gerar modelo de proposta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating proposal model for edital: ${editalNome} (${editalId})`);

    const proposalModel = await generateProposalModel(
      criteriosText,
      editalNome,
      GEMINI_API_KEY
    );

    console.log(`Proposal model generated successfully with ${proposalModel.estrutura.length} sections and ${proposalModel.checklist.length} checklist items`);

    // Opcional: Salvar o modelo no banco de dados
    // const { error: saveError } = await supabaseAuth.from('proposal_models').insert({
    //   edital_id: editalId,
    //   model_data: proposalModel,
    // });

    return new Response(
      JSON.stringify({
        success: true,
        proposalModel,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-proposal-model:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro ao gerar modelo de proposta'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
