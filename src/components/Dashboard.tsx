import { useState, useEffect, useRef } from 'react';
import { FileSearch, LogOut, Plus, FileText, Search, GitCompareArrows } from 'lucide-react';
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

  const handleReprocess = async (edital: Edital) => {
    try {
      toast({ title: 'Reprocessando...', description: `Baixando e reprocessando "${edital.nome}"` });
      const { data: fileData, error: downloadError } = await supabase.storage.from('editais').download(edital.arquivo_path);
      if (downloadError || !fileData) throw new Error('Erro ao baixar o arquivo');
      const file = new File([fileData], edital.arquivo_nome, { type: 'application/pdf' });
      const pdfText = await extractTextFromPDF(file);
      await supabase.from('criterios').delete().eq('edital_id', edital.id);
      await supabase.from('editais').update({ status: 'processando', erro_mensagem: null }).eq('id', edital.id);
      fetchEditais();
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-criterios`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
          body: JSON.stringify({ editalId: edital.id, pdfContent: pdfText.substring(0, 400000) }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao reprocessar');
      }
      const result = await response.json();
      toast({ title: 'Reprocessado com sucesso!', description: `${result.criteriosCount} critérios encontrados.` });
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
          <div className="space-y-3 animate-fade-in">
            {editais.map((edital) => (
              <EditalCard
                key={edital.id}
                edital={edital}
                criteriosCount={criterios[edital.id]?.length || 0}
                attachmentsCount={attachmentCounts[edital.id] || 0}
                onSelect={() => setSelectedEdital(edital)}
                onAnalyze={() => setAnalyzeEdital(edital)}
                onReprocess={() => handleReprocess(edital)}
                onRename={(newName) => handleRename(edital, newName)}
                onRefreshCount={() => handleRefreshCount(edital.id)}
                onAddFile={() => { setAddFileEdital(edital); setAddFileDialogOpen(true); }}
                onDelete={() => { setEditalToDelete(edital); setDeleteDialogOpen(true); }}
              />
            ))}
          </div>
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
