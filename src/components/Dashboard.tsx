import { useState, useEffect } from 'react';
import { FileSearch, LogOut, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadZone } from './UploadZone';
import { EditalCard } from './EditalCard';
import { CriteriosList } from './CriteriosList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [editais, setEditais] = useState<Edital[]>([]);
  const [criterios, setCriterios] = useState<Record<string, Criterio[]>>({});
  const [selectedEdital, setSelectedEdital] = useState<Edital | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editalToDelete, setEditalToDelete] = useState<Edital | null>(null);

  const fetchEditais = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('editais')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching editais:', error);
      return;
    }

    setEditais((data || []) as Edital[]);
  };

  const fetchCriterios = async (editalIds: string[]) => {
    if (editalIds.length === 0) return;

    const { data, error } = await supabase
      .from('criterios')
      .select('*')
      .in('edital_id', editalIds);

    if (error) {
      console.error('Error fetching criterios:', error);
      return;
    }

    const grouped = (data || []).reduce((acc, c) => {
      if (!acc[c.edital_id]) {
        acc[c.edital_id] = [];
      }
      acc[c.edital_id].push(c);
      return acc;
    }, {} as Record<string, Criterio[]>);

    setCriterios(grouped);
  };

  useEffect(() => {
    const load = async () => {
      await fetchEditais();
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (editais.length > 0) {
      fetchCriterios(editais.map(e => e.id));
    }
  }, [editais]);

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    fetchEditais();
  };

  const handleDelete = async () => {
    if (!editalToDelete) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('editais')
        .remove([editalToDelete.arquivo_path]);

      // Delete from database (cascade will delete criterios)
      const { error } = await supabase
        .from('editais')
        .delete()
        .eq('id', editalToDelete.id);

      if (error) throw error;

      toast({ title: 'Edital excluído com sucesso!' });
      fetchEditais();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setEditalToDelete(null);
    }
  };

  if (selectedEdital) {
    return (
      <div className="min-h-screen gradient-hero">
        <div className="container max-w-4xl py-8 px-4">
          <CriteriosList
            edital={selectedEdital}
            criterios={criterios[selectedEdital.id] || []}
            onBack={() => setSelectedEdital(null)}
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
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Seus Editais</h2>
            <p className="text-muted-foreground">
              Faça upload de editais PDF para extrair critérios de seleção
            </p>
          </div>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Edital
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Enviar Novo Edital</DialogTitle>
              </DialogHeader>
              <UploadZone onUploadComplete={handleUploadComplete} />
            </DialogContent>
          </Dialog>
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
            <p className="text-muted-foreground mb-6">
              Envie seu primeiro edital para extrair os critérios de seleção
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Enviar Edital
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {editais.map((edital) => (
              <EditalCard
                key={edital.id}
                edital={edital}
                criteriosCount={criterios[edital.id]?.length || 0}
                onSelect={() => setSelectedEdital(edital)}
                onDelete={() => {
                  setEditalToDelete(edital);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir edital?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O edital e todos os critérios
              extraídos serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}