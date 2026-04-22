// @ts-ignore: remote Deno std import for runtime
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

const ANALYSIS_PROMPTS = {
  estrutura: `Você é um especialista em elaboração de propostas para editais de fomento. Analise os critérios do edital e extraia a ESTRUTURA COMPLETA que a proposta deve seguir.

Para cada seção identificada, forneça:
- Título da seção
- Descrição do que deve conter
- Se é obrigatória ou opcional
- Pontuação máxima (se mencionada)
- Conteúdo sugerido baseado nas melhores práticas

IMPORTANTE:
1. Retorne APENAS um JSON válido no formato abaixo.
2. Utilize um tom extremamente profissional, refinado e técnico.
3. NUNCA utilize emojis ou símbolos informais no conteúdo sugerido ou nas descrições.

{
  "estrutura": [
    {
      "id": "uuid-único",
      "titulo": "Nome da Seção",
      "descricao": "Descrição técnica e profissional",
      "conteudo_sugerido": "Orientações formais e detalhadas",
      "pontuacao_maxima": 20,
      "obrigatorio": true,
      "ordem": 1
    }
  ]
}`,

  checklist: `Você é um auditor de conformidade especializado em propostas de fomento. Analise os critérios e crie um CHECKLIST COMPLETO de todos os itens necessários para a submissão.

Categorize cada item em: documento, conteudo, formato ou prazo.

IMPORTANTE:
1. Retorne APENAS um JSON válido no formato abaixo.
2. Seja preciso, formal e profissional.
3. Não utilize emojis no texto dos itens.

{
  "checklist": [
    {
      "id": "uuid-único",
      "item": "Descrição formal do item",
      "categoria": "documento|conteudo|formato|prazo",
      "obrigatorio": true,
      "verificado": false
    }
  ]
}`,

  criterios_avaliacao: `Você é um avaliador experiente de propostas de fomento. Identifique todos os CRITÉRIOS DE AVALIAÇÃO e seus pesos. Para cada critério, forneça uma diretriz estratégica formal.

IMPORTANTE:
1. Retorne APENAS um JSON válido no formato abaixo.
2. Utilize linguagem polida e profissional.
3. Não utilize emojis.

{
  "criterios_avaliacao": [
    {
      "criterio": "Nome do critério",
      "peso": 25,
      "dica": "Diretriz estratégica formal para o critério"
    }
  ]
}`,

  analise_estrategica: `Você é um consultor estratégico especialista em captação de recursos. Analise os critérios e forneça:
1. Resumo executivo (objetivo e perfil ideal).
2. Lista de anexos necessários.
3. Requisitos eliminatórios críticos.
4. Diretrizes de alto nível para sucesso.

IMPORTANTE:
1. Retorne APENAS um JSON válido no formato abaixo.
2. Mantenha um tom executivo, sóbrio e refinado.
3. PROIBIDO o uso de emojis.

{
  "resumo_executivo": "Texto formal e objetivo",
  "anexos_necessarios": ["Item A", "Item B"],
  "requisitos_obrigatorios": ["Requisito X", "Requisito Y"],
  "dicas_estrategicas": ["Diretriz 1", "Diretriz 2"]
}`
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseAIJsonResponse(text: string): unknown {
  let jsonContent = text.trim();

  if (jsonContent.startsWith('```')) {
    const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonContent = match[1].trim();
    }
  }

  const firstBrace = jsonContent.indexOf('{');
  const lastBrace = jsonContent.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Content:', jsonContent.substring(0, 500));
    throw new Error('Falha ao parsear resposta da IA como JSON.');
  }
}

async function callGemini(
  systemPrompt: string,
  userContent: string,
  geminiKey: string,
  maxRetries: number = 5
): Promise<{ success: boolean; content: unknown }> {
  const result = await callGeminiWithRetry(systemPrompt, userContent, geminiKey, { temperature: 0.4 }, maxRetries);
  if (!result.success || !result.content) {
    return { success: false, content: null };
  }
  try {
    const parsed = parseAIJsonResponse(result.content);
    return { success: true, content: parsed };
  } catch (e) {
    return { success: false, content: null };
  }
}

interface ChecklistItem {
  id: string;
  item: string;
  categoria: 'documento' | 'conteudo' | 'formato' | 'prazo';
  obrigatorio: boolean;
  verificado: boolean;
}

