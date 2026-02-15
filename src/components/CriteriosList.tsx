import { useState, useRef } from 'react';
import { ArrowLeft, FileText, Copy, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  onCriteriosUpdated?: () => void;
  onFullReextract?: () => void;
  attachmentsCount?: number;
}

const TAG_COLORS: Record<string, string> = {
  'obrigatório': 'bg-red-100 text-red-800 border-red-300',
  'técnico': 'bg-blue-100 text-blue-800 border-blue-300',
  'financeiro': 'bg-green-100 text-green-800 border-green-300',
  'jurídico': 'bg-purple-100 text-purple-800 border-purple-300',
  'documental': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'eliminatório': 'bg-orange-100 text-orange-800 border-orange-300',
};

const ALL_TAGS = Object.keys(TAG_COLORS);

export function CriteriosList({ edital, criterios, onBack, onCriteriosUpdated, onFullReextract, attachmentsCount = 0 }: CriteriosListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<Record<string, string[]>>({});
  const [isUpdatingCriterios, setIsUpdatingCriterios] = useState(false);

  const getTagsForCriterio = (criterio: Criterio): string[] => {
    return localTags[criterio.id] || criterio.tags || [];
  };

  const filteredCriterios = filterTag
    ? criterios.filter(c => getTagsForCriterio(c).includes(filterTag))
    : criterios;

  const groupedCriterios = filteredCriterios.reduce((acc, criterio) => {
    const section = criterio.secao || 'Sem seção';
    if (!acc[section]) acc[section] = [];
    acc[section].push(criterio);
    return acc;
  }, {} as Record<string, Criterio[]>);

  const addTag = async (criterioId: string, tag: string) => {
    const current = localTags[criterioId] || criterios.find(c => c.id === criterioId)?.tags || [];
    if (current.includes(tag)) return;
    const updated = [...current, tag];
    setLocalTags(prev => ({ ...prev, [criterioId]: updated }));
    try {
      await supabase.from('criterios').update({ tags: updated }).eq('id', criterioId);
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  const removeTag = async (criterioId: string, tag: string) => {
    const current = localTags[criterioId] || criterios.find(c => c.id === criterioId)?.tags || [];
    const updated = current.filter(t => t !== tag);
    setLocalTags(prev => ({ ...prev, [criterioId]: updated }));
    try {
      await supabase.from('criterios').update({ tags: updated }).eq('id', criterioId);
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const handleUpdateCriterios = async () => {
    setIsUpdatingCriterios(true);
    try {
      if (onFullReextract) {
        // Re-extract from ALL files (main + attachments)
        await onFullReextract();
      } else {
        onCriteriosUpdated?.();
      }
      toast({ title: 'Critérios atualizados a partir de todos os arquivos!' });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdatingCriterios(false);
    }
  };

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

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{edital.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCriterios.length} critério{filteredCriterios.length !== 1 ? 's' : ''} {filterTag ? `com tag "${filterTag}"` : 'encontrado' + (filteredCriterios.length !== 1 ? 's' : '')}
            {attachmentsCount > 0 && (
              <span className="ml-2 text-primary">• {attachmentsCount + 1} arquivo{attachmentsCount > 0 ? 's' : ''} no total</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={handleUpdateCriterios} disabled={isUpdatingCriterios} className="gap-2">
            {isUpdatingCriterios ? (<><Loader2 className="w-4 h-4 animate-spin" />Atualizando...</>) : (<><RefreshCw className="w-4 h-4" />Atualizar Critérios</>)}
          </Button>
          <Button variant="outline" size="sm" onClick={copyAll} className="gap-2" disabled={criterios.length === 0}>
            <Copy className="w-4 h-4" />Copiar Todos
          </Button>
        </div>
      </div>

      {/* Tag filter bar */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filterTag === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilterTag(null)}
        >
          Todos
        </Badge>
        {ALL_TAGS.map(tag => (
          <Badge
            key={tag}
            variant={filterTag === tag ? 'default' : 'outline'}
            className={`cursor-pointer ${filterTag === tag ? '' : TAG_COLORS[tag] || ''}`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>

      <ScrollArea className="h-[calc(100vh-420px)]">
        <div className="space-y-8 pr-4">
          {Object.entries(groupedCriterios).map(([section, sectionCriterios]) => (
            <div key={section} className="space-y-4">
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                <Badge variant="secondary" className="text-sm font-medium">{section}</Badge>
              </div>
              <div className="space-y-3">
                {sectionCriterios
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((criterio) => {
                    const tags = getTagsForCriterio(criterio);
                    return (
                      <Card key={criterio.id} className="group hover:shadow-card transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-medium">
                              {criterio.titulo || `Critério ${criterio.ordem}`}
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(criterio)}>
                              {copiedId === criterio.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{criterio.conteudo}</p>
                          {/* Tags */}
                          <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5 items-center">
                            {tags.map(tag => (
                              <Badge key={tag} variant="outline" className={`text-xs ${TAG_COLORS[tag] || ''} cursor-pointer`} onClick={() => removeTag(criterio.id, tag)} title="Clique para remover">
                                {tag} ×
                              </Badge>
                            ))}
                            {ALL_TAGS.filter(t => !tags.includes(t)).length > 0 && (
                              <select
                                className="text-xs border rounded px-1 py-0.5 bg-background text-foreground"
                                value=""
                                onChange={(e) => { if (e.target.value) addTag(criterio.id, e.target.value); }}
                              >
                                <option value="">+ tag</option>
                                {ALL_TAGS.filter(t => !tags.includes(t)).map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
