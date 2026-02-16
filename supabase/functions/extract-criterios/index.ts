// deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// deno-types="https://esm.sh/@supabase/supabase-js@2.49.4"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Chunking: processar editais longos em partes para maior assertividade e cobertura
const CHUNK_SIZE = 85_000;
const CHUNK_OVERLAP = 3_000;
const MAX_CHUNKS = 25;

interface CriterioRaw {
  titulo?: string | null;
  conteudo: string;
  secao?: string | null;
  ordem?: number;
}

// Divide o texto em blocos com overlap; quebra em parágrafos quando possível
function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const paraBreak = text.lastIndexOf('\n\n', end);
      if (paraBreak > start + CHUNK_SIZE / 2) end = paraBreak + 2;
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

// Call Google Gemini API
async function callGemini(systemPrompt: string, userContent: string, geminiKey: string) {
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContent }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return { success: true, content: content ?? null };
    }
    const error = await geminiResponse.text();
    console.error('Gemini error:', geminiResponse.status, error);
    return { success: false, content: null };
  } catch (error) {
    console.error('Gemini call failed:', error);
    return { success: false, content: null };
  }
}

function buildSystemPrompt(): string {
  return `Você é um especialista em análise de editais de licitação e seleção pública brasileiros (Lei 14.133/2021, Pregão, Concorrência, etc.).

CONTEXTO E DEFINIÇÃO DE CRITÉRIO
- Critério de seleção é qualquer regra que influencie habilitação, pontuação, classificação ou desempate.
- Inclua: requisitos de habilitação (documentação, qualificação); itens de proposta técnica (metodologia, experiência, cronograma); proposta de preços ou comercial; critérios de julgamento; desempate; eliminação; exigências documentais repetidas em mais de uma seção.

REGRAS OBRIGATÓRIAS
1. Extraia o texto de forma FIEL ao edital. No campo "conteudo" você PODE usar Markdown para clareza (listas com -, **negrito**, numeração) desde que preserve o sentido e as exigências exatas.
2. REDUNDÂNCIA: Se o mesmo requisito aparecer em mais de uma seção (ex: "Atestado de capacidade" em Habilitação e em Proposta Técnica), inclua UMA entrada por contexto — ou seja, mantenha as duas com "secao" diferente. Não elimine duplicatas entre seções.
3. Preserve numeração, alíneas e subalíneas do documento.
4. "secao" deve refletir o capítulo/seção do edital (ex: "Habilitação", "Proposta Técnica", "Proposta Comercial", "Critérios de Desempate").
5. "titulo" pode ser um identificador curto (ex: "5.1.1 Experiência") ou o primeiro trecho do critério.
6. Responda SOMENTE com um JSON válido, sem texto antes ou depois.

FORMATO DE RESPOSTA (JSON):
{
  "criterios": [
    {
      "titulo": "Identificador ou título curto do critério",
      "conteudo": "Texto integral. Pode usar markdown: **negrito**, listas com -, numeração.",
      "secao": "Nome da seção/capítulo do edital",
      "ordem": 1
    }
  ]
}

Se não houver critérios nesta parte do texto, retorne: { "criterios": [] }`;
}

// Extrai e normaliza JSON da resposta (tolera markdown ao redor)
function parseCriteriosFromContent(content: string): CriterioRaw[] {
  let cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object in response');
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  cleaned = cleaned
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, '');
  const parsed = JSON.parse(cleaned);
  const list = parsed?.criterios ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((c: any) => ({
    titulo: c.titulo != null ? String(c.titulo).trim() || null : null,
    conteudo: typeof c.conteudo === 'string' ? c.conteudo.trim() : String(c.conteudo ?? '').trim(),
    secao: c.secao != null ? String(c.secao).trim() || null : null,
    ordem: typeof c.ordem === 'number' ? c.ordem : undefined,
  })).filter((c: CriterioRaw) => c.conteudo.length > 0);
}

// Remove duplicatas exatas (mesmo titulo + mesmo conteudo)
function deduplicateCriterios(criterios: CriterioRaw[]): CriterioRaw[] {
  const seen = new Set<string>();
  return criterios.filter((c) => {
    const key = `${(c.titulo ?? '').trim()}|${(c.conteudo ?? '').trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub;

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

    // Verify the edital exists and belongs to the authenticated user
    const { data: edital, error: editalError } = await supabaseAdmin
      .from('editais')
      .select('id, nome, user_id')
      .eq('id', editalId)
      .maybeSingle();

    if (editalError || !edital) {
      console.error('Edital not found:', editalError);
      return new Response(
        JSON.stringify({ error: 'Edital not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (edital.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this edital' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabaseAdmin
      .from('editais')
      .update({ status: 'processando' })
      .eq('id', editalId);

    const systemPrompt = buildSystemPrompt();
    const chunks = splitIntoChunks(pdfContent);
    console.log(`Extracting criteria (${chunks.length} chunk(s))...`);

    const allCriterios: CriterioRaw[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const partLabel = chunks.length > 1
        ? `Esta é a parte ${i + 1} de ${chunks.length} do edital. Extraia TODOS os critérios de seleção desta parte.\n\n`
        : '';
      const userContent = `${partLabel}${chunks[i]}`;
      const aiResult = await callGemini(systemPrompt, userContent, GEMINI_API_KEY);

      if (!aiResult.success || !aiResult.content) {
        console.error(`AI failed on chunk ${i + 1}`);
        await supabaseAdmin
          .from('editais')
          .update({ status: 'erro', erro_mensagem: 'Erro ao processar com IA' })
          .eq('id', editalId);
        return new Response(
          JSON.stringify({ error: 'AI processing failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const parsed = parseCriteriosFromContent(aiResult.content);
        allCriterios.push(...parsed);
        console.log(`Chunk ${i + 1}: ${parsed.length} criteria`);
      } catch (parseError) {
        console.error(`Parse error on chunk ${i + 1}:`, parseError);
        await supabaseAdmin
          .from('editais')
          .update({ status: 'erro', erro_mensagem: 'Falha ao interpretar resposta da IA' })
          .eq('id', editalId);
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const criterios = deduplicateCriterios(allCriterios).map((c, index) => ({
      ...c,
      ordem: c.ordem ?? index + 1,
    }));
    console.log(`Found ${criterios.length} criteria (after deduplication)`);

    // Insert criteria into database
    if (criterios.length > 0) {
      const criteriosToInsert = criterios.map((c, index) => ({
        edital_id: editalId,
        titulo: c.titulo ?? null,
        conteudo: c.conteudo,
        secao: c.secao ?? null,
        ordem: c.ordem ?? index + 1,
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