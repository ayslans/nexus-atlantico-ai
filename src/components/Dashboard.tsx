import { useState, useEffect, useRef } from 'react';
import { FileSearch, LogOut, Plus, FileText, Search, GitCompareArrows, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadZone } from './UploadZone';
import { EditalCard } from './EditalCard';
import { extractTextFromPDF } from '@/lib/pdfParser';
import { CriteriosList } from './CriteriosList';
import { SearchCriterios } from './SearchCriterios';
import { CompareEditais } from './CompareEditais';
import { AnalisePersonas } from './AnalisePersonas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Edital {
  id: string;
  nome: string;
  arquivo_nome: string;
  arquivo_path: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  erro_mensagem?: string;
  created_at: string;
}

interface Criterio {
  id: string;
  edital_id: string;
  titulo: string | null;
  conteudo: string;
  secao: string | null;
  ordem: number;
  tags?: string[];
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [criterios, setCriterios] = useState<Record<string, Criterio[]>>({});
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [selectedEdital, setSelectedEdital] = useState<Edital | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);
  const [addFileEdital, setAddFileEdital] = useState<Edital | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [analyzeEdital, setAnalyzeEdital] = useState<Edital | null>(null);
  const [editalToDelete, setEditalToDelete] = useState<Edital | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEditais = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('editais')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Error fetching editais:', error); return; }
    setEditais((data || []) as Edital[]);
  };

  const fetchCriterios = async (editalIds: string[]) => {
    if (editalIds.length === 0) return;
    const { data, error } = await supabase
      .from('criterios')
      .select('*')
      .in('edital_id', editalIds);
    if (error) { console.error('Error fetching criterios:', error); return; }
    const grouped = (data || []).reduce((acc, c) => {
      if (!acc[c.edital_id]) acc[c.edital_id] = [];
      acc[c.edital_id].push(c as Criterio);
      return acc;
    }, {} as Record<string, Criterio[]>);
    setCriterios(grouped);
  };

  const fetchAttachmentCounts = async (editalIds: string[]) => {
    if (editalIds.length === 0) return;
    const { data, error } = await supabase
      .from('edital_arquivos' as any)
      .select('edital_id')
      .in('edital_id', editalIds);
    if (error) { console.error('Error fetching attachments:', error); return; }
    const counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
      acc[row.edital_id] = (acc[row.edital_id] || 0) + 1;
      return acc;
    }, {});
    setAttachmentCounts(counts);
  };

  useEffect(() => {
    const load = async () => { await fetchEditais(); setLoading(false); };
    load();
  }, [user]);

  useEffect(() => {
    if (editais.length > 0) {
      const ids = editais.map(e => e.id);
      fetchCriterios(ids);
      fetchAttachmentCounts(ids);
    }
  }, [editais]);

  const handleUploadComplete = () => { setUploadDialogOpen(false); fetchEditais(); };

  const handleDelete = async () => {
    if (!editalToDelete) return;
    try {
      await supabase.storage.from('editais').remove([editalToDelete.arquivo_path]);
      const { error } = await supabase.from('editais').delete().eq('id', editalToDelete.id);
      if (error) throw error;
      toast({ title: 'Edital excluído com sucesso!' });
      fetchEditais();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setEditalToDelete(null);
    }
  };

  const handleRename = async (edital: Edital, newName: string) => {
    try {
      const { error } = await supabase.from('editais').update({ nome: newName }).eq('id', edital.id);
      if (error) throw error;
      toast({ title: 'Edital renomeado com sucesso!' });
      fetchEditais();
    } catch (error: any) {
      toast({ title: 'Erro ao renomear', description: error.message, variant: 'destructive' });
    }
  };

  const handleRefreshCount = async (editalId: string) => {
    const { data, error } = await supabase.from('criterios').select('id').eq('edital_id', editalId);
    if (error) {
      toast({ title: 'Erro ao atualizar contagem', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchCriterios([editalId]);
    toast({ title: `${data?.length || 0} critério(s) encontrado(s)` });
  };

  const handleAddFile = async (edital: Edital, file: File) => {
    if (!user) return;
    try {
      const fileName = `${user.id}/${edital.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('editais').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase
        .from('edital_arquivos' as any)
        .insert({ edital_id: edital.id, arquivo_nome: file.name, arquivo_path: fileName } as any);
      if (dbError) throw dbError;
      toast({ title: 'Arquivo adicionado!', description: file.name });
      fetchAttachmentCounts(editais.map(e => e.id));
      setAddFileDialogOpen(false);
      setAddFileEdital(null);
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar arquivo', description: error.message, variant: 'destructive' });
    }
  };

  /**
   * Collects text from ALL files associated with an edital:
   * the main file (editais.arquivo_path) + all attachments (edital_arquivos).
   */
  const gatherAllFilesText = async (edital: Edital): Promise<string> => {
    const texts: string[] = [];

    // 1. Download and extract text from the main file
    const { data: mainFile, error: mainErr } = await supabase.storage
      .from('editais')
      .download(edital.arquivo_path);
    if (mainErr || !mainFile) throw new Error('Erro ao baixar o arquivo principal');
    const mainPdf = new File([mainFile], edital.arquivo_nome, { type: 'application/pdf' });
    const mainText = await extractTextFromPDF(mainPdf);
    texts.push(`=== ARQUIVO PRINCIPAL: ${edital.arquivo_nome} ===\n${mainText}`);

    // 2. Fetch all attachments
    const { data: attachments, error: attErr } = await supabase
      .from('edital_arquivos' as any)
      .select('*')
      .eq('edital_id', edital.id);

    if (!attErr && attachments && attachments.length > 0) {
      for (const att of attachments as any[]) {
        try {
          const { data: attFile, error: dlErr } = await supabase.storage
            .from('editais')
            .download(att.arquivo_path);
          if (dlErr || !attFile) {
            console.warn(`Falha ao baixar anexo: ${att.arquivo_nome}`);
            continue;
          }
          const attPdf = new File([attFile], att.arquivo_nome, { type: 'application/pdf' });
          const attText = await extractTextFromPDF(attPdf);
          texts.push(`=== ARQUIVO ANEXO: ${att.arquivo_nome} ===\n${attText}`);
        } catch (err) {
          console.warn(`Erro ao processar anexo ${att.arquivo_nome}:`, err);
        }
      }
    }

    return texts.join('\n\n');
  };

  /**
   * Full re-extraction: gathers ALL file texts, deletes old criteria, and calls AI.
   */
  const handleFullReextract = async (edital: Edital) => {
    try {
      const attachCount = attachmentCounts[edital.id] || 0;
      toast({
        title: 'Reprocessando todos os arquivos...',
        description: `Processando arquivo principal${attachCount > 0 ? ` + ${attachCount} anexo(s)` : ''}`,
      });

      // Gather text from all files
      const combinedText = await gatherAllFilesText(edital);

      // Delete old criteria
      await supabase.from('criterios').delete().eq('edital_id', edital.id);
      await supabase.from('editais').update({ status: 'processando', erro_mensagem: null }).eq('id', edital.id);
      fetchEditais();

      // Call AI with combined content
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
            pdfContent: combinedText.substring(0, 400000),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao reprocessar');
      }

      const result = await response.json();
      toast({
        title: 'Reprocessado com sucesso!',
        description: `${result.criteriosCount} critérios encontrados a partir de todos os arquivos.`,
      });
      fetchEditais();
    } catch (error: any) {
      toast({ title: 'Erro ao reprocessar', description: error.message, variant: 'destructive' });
      fetchEditais();
    }
  };

  if (analyzeEdital) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-4xl py-8 px-4">
          <AnalisePersonas edital={analyzeEdital} criterios={criterios[analyzeEdital.id] || []} onBack={() => setAnalyzeEdital(null)} />
        </div>
      </div>
    );
  }

  if (showCompare) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-6xl py-8 px-4">
          <CompareEditais editais={editais} criterios={criterios} onBack={() => setShowCompare(false)} />
        </div>
      </div>
    );
  }

  if (showSearch) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-4xl py-8 px-4">
          <SearchCriterios editais={editais} criterios={criterios} onBack={() => setShowSearch(false)} />
        </div>
      </div>
    );
  }

  if (selectedEdital) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-4xl py-8 px-4">
          <CriteriosList
            edital={selectedEdital}
            criterios={criterios[selectedEdital.id] || []}
            onBack={() => setSelectedEdital(null)}
            onCriteriosUpdated={() => {
              fetchEditais();
              fetchCriterios([selectedEdital.id]);
            }}
            onFullReextract={() => handleFullReextract(selectedEdital)}
            attachmentsCount={attachmentCounts[selectedEdital.id] || 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ETL Editais</h1>
              <p className="text-xs text-muted-foreground">Extração de Critérios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Seus Editais</h2>
            <p className="text-muted-foreground">Faça upload de editais PDF para extrair critérios de seleção</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowCompare(true)} disabled={editais.filter(e => e.status === 'concluido').length < 2}>
              <GitCompareArrows className="w-4 h-4" /><span className="hidden sm:inline">Comparar</span>
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setShowSearch(true)} disabled={editais.length === 0}>
              <Search className="w-4 h-4" /><span className="hidden sm:inline">Buscar</span>
            </Button>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />Novo Edital</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Enviar Novo Edital</DialogTitle></DialogHeader>
                <UploadZone onUploadComplete={handleUploadComplete} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : editais.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">Nenhum edital ainda</h3>
            <p className="text-muted-foreground mb-6">Envie seu primeiro edital para extrair os critérios de seleção</p>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Enviar Edital</Button>
          </div>
        ) : (
          <>
            {/* Novo: Banner de destaque para a funcionalidade de proposta */}
            {editais.some(e => e.status === 'concluido') && (
              <div className="mb-6 animate-in slide-in-from-top duration-500">
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-primary">Novo Recurso: Gerador de Modelo de Proposta!</h4>
                      <p className="text-xs text-muted-foreground">
                        Agora você pode gerar uma estrutura completa de proposta técnica baseada nos critérios do edital.
                        Clique no ícone de <Sparkles className="inline w-3 h-3 mx-0.5" /> nos editais concluídos para acessar.
                      </p>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary text-xs"
                      onClick={() => {
                        const firstConcluido = editais.find(e => e.status === 'concluido');
                        if (firstConcluido) setAnalyzeEdital(firstConcluido);
                      }}
                    >
                      Experimentar agora
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-3 animate-fade-in">
              {editais.map((edital) => {
                const editalCriterios = criterios[edital.id] || [];
                const uniqueTags = [...new Set(editalCriterios.flatMap(c => c.tags || []))];
                return (
                  <EditalCard
                    key={edital.id}
                    edital={edital}
                    criteriosCount={editalCriterios.length}
                    attachmentsCount={attachmentCounts[edital.id] || 0}
                    tags={uniqueTags}
                    onSelect={() => setSelectedEdital(edital)}
                    onAnalyze={() => setAnalyzeEdital(edital)}
                    onReprocess={() => handleFullReextract(edital)}
                    onRename={(newName) => handleRename(edital, newName)}
                    onRefreshCount={() => handleRefreshCount(edital.id)}
                    onAddFile={() => { setAddFileEdital(edital); setAddFileDialogOpen(true); }}
                    onDelete={() => { setEditalToDelete(edital); setDeleteDialogOpen(true); }}
                    onAddTag={async (tag) => {
                      // Add tag to all criterios of this edital that don't already have it
                      const targets = editalCriterios.filter(c => !(c.tags || []).includes(tag));
                      for (const c of targets) {
                        await supabase.from('criterios').update({ tags: [...(c.tags || []), tag] }).eq('id', c.id);
                      }
                      // If no criterios exist but edital is complete, show message
                      if (editalCriterios.length === 0) {
                        toast({ title: 'Nenhum critério encontrado', description: 'Extraia os critérios primeiro.', variant: 'destructive' });
                        return;
                      }
                      toast({ title: `Tag "${tag}" adicionada a ${targets.length} critério(s)` });
                      fetchCriterios([edital.id]);
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      <Dialog open={addFileDialogOpen} onOpenChange={(open) => { setAddFileDialogOpen(open); if (!open) setAddFileEdital(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Arquivo a "{addFileEdital?.nome}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione um arquivo PDF para anexar a este edital.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && addFileEdital) handleAddFile(addFileEdital, file);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir edital?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O edital e todos os critérios extraídos serão permanentemente excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
