import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

async function callGemini(prompt: string, context: string, geminiKey: string) {
    const result = await callGeminiWithRetry(prompt, context, geminiKey, {
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: 8192,
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

        const systemPrompt = `Você é um Especialista Sênior em Captação de Recursos e Redação de Propostas para Editais de Fomento Público e Privado. Sua tarefa é escrever uma SIMULAÇÃO DE PROPOSTA COMPLETA e persuasiva, baseada na estrutura e nos critérios fornecidos.

    ESTRUTURA DESEJADA (siga esta ordem de seções):
    ${JSON.stringify(proposalModel.estrutura, null, 2)}

    DIRETRIZES OBRIGATÓRIAS DE REDAÇÃO:
    1. Escreva o CONTEÚDO REAL de cada seção — não instruções sobre o que escrever, mas o texto final pronto para uso.
    2. Tom executivo, profissional e persuasivo. NUNCA utilize emojis ou linguagem informal.
    3. Cada seção deve demonstrar alinhamento explícito com os critérios de avaliação do edital.
    4. Inclua dados, métricas e indicadores plíveis onde cabença (ex: estimativas de impacto, cronograma, equipe).
    5. Seja persuasivo: antecipe as perguntas da banca avaliadora e responda-as no próprio texto.
    6. Formate a saída em Markdown elegante: use ## para seções principais, ### para subseções, tabelas quando cabível.
    7. A proposta deve soar como se fosse escrita por um proponente experiente e competitivo.

    A saída deve ser o texto FINAL da proposta simulada, pronto para ser revisado e submetido.`;

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
