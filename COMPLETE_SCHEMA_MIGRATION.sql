-- ========================================
-- CONSOLIDATED MIGRATION SCRIPT
-- Run this in Supabase Dashboard > SQL Editor
-- This creates ALL tables with ALL columns
-- ========================================

-- 1. EDITAIS TABLE
CREATE TABLE IF NOT EXISTS public.editais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome_customizado TEXT,
  arquivo_principal_id UUID
);

-- 2. CRITERIOS TABLE
CREATE TABLE IF NOT EXISTS public.criterios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  titulo TEXT,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  secao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  arquivo_id UUID
);

-- 3. EDITAL_ARQUIVOS TABLE
CREATE TABLE IF NOT EXISTS public.edital_arquivos (
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

-- 4. CRITERIO_TAGS TABLE
CREATE TABLE IF NOT EXISTS public.criterio_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criterio_id UUID NOT NULL REFERENCES public.criterios(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  cor_destaque TEXT DEFAULT '#FFE5B4',
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(criterio_id, tag)
);

-- 5. ANALISE_PERSONAS_SAIDAS TABLE
CREATE TABLE IF NOT EXISTS public.analise_personas_saidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  auditor_text TEXT,
  consultor_text TEXT,
  orcamentario_text TEXT,
  caracteristicas_proposta_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns if tables already exist
DO $$
BEGIN
    -- editais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='editais' AND column_name='nome_customizado') THEN
        ALTER TABLE public.editais ADD COLUMN nome_customizado TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='editais' AND column_name='arquivo_principal_id') THEN
        ALTER TABLE public.editais ADD COLUMN arquivo_principal_id UUID;
    END IF;
    
    -- criterios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='criterios' AND column_name='tags') THEN
        ALTER TABLE public.criterios ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='criterios' AND column_name='arquivo_id') THEN
        ALTER TABLE public.criterios ADD COLUMN arquivo_id UUID;
    END IF;
    
    -- edital_arquivos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='arquivo_size') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN arquivo_size INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='arquivo_hash') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN arquivo_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='criterios_count') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN criterios_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='status') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='erro_mensagem') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN erro_mensagem TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='edital_arquivos' AND column_name='updated_at') THEN
        ALTER TABLE public.edital_arquivos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
    
    -- analise_personas_saidas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analise_personas_saidas' AND column_name='caracteristicas_proposta_text') THEN
        ALTER TABLE public.analise_personas_saidas ADD COLUMN caracteristicas_proposta_text TEXT;
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='editais_arquivo_principal_id_fkey') THEN
        ALTER TABLE public.editais ADD CONSTRAINT editais_arquivo_principal_id_fkey 
        FOREIGN KEY (arquivo_principal_id) REFERENCES public.edital_arquivos(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='criterios_arquivo_id_fkey') THEN
        ALTER TABLE public.criterios ADD CONSTRAINT criterios_arquivo_id_fkey 
        FOREIGN KEY (arquivo_id) REFERENCES public.edital_arquivos(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_editais_user_id ON public.editais(user_id);
CREATE INDEX IF NOT EXISTS idx_editais_status ON public.editais(status);
CREATE INDEX IF NOT EXISTS idx_criterios_edital_id ON public.criterios(edital_id);
CREATE INDEX IF NOT EXISTS idx_criterios_ordem ON public.criterios(ordem);
CREATE INDEX IF NOT EXISTS idx_analise_personas_saidas_edital_created ON public.analise_personas_saidas(edital_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edital_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterio_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_personas_saidas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for editais
DROP POLICY IF EXISTS "Usuarios podem ver seus editais" ON public.editais;
CREATE POLICY "Usuarios podem ver seus editais" ON public.editais FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem criar editais" ON public.editais;
CREATE POLICY "Usuarios podem criar editais" ON public.editais FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar seus editais" ON public.editais;
CREATE POLICY "Usuarios podem atualizar seus editais" ON public.editais FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem deletar seus editais" ON public.editais;
CREATE POLICY "Usuarios podem deletar seus editais" ON public.editais FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for criterios
DROP POLICY IF EXISTS "Usuarios podem ver criterios dos seus editais" ON public.criterios;
CREATE POLICY "Usuarios podem ver criterios dos seus editais" ON public.criterios FOR SELECT
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = criterios.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem criar criterios nos seus editais" ON public.criterios;
CREATE POLICY "Usuarios podem criar criterios nos seus editais" ON public.criterios FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = criterios.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem atualizar criterios dos seus editais" ON public.criterios;
CREATE POLICY "Usuarios podem atualizar criterios dos seus editais" ON public.criterios FOR UPDATE
USING (EXISTS (SELECT 1 FROM editais WHERE editais.id = criterios.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem deletar criterios dos seus editais" ON public.criterios;
CREATE POLICY "Usuarios podem deletar criterios dos seus editais" ON public.criterios FOR DELETE
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = criterios.edital_id AND editais.user_id = auth.uid()));

-- RLS Policies for edital_arquivos
DROP POLICY IF EXISTS "Usuarios podem ver arquivos de seus editais" ON public.edital_arquivos;
CREATE POLICY "Usuarios podem ver arquivos de seus editais" ON public.edital_arquivos FOR SELECT
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem criar arquivos nos seus editais" ON public.edital_arquivos;
CREATE POLICY "Usuarios podem criar arquivos nos seus editais" ON public.edital_arquivos FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem atualizar arquivos de seus editais" ON public.edital_arquivos;
CREATE POLICY "Usuarios podem atualizar arquivos de seus editais" ON public.edital_arquivos FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem deletar arquivos de seus editais" ON public.edital_arquivos;
CREATE POLICY "Usuarios podem deletar arquivos de seus editais" ON public.edital_arquivos FOR DELETE
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = edital_arquivos.edital_id AND editais.user_id = auth.uid()));

