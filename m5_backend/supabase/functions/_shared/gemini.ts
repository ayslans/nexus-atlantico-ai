// deno-types="https://deno.land/std@0.168.0/http/server.ts"

export interface GeminiResponse {
  success: boolean;
  content: string | null;
  error: string | null;
}

export async function callGeminiWithRetry(
  prompt: string,
  userContent: string,
  geminiKey: string,
  generationConfig: Record<string, unknown> = { temperature: 0.4 },
  maxRetries: number = 5
): Promise<GeminiResponse> {
  const initialDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${prompt}\n\n${userContent}` }] }],
          generationConfig,
        }),
      });

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return { success: true, content: content ?? null, error: null };
      }

      const errorText = await geminiResponse.text();
      console.error(`Gemini error (attempt ${attempt}):`, geminiResponse.status, errorText);

      if ((geminiResponse.status === 429 || geminiResponse.status === 503) && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`Gemini API rate limit/timeout. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      
      if (geminiResponse.status === 429) {
          return { success: false, content: null, error: 'O limite de uso da API de IA foi atingido. Verifique seu plano de faturamento ou tente novamente mais tarde.' };
      }
      return { success: false, content: null, error: `Erro na API Gemini: ${geminiResponse.status} - ${errorText}` };

    } catch (error) {
      console.error(`Gemini call failed on attempt ${attempt}:`, error);
      if (attempt >= maxRetries) {
        return { success: false, content: null, error: error instanceof Error ? error.message : 'Falha na requisição de rede para a API' };
      }
      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(res => setTimeout(res, delay));
    }
  }

  return { success: false, content: null, error: 'Falha na chamada da API Gemini após múltiplas tentativas.' };
}
