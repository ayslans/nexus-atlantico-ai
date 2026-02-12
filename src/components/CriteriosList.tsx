import { ArrowLeft, FileText, Copy, CheckCircle, RefreshCw, Loader2, Upload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfParser';
import { useAuth } from '@/hooks/useAuth';
import { CriterioTags } from './CriterioTags';

interface Criterio {
  id: string;
  titulo: string | null;
  conteudo: string;
  secao: string | null;
  ordem: number;
}

interface Edital {
  id: string;
  nome: string;
  arquivo_nome: string;
  arquivo_path: string;
  status: string;
}

interface CriteriosListProps {
  edital: Edital;
  criterios: Criterio[];
  onBack: () => void;
  onCriteriosUpdated?: () => void;
}

export function CriteriosList({ edital, criterios, onBack, onCriteriosUpdated }: CriteriosListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdatingCriterios, setIsUpdatingCriterios] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [criterioTags, setCriterioTags] = useState<Record<string, any[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedCriterios = criterios.reduce((acc, criterio) => {
    const section = criterio.secao || 'Sem seção';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(criterio);
    return acc;
  }, {} as Record<string, Criterio[]>);

  // Load tags for all criteria
  const loadCriterioTags = useCallback(async () => {
    if (criterios.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('criterio_tags')
        .select('*')
        .in('criterio_id', criterios.map(c => c.id));

      if (error) throw error;

      const tagsMap = (data || []).reduce((acc: Record<string, any[]>, tag: any) => {
        if (!acc[tag.criterio_id]) {
          acc[tag.criterio_id] = [];
        }
        acc[tag.criterio_id].push(tag);
        return acc;
      }, {});

      setCriterioTags(tagsMap);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, [criterios]);

  const copyToClipboard = async (criterio: Criterio) => {
    const text = `[${edital.nome}]\n${criterio.titulo ? `${criterio.titulo}\n` : ''}${criterio.conteudo}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(criterio.id);
    toast({ title: 'Copiado para a área de transferência!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    const text = criterios
      .map(c => `[${edital.nome}]\n${c.titulo ? `${c.titulo}\n` : ''}${c.conteudo}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    toast({ title: 'Todos os critérios copiados!' });
  };

  const handleUpdateCriterios = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsUpdatingCriterios(true);

      // 1. Download current PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('editais')
        .download(edital.arquivo_path);

      if (downloadError || !fileData) {
        throw new Error('Erro ao baixar o arquivo PDF');
      }

      // 2. Extract text from PDF
      const file = new File([fileData], edital.arquivo_nome, { type: 'application/pdf' });
      const pdfText = await extractTextFromPDF(file);

      // 3. Delete existing criteria
      const { error: deleteError } = await supabase
        .from('criterios')
        .delete()
        .eq('edital_id', edital.id);

      if (deleteError) throw deleteError;

      // 4. Update edital status to processing
      await supabase
        .from('editais')
        .update({ status: 'processando', erro_mensagem: null })
        .eq('id', edital.id);

      // 5. Call AI to extract criteria
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-criterios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            editalId: edital.id,
            pdfContent: pdfText.substring(0, 400000),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar critérios');
      }

      const result = await response.json();
      toast({
        title: 'Critérios atualizados com sucesso!',
        description: `${result.criteriosCount} critérios encontrados.`,
      });

      // Callback to refresh parent component
      if (onCriteriosUpdated) {
        onCriteriosUpdated();
      }
    } catch (error: any) {
      console.error('Error updating criteria:', error);
      toast({
        title: 'Erro ao atualizar critérios',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCriterios(false);
    }
  }, [user, edital, toast, onCriteriosUpdated]);

  const handleUploadNewFile = useCallback(async (file: File) => {
    if (!user) return;

    try {
      setIsUpdatingCriterios(true);

      // 1. Delete old file from storage
      try {
        await supabase.storage
          .from('editais')
          .remove([edital.arquivo_path]);
      } catch {
        console.log('Old file cleanup skipped');
      }

      // 2. Upload new file
      const fileName = `${user.id}/${edital.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('editais')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 3. Update edital file reference
      await supabase
        .from('editais')
        .update({ arquivo_path: fileName, arquivo_nome: file.name })
        .eq('id', edital.id);

      // 4. Extract text and update criteria
      const pdfText = await extractTextFromPDF(file);

      await supabase
        .from('criterios')
        .delete()
        .eq('edital_id', edital.id);

      await supabase
        .from('editais')
        .update({ status: 'processando', erro_mensagem: null })
        .eq('id', edital.id);

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-criterios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            editalId: edital.id,
            pdfContent: pdfText.substring(0, 400000),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao processar novo arquivo');
      }

      const result = await response.json();
      toast({
        title: 'Arquivo atualizado com sucesso!',
        description: `${result.criteriosCount} critérios encontrados.`,
      });

      if (onCriteriosUpdated) {
        onCriteriosUpdated();
      }
    } catch (error: any) {
      console.error('Error uploading new file:', error);
      toast({
        title: 'Erro ao atualizar arquivo',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCriterios(false);
    }
  }, [user, edital, toast, onCriteriosUpdated]);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      {/* Header with Edital Info and Action Buttons */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{edital.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {criterios.length} critério{criterios.length !== 1 ? 's' : ''} encontrado{criterios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUpdatingCriterios}
            className="gap-2"
            title="Carregar novo arquivo PDF"
          >
            <Upload className="w-4 h-4" />
            Novo Arquivo
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleUpdateCriterios}
            disabled={isUpdatingCriterios}
            className="gap-2"
          >
            {isUpdatingCriterios ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Atualizar Critérios
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={copyAll} className="gap-2" disabled={criterios.length === 0}>
            <Copy className="w-4 h-4" />
            Copiar Todos
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) {
            handleUploadNewFile(file);
          }
        }}
        disabled={isUpdatingCriterios}
      />

      {/* PDF and Criteria Panel - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Panel: PDF Info */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Arquivo PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {edital.arquivo_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF armazenado
                    </p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Status de Processamento</p>
                  <Badge variant={edital.status === 'concluido' ? 'default' : 'secondary'} className="w-full justify-center">
                    {edital.status === 'concluido' && 'Concluído'}
                    {edital.status === 'processando' && (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processando
                      </span>
                    )}
                    {edital.status === 'erro' && 'Erro'}
                    {edital.status === 'pendente' && 'Pendente'}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded">
                <p>💡 Dica: Use "Novo Arquivo" para fazer upload de um PDF diferente ou versão atualizada.</p>
                <p>Use "Atualizar Critérios" para reprocessar o PDF atual com a IA.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Criteria List */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Critérios Extraídos</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {criterios.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  {isUpdatingCriterios ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">Processando critérios...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Nenhum critério encontrado</p>
                      <Button variant="outline" size="sm" onClick={handleUpdateCriterios}>
                        Extrair Critérios
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-4">
                    {Object.entries(groupedCriterios).map(([section, sectionCriterios]) => (
                      <div key={section} className="space-y-2">
                        <Badge variant="secondary" className="text-xs">
                          {section}
                        </Badge>
                        <div className="space-y-2">
                          {sectionCriterios
                            .sort((a, b) => a.ordem - b.ordem)
                            .map((criterio) => {
                              const isExpanded = expandedCriteria.has(criterio.id);
                              const tags = criterioTags[criterio.id] || [];

                              return (
                                <Card key={criterio.id} className="group hover:shadow-card transition-shadow">
                                  <div
                                    className="p-3 cursor-pointer"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedCriteria);
                                      if (newExpanded.has(criterio.id)) {
                                        newExpanded.delete(criterio.id);
                                      } else {
                                        newExpanded.add(criterio.id);
                                      }
                                      setExpandedCriteria(newExpanded);
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <ChevronDown
                                          className={`w-4 h-4 flex-shrink-0 transition-transform ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-tight">
                                            {criterio.titulo || `Critério ${criterio.ordem}`}
                                          </p>
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                            {criterio.conteudo.substring(0, 80)}...
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(criterio);
                                        }}
                                      >
                                        {copiedId === criterio.id ? (
                                          <CheckCircle className="w-3 h-3 text-success" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Expanded View */}
                                  {isExpanded && (
                                    <div className="border-t bg-muted/20 p-3 space-y-3">
                                      <div>
                                        <p className="text-xs font-medium mb-1">Conteúdo Completo</p>
                                        <p className="text-xs whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                                          {criterio.conteudo}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs font-medium mb-2">Tags e Destaques</p>
                                        <CriterioTags
                                          criterioId={criterio.id}
                                          tags={tags}
                                          onTagsUpdated={() => loadCriterioTags()}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}