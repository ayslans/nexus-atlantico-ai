import { ArrowLeft, FileText, Copy, CheckCircle, Tag, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

interface CriteriosListProps {
  edital: Edital;
  criterios: Criterio[];
  onBack: () => void;
  onCriteriosUpdated?: () => void;
}

const TAG_COLORS: Record<string, string> = {
  'obrigatório': 'bg-destructive/15 text-destructive border-destructive/30',
  'classificatório': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'documental': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'técnico': 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  'financeiro': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'prazo': 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  'habilitação': 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
};

function getTagColor(tag: string): string {
  const normalized = tag.toLowerCase();
  return TAG_COLORS[normalized] || 'bg-muted text-muted-foreground border-border';
}

export function CriteriosList({ edital, criterios, onBack, onCriteriosUpdated }: CriteriosListProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState('');
  const [localCriterios, setLocalCriterios] = useState<Criterio[]>(criterios);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = Array.from(new Set(localCriterios.flatMap(c => c.tags || [])));

  const filteredCriterios = filterTag
    ? localCriterios.filter(c => (c.tags || []).includes(filterTag))
    : localCriterios;

  const groupedCriterios = filteredCriterios.reduce((acc, criterio) => {
    const section = criterio.secao || 'Sem seção';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(criterio);
    return acc;
  }, {} as Record<string, Criterio[]>);

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

  const addTag = async (criterioId: string, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const criterio = localCriterios.find(c => c.id === criterioId);
    if (!criterio) return;
    const currentTags = criterio.tags || [];
    if (currentTags.includes(trimmed)) return;

    const updatedTags = [...currentTags, trimmed];
    const { error } = await supabase
      .from('criterios')
      .update({ tags: updatedTags } as any)
      .eq('id', criterioId);

    if (error) {
      toast({ title: 'Erro ao adicionar tag', description: error.message, variant: 'destructive' });
      return;
    }

    setLocalCriterios(prev => prev.map(c => c.id === criterioId ? { ...c, tags: updatedTags } : c));
    setNewTagValue('');
    setEditingTagId(null);
    onCriteriosUpdated?.();
  };

  const removeTag = async (criterioId: string, tag: string) => {
    const criterio = localCriterios.find(c => c.id === criterioId);
    if (!criterio) return;
    const updatedTags = (criterio.tags || []).filter(t => t !== tag);

    const { error } = await supabase
      .from('criterios')
      .update({ tags: updatedTags } as any)
      .eq('id', criterioId);

    if (error) {
      toast({ title: 'Erro ao remover tag', description: error.message, variant: 'destructive' });
      return;
    }

    setLocalCriterios(prev => prev.map(c => c.id === criterioId ? { ...c, tags: updatedTags } : c));
    onCriteriosUpdated?.();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button variant="outline" onClick={copyAll} className="gap-2">
          <Copy className="w-4 h-4" />
          Copiar Todos
        </Button>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{edital.nome}</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCriterios.length} critério{filteredCriterios.length !== 1 ? 's' : ''} {filterTag ? `com tag "${filterTag}"` : 'encontrado' + (filteredCriterios.length !== 1 ? 's' : '')}
          </p>
        </div>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Badge
            variant={filterTag === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setFilterTag(null)}
          >
            Todos
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={filterTag === tag ? 'default' : 'outline'}
              className={`cursor-pointer text-xs ${filterTag !== tag ? getTagColor(tag) : ''}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-380px)]">
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
                              <CheckCircle className="w-4 h-4 text-accent" />
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

                        {/* Tags */}
                        <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                          {(criterio.tags || []).map(tag => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className={`text-xs gap-1 ${getTagColor(tag)}`}
                            >
                              {tag}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeTag(criterio.id, tag); }}
                                className="ml-0.5 hover:opacity-70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}

                          {editingTagId === criterio.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={newTagValue}
                                onChange={(e) => setNewTagValue(e.target.value)}
                                className="h-6 w-28 text-xs"
                                placeholder="Nova tag..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') addTag(criterio.id, newTagValue);
                                  if (e.key === 'Escape') { setEditingTagId(null); setNewTagValue(''); }
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addTag(criterio.id, newTagValue)}>
                                <CheckCircle className="w-3 h-3 text-accent" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground"
                              onClick={(e) => { e.stopPropagation(); setEditingTagId(criterio.id); setNewTagValue(''); }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Tag
                            </Button>
                          )}
                        </div>

                        <div className="mt-2">
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
