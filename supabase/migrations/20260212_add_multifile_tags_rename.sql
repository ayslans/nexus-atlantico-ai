-- Tabela para múltiplos arquivos por edital
CREATE TABLE public.edital_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_size INTEGER,
  arquivo_hash TEXT,
  criterios_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(edital_id, arquivo_hash)
);

-- Tabela para tags/highlights dos critérios
CREATE TABLE public.criterio_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criterio_id UUID NOT NULL REFERENCES public.criterios(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  cor_destaque TEXT DEFAULT '#FFE5B4',
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(criterio_id, tag)
);

-- Adicionar coluna para nome customizado do edital
ALTER TABLE public.editais ADD COLUMN IF NOT EXISTS nome_customizado TEXT;

-- Adicionar coluna para rastrear arquivo principal (compatibilidade)
ALTER TABLE public.editais ADD COLUMN IF NOT EXISTS arquivo_principal_id UUID REFERENCES public.edital_arquivos(id) ON DELETE SET NULL;

-- Adicionar coluna de arquivo_arquivos
ALTER TABLE public.criterios ADD COLUMN IF NOT EXISTS arquivo_id UUID REFERENCES public.edital_arquivos(id) ON DELETE SET NULL;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.edital_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterio_tags ENABLE ROW LEVEL SECURITY;

-- Políticas para edital_arquivos
CREATE POLICY "Usuarios podem ver arquivos de seus editais"
ON public.edital_arquivos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = edital_arquivos.edital_id 
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem criar arquivos nos seus editais"
ON public.edital_arquivos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = edital_arquivos.edital_id 
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem atualizar arquivos de seus editais"
ON public.edital_arquivos FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = edital_arquivos.edital_id 
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem deletar arquivos de seus editais"
ON public.edital_arquivos FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = edital_arquivos.edital_id 
  AND editais.user_id = auth.uid()
));

-- Políticas para criterio_tags
CREATE POLICY "Usuarios podem ver tags de criterios nos seus editais"
ON public.criterio_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.criterios c
  JOIN public.editais e ON e.id = c.edital_id
  WHERE c.id = criterio_tags.criterio_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem criar tags em criterios nos seus editais"
ON public.criterio_tags FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.criterios c
  JOIN public.editais e ON e.id = c.edital_id
  WHERE c.id = criterio_tags.criterio_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem atualizar tags de criterios nos seus editais"
ON public.criterio_tags FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.criterios c
  JOIN public.editais e ON e.id = c.edital_id
  WHERE c.id = criterio_tags.criterio_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem deletar tags de criterios nos seus editais"
ON public.criterio_tags FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.criterios c
  JOIN public.editais e ON e.id = c.edital_id
  WHERE c.id = criterio_tags.criterio_id 
  AND e.user_id = auth.uid()
));