async function generateProposalModel(
  criteriosText: string,
  editalNome: string,
  geminiKey: string
): Promise<Record<string, unknown>> {
  console.log(`Gerando modelo de proposta para: ${editalNome}`);

  const [estruturaResult, checklistResult, criteriosResult, estrategiaResult] = await Promise.all([
    callGemini(ANALYSIS_PROMPTS.estrutura, criteriosText, geminiKey),
    callGemini(ANALYSIS_PROMPTS.checklist, criteriosText, geminiKey),
    callGemini(ANALYSIS_PROMPTS.criterios_avaliacao, criteriosText, geminiKey),
    callGemini(ANALYSIS_PROMPTS.analise_estrategica, criteriosText, geminiKey),
  ]);

  if (!estruturaResult.success || !checklistResult.success || !criteriosResult.success || !estrategiaResult.success) {
    const errors = [estruturaResult, checklistResult, criteriosResult, estrategiaResult]
      .filter((result) => !result.success)
      .map((result) => String(result.content));
    throw new Error(`Falha em uma ou mais análises de IA: ${errors.join(' | ')}`);
  }

  const estrutura = Array.isArray((estruturaResult.content as any).estrutura)
    ? (estruturaResult.content as any).estrutura
    : [];

  const checklist = Array.isArray((checklistResult.content as any).checklist)
    ? (checklistResult.content as any).checklist
    : [];

  const criteriosAvaliacao = Array.isArray((criteriosResult.content as any).criterios_avaliacao)
    ? (criteriosResult.content as any).criterios_avaliacao
    : [];

  const estrategia = estrategiaResult.content as any || {};

  const normalizedEstrutura = estrutura.map((item: any, idx: number) => ({
    id: typeof item.id === 'string' && item.id.length > 0 ? item.id : generateUUID(),
    titulo: item.titulo || `Seção ${idx + 1}`,
    descricao: item.descricao || '',
    conteudo_sugerido: item.conteudo_sugerido || '',
    pontuacao_maxima: typeof item.pontuacao_maxima === 'number' ? item.pontuacao_maxima : null,
    obrigatorio: item.obrigatorio !== false,
    ordem: typeof item.ordem === 'number' ? item.ordem : idx + 1,
  }));

  const normalizedChecklist: ChecklistItem[] = checklist.map((item: any) => ({
    id: typeof item.id === 'string' && item.id.length > 0 ? item.id : generateUUID(),
    item: item.item || 'Item não definido',
    categoria: ['documento', 'conteudo', 'formato', 'prazo'].includes(item.categoria)
      ? item.categoria
      : 'conteudo',
    obrigatorio: item.obrigatorio !== false,
    verificado: false,
  }));

  if (!normalizedChecklist.some((item) => item.categoria === 'conteudo') && normalizedEstrutura.length > 0) {
    normalizedEstrutura.forEach((section: any) => {
      normalizedChecklist.push({
        id: generateUUID(),
        item: `Incluir seção "${section.titulo}" na proposta`,
        categoria: 'conteudo',
        obrigatorio: Boolean(section.obrigatorio),
        verificado: false,
      });
    });
  }

  const anexos = Array.isArray(estrategia.anexos_necessarios)
    ? estrategia.anexos_necessarios.filter((item: any) => typeof item === 'string')
    : [];
  const requisitos = Array.isArray(estrategia.requisitos_obrigatorios)
    ? estrategia.requisitos_obrigatorios.filter((item: any) => typeof item === 'string')
    : [];
  const dicas = Array.isArray(estrategia.dicas_estrategicas)
    ? estrategia.dicas_estrategicas.filter((item: any) => typeof item === 'string')
    : [];

  anexos.forEach((anexo: string) => {
    normalizedChecklist.push({
      id: generateUUID(),
      item: `Anexar: ${anexo}`,
      categoria: 'documento',
      obrigatorio: true,
      verificado: false,
    });
  });

  return {
    titulo: `Modelo de Proposta - ${editalNome}`,
    resumo_executivo: typeof estrategia.resumo_executivo === 'string'
      ? estrategia.resumo_executivo
      : 'Análise do edital para construção de proposta competitiva.',
    estrutura: normalizedEstrutura,
    checklist: normalizedChecklist,
    criterios_avaliacao: criteriosAvaliacao.map((item: any) => ({
      criterio: item.criterio || 'Critério não especificado',
      peso: typeof item.peso === 'number' ? item.peso : 0,
      dica: item.dica || '',
    })),
    anexos_necessarios: anexos,
    requisitos_obrigatorios: requisitos,
    dicas_estrategicas: dicas,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não está configurada.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null);
    const criteriosText = body?.criteriosText;
    const editalNome = body?.editalNome;

    if (!criteriosText || typeof criteriosText !== 'string' || criteriosText.length < 50) {
      return new Response(JSON.stringify({ error: 'Critérios insuficientes para gerar modelo de proposta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!editalNome || typeof editalNome !== 'string') {
      return new Response(JSON.stringify({ error: 'Nome do edital inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const proposalModel = await generateProposalModel(criteriosText, editalNome, GEMINI_API_KEY);

    return new Response(JSON.stringify({ success: true, proposalModel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na função generate-proposal-model:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
