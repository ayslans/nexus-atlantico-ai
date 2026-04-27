-- Adicionar coluna para características da proposta
ALTER TABLE public.analise_personas_saidas ADD COLUMN IF NOT EXISTS caracteristicas_proposta_text TEXT;
