-- Tabela para salvar saídas de análise de personas
CREATE TABLE public.analise_personas_saidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  auditor_text TEXT,
  consultor_text TEXT,
  orcamentario_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar última saída por edital
CREATE INDEX idx_analise_personas_saidas_edital_created 
ON public.analise_personas_saidas(edital_id, created_at DESC);

ALTER TABLE public.analise_personas_saidas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários só acessam saídas de editais que possuem
CREATE POLICY "Usuarios podem ver saídas de analise de seus editais"
ON public.analise_personas_saidas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.editais
  WHERE editais.id = analise_personas_saidas.edital_id
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem inserir saídas de analise em seus editais"
ON public.analise_personas_saidas FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.editais
  WHERE editais.id = analise_personas_saidas.edital_id
  AND editais.user_id = auth.uid()
));
