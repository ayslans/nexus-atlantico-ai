-- Criar tabela para armazenar modelos de proposta gerados pela IA
CREATE TABLE IF NOT EXISTS public.proposal_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
    model_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para busca por edital
CREATE INDEX IF NOT EXISTS idx_proposal_models_edital_id ON public.proposal_models(edital_id);

-- Habilitar RLS
ALTER TABLE public.proposal_models ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados verem apenas seus próprios modelos (via edital)
CREATE POLICY "Users can view their own proposal models" ON public.proposal_models
    FOR SELECT
    USING (
        edital_id IN (
            SELECT id FROM public.editais WHERE user_id = auth.uid()
        )
    );

-- Política para usuários autenticados inserirem modelos para seus editais
CREATE POLICY "Users can insert their own proposal models" ON public.proposal_models
    FOR INSERT
    WITH CHECK (
        edital_id IN (
            SELECT id FROM public.editais WHERE user_id = auth.uid()
        )
    );

-- Política para usuários autenticados atualizarem seus modelos
CREATE POLICY "Users can update their own proposal models" ON public.proposal_models
    FOR UPDATE
    USING (
        edital_id IN (
            SELECT id FROM public.editais WHERE user_id = auth.uid()
        )
    );

-- Política para usuários autenticados excluírem seus modelos
CREATE POLICY "Users can delete their own proposal models" ON public.proposal_models
    FOR DELETE
    USING (
        edital_id IN (
            SELECT id FROM public.editais WHERE user_id = auth.uid()
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_proposal_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposal_models_updated_at
    BEFORE UPDATE ON public.proposal_models
    FOR EACH ROW
    EXECUTE FUNCTION update_proposal_models_updated_at();

-- Criar tabela para armazenar checklist de proposta (estado dos itens)
CREATE TABLE IF NOT EXISTS public.proposal_checklist_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_model_id UUID NOT NULL REFERENCES public.proposal_models(id) ON DELETE CASCADE,
    checklist_item_id TEXT NOT NULL,
    verificado BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_checklist_unique 
    ON public.proposal_checklist_state(proposal_model_id, checklist_item_id);

-- Habilitar RLS
ALTER TABLE public.proposal_checklist_state ENABLE ROW LEVEL SECURITY;

-- Políticas para checklist state (herda permissões do proposal_model)
CREATE POLICY "Users can manage their checklist state" ON public.proposal_checklist_state
    FOR ALL
    USING (
        proposal_model_id IN (
            SELECT pm.id FROM public.proposal_models pm
            JOIN public.editais e ON pm.edital_id = e.id
            WHERE e.user_id = auth.uid()
        )
    );

-- Comentários para documentação
COMMENT ON TABLE public.proposal_models IS 'Armazena modelos de proposta gerados pela IA para cada edital';
COMMENT ON COLUMN public.proposal_models.model_data IS 'JSON com estrutura, checklist, critérios e dicas da proposta';
COMMENT ON TABLE public.proposal_checklist_state IS 'Armazena o estado de verificação dos itens do checklist';
