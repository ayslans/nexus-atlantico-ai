import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

async function callGemini(prompt: string, context: string, geminiKey: string) {
    const result = await callGeminiWithRetry(prompt, context, geminiKey, {
        temperature: 0.4,
        topP: 0.8,
    });
    return result.content || '';
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

        const { proposalModel, criteriosText, analyses, editalNome } = await req.json();

        console.log(`Simulating proposal for: ${editalNome}`);

        const context = `
      Edital: ${editalNome}
      
      Análise do Auditor: ${analyses.auditor || 'N/A'}
      Análise do Consultor: ${analyses.consultor || 'N/A'}
      Análise Orçamentária: ${analyses.orcamentario || 'N/A'}
      
      CRITÉRIOS EXTRAÍDOS:
      ${criteriosText.substring(0, 5000)} // Limite para evitar estouro de contexto básico
    `;

        const systemPrompt = `Você é um Especialista Sênior em Captação de Recursos e Redação de Propostas para Editais. 
    Sua tarefa é escrever uma SIMULAÇÃO DE PROPOSTA COMPLETA baseada na estrutura fornecida.
    
    ESTRUTURA DESEJADA:
    ${JSON.stringify(proposalModel.estrutura, null, 2)}

    DIRETRIZES DE REDAÇÃO:
    1. Utilize um tom extremamente profissional, executivo e refinado.
    2. Seja persuasivo, focando em como a proposta atende aos critérios do edital.
    3. NUNCA utilize emojis ou símbolos informais.
    4. Escreva o conteúdo real que o proponente deveria utilizar, não apenas instruções.
    5. Formate a saída em Markdown elegante, com títulos claros para cada seção da estrutura.
    
    A saída deve ser o texto final da proposta simulada.`;

        const fullProposal = await callGemini(systemPrompt, context, GEMINI_API_KEY);

        if (!fullProposal) throw new Error('Falha ao gerar simulação de proposta');

        return new Response(
            JSON.stringify({ success: true, proposal: fullProposal }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('Error in simulate-proposal:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