-- RLS Policies for criterio_tags
DROP POLICY IF EXISTS "Usuarios podem ver tags de criterios nos seus editais" ON public.criterio_tags;
CREATE POLICY "Usuarios podem ver tags de criterios nos seus editais" ON public.criterio_tags FOR SELECT
USING (EXISTS (SELECT 1 FROM public.criterios c JOIN public.editais e ON e.id = c.edital_id WHERE c.id = criterio_tags.criterio_id AND e.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem criar tags em criterios nos seus editais" ON public.criterio_tags;
CREATE POLICY "Usuarios podem criar tags em criterios nos seus editais" ON public.criterio_tags FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.criterios c JOIN public.editais e ON e.id = c.edital_id WHERE c.id = criterio_tags.criterio_id AND e.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem atualizar tags de criterios nos seus editais" ON public.criterio_tags;
CREATE POLICY "Usuarios podem atualizar tags de criterios nos seus editais" ON public.criterio_tags FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.criterios c JOIN public.editais e ON e.id = c.edital_id WHERE c.id = criterio_tags.criterio_id AND e.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem deletar tags de criterios nos seus editais" ON public.criterio_tags;
CREATE POLICY "Usuarios podem deletar tags de criterios nos seus editais" ON public.criterio_tags FOR DELETE
USING (EXISTS (SELECT 1 FROM public.criterios c JOIN public.editais e ON e.id = c.edital_id WHERE c.id = criterio_tags.criterio_id AND e.user_id = auth.uid()));

-- RLS Policies for analise_personas_saidas
DROP POLICY IF EXISTS "Usuarios podem ver saídas de analise de seus editais" ON public.analise_personas_saidas;
CREATE POLICY "Usuarios podem ver saídas de analise de seus editais" ON public.analise_personas_saidas FOR SELECT
USING (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = analise_personas_saidas.edital_id AND editais.user_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem inserir saídas de analise em seus editais" ON public.analise_personas_saidas;
CREATE POLICY "Usuarios podem inserir saídas de analise em seus editais" ON public.analise_personas_saidas FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.editais WHERE editais.id = analise_personas_saidas.edital_id AND editais.user_id = auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_editais_updated_at ON public.editais;
CREATE TRIGGER update_editais_updated_at BEFORE UPDATE ON public.editais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Verification query
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('editais', 'criterios', 'edital_arquivos', 'criterio_tags', 'analise_personas_saidas')
ORDER BY table_name, ordinal_position;
