-- Criar bucket de storage para PDFs de editais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('editais', 'editais', false, 52428800, ARRAY['application/pdf']);

-- Política para upload de PDFs (usuários autenticados)
CREATE POLICY "Usuarios podem fazer upload de editais"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'editais' AND auth.uid() IS NOT NULL);

-- Política para leitura de PDFs próprios
CREATE POLICY "Usuarios podem ver seus editais"
ON storage.objects FOR SELECT
USING (bucket_id = 'editais' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para deletar PDFs próprios
CREATE POLICY "Usuarios podem deletar seus editais"
ON storage.objects FOR DELETE
USING (bucket_id = 'editais' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Tabela de editais
CREATE TABLE public.editais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de critérios extraídos
CREATE TABLE public.criterios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  titulo TEXT,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  secao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios ENABLE ROW LEVEL SECURITY;

-- Políticas para editais
CREATE POLICY "Usuarios podem ver seus editais"
ON public.editais FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios podem criar editais"
ON public.editais FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios podem atualizar seus editais"
ON public.editais FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios podem deletar seus editais"
ON public.editais FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para critérios (via relacionamento com edital)
CREATE POLICY "Usuarios podem ver criterios dos seus editais"
ON public.criterios FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = criterios.edital_id 
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem criar criterios nos seus editais"
ON public.criterios FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = criterios.edital_id 
  AND editais.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem deletar criterios dos seus editais"
ON public.criterios FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.editais 
  WHERE editais.id = criterios.edital_id 
  AND editais.user_id = auth.uid()
));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar timestamp
CREATE TRIGGER update_editais_updated_at
BEFORE UPDATE ON public.editais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_editais_user_id ON public.editais(user_id);
CREATE INDEX idx_editais_status ON public.editais(status);
CREATE INDEX idx_criterios_edital_id ON public.criterios(edital_id);
CREATE INDEX idx_criterios_ordem ON public.criterios(ordem);