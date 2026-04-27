
-- Table for additional files attached to an edital
CREATE TABLE public.edital_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  arquivo_nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their edital files"
ON public.edital_arquivos FOR SELECT
USING (EXISTS (SELECT 1 FROM editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

CREATE POLICY "Users can insert their edital files"
ON public.edital_arquivos FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

CREATE POLICY "Users can delete their edital files"
ON public.edital_arquivos FOR DELETE
USING (EXISTS (SELECT 1 FROM editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

-- Add tags column to criterios table
ALTER TABLE public.criterios ADD COLUMN tags TEXT[] DEFAULT '{}';
