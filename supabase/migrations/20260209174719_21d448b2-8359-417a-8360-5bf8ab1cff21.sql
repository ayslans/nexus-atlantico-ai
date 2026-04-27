CREATE POLICY "Usuarios podem atualizar criterios dos seus editais"
ON public.criterios
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM editais
  WHERE editais.id = criterios.edital_id AND editais.user_id = auth.uid()
));