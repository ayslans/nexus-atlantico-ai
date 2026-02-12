import { ArrowLeft, FileText, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Criterio {
  id: string;
  titulo: string | null;
  conteudo: string;
  secao: string | null;
  ordem: number;
  tags?: string[];
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
}

export function CriteriosList({ edital, criterios, onBack }: CriteriosListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const text = filteredCriterios
      .map(c => `[${edital.nome}]\n${c.titulo ? `${c.titulo}\n` : ''}${c.conteudo}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    toast({ title: 'Todos os critérios copiados!' });
  };

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
            {filteredCriterios.length} critério{filteredCriterios.length !== 1 ? 's' : ''} {filterTag ? `com tag "${filterTag}"` : 'encontrado' + (filteredCriterios.length !== 1 ? 's' : '')}
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

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-8 pr-4">
          {Object.entries(groupedCriterios).map(([section, sectionCriterios]) => (
            <div key={section} className="space-y-4">
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                <Badge variant="secondary" className="text-sm font-medium">
                  {section}
                </Badge>
              </div>

              <div className="space-y-3">
                {sectionCriterios
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((criterio) => (
                    <Card key={criterio.id} className="group hover:shadow-card transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-medium">
                            {criterio.titulo || `Critério ${criterio.ordem}`}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(criterio)}
                          >
                            {copiedId === criterio.id ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {criterio.conteudo}
                        </p>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Fonte: <span className="font-medium">{edital.nome}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
