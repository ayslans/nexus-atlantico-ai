// deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// deno-types="https://esm.sh/@supabase/supabase-js@2.49.4"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
          temperature: 0.3,
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please set GEMINI_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { editalId, pdfContent } = await req.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!editalId || !uuidRegex.test(editalId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing editalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PDF content
    if (!pdfContent || typeof pdfContent !== 'string' || pdfContent.length < 100) {
      return new Response(
        JSON.stringify({ error: 'PDF content is too short or empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pdfContent.length > 500000) {
      return new Response(
        JSON.stringify({ error: 'PDF content exceeds maximum allowed size' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing edital: ${editalId}`);

    // Create supabase client with service role for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the edital exists and get its name
    const { data: edital, error: editalError } = await supabaseAdmin
      .from('editais')
      .select('id, nome')
      .eq('id', editalId)
      .maybeSingle();

    if (editalError || !edital) {
      console.error('Edital not found:', editalError);
      return new Response(
        JSON.stringify({ error: 'Edital not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabaseAdmin
      .from('editais')
      .update({ status: 'processando' })
      .eq('id', editalId);

    // Call AI to extract criteria
    const systemPrompt = `Você é um especialista em análise de editais de licitação e seleção pública brasileiros.

Sua tarefa é extrair TODOS os critérios de seleção, avaliação, pontuação ou classificação presentes no edital.

REGRAS IMPORTANTES:
1. Extraia o texto EXATAMENTE como está no documento, sem alterar NENHUMA palavra
2. Identifique critérios de: habilitação, pontuação técnica, avaliação de propostas, classificação, desempate, etc.
3. Preserve a formatação original incluindo numeração, alíneas e subalíneas
4. Agrupe por seção quando aplicável (ex: "Habilitação", "Proposta Técnica", "Proposta de Preços")

FORMATO DE RESPOSTA (JSON):
{
  "criterios": [
    {
      "titulo": "Título ou identificador do critério (ex: 'Critério 5.1.1')",
      "conteudo": "Texto integral do critério exatamente como está no edital",
      "secao": "Nome da seção onde o critério está (ex: 'Habilitação Técnica')",
      "ordem": 1
    }
  ]
}

Se não encontrar critérios de seleção, retorne: { "criterios": [] }`;

    console.log('Calling AI for criteria extraction...');
    
    const userContent = `Analise o seguinte edital e extraia todos os critérios de seleção:\n\n${pdfContent}`;
    
    const aiResult = await callGemini(systemPrompt, userContent, GEMINI_API_KEY);

    if (!aiResult.success) {
      console.error('AI processing failed');
      await supabaseAdmin
        .from('editais')
        .update({ status: 'erro', erro_mensagem: 'Erro ao processar com IA' })
        .eq('id', editalId);
      
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = aiResult.content;
    if (!content) {
      console.error('No content in AI response');
      await supabaseAdmin
        .from('editais')
        .update({ status: 'erro', erro_mensagem: 'Resposta vazia da IA' })
        .eq('id', editalId);
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedCriterios;
    try {
      parsedCriterios = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      await supabaseAdmin
        .from('editais')
        .update({ status: 'erro', erro_mensagem: 'Falha ao interpretar resposta da IA' })
        .eq('id', editalId);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const criterios = parsedCriterios.criterios || [];
    console.log(`Found ${criterios.length} criteria`);

    // Insert criteria into database
    if (criterios.length > 0) {
      const criteriosToInsert = criterios.map((c: any, index: number) => ({
        edital_id: editalId,
        titulo: c.titulo || null,
        conteudo: c.conteudo,
        secao: c.secao || null,
        ordem: c.ordem || index + 1,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('criterios')
        .insert(criteriosToInsert);

      if (insertError) {
        console.error('Failed to insert criteria:', insertError);
        await supabaseAdmin
          .from('editais')
          .update({ status: 'erro', erro_mensagem: 'Falha ao salvar critérios' })
          .eq('id', editalId);
        return new Response(
          JSON.stringify({ error: 'Failed to save criteria' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update edital status to completed
    await supabaseAdmin
      .from('editais')
      .update({ status: 'concluido' })
      .eq('id', editalId);

    console.log('Processing complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        criteriosCount: criterios.length,
        editalNome: edital.nome
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-criterios:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});