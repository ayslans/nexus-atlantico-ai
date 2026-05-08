import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const COR_OPTIONS: Record<string, string> = {
  'obrigatório': '#FFB4D4',
  'técnico': '#B4D4FF',
  'financeiro': '#B4E5A0',
  'jurídico': '#D4B4FF',
  'documental': '#FFE5B4',
  'eliminatório': '#FFC9A0',
};

interface CriterioTagsProps {
  criterioId: string;
  tags: string[];
  onTagsUpdated?: () => void;
}

export function CriterioTags({ criterioId, tags, onTagsUpdated }: CriterioTagsProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTag = async () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) { toast({ title: 'Tag não pode estar vazia', variant: 'destructive' }); return; }
    if (tags.includes(trimmed)) { toast({ title: 'Tag já existe', variant: 'destructive' }); return; }

    try {
      setIsLoading(true);
      const updated = [...tags, trimmed];
      const { error } = await supabase.from('criterios').update({ tags: updated }).eq('id', criterioId);
      if (error) throw error;
      setNewTag('');
      setIsAdding(false);
      toast({ title: 'Tag adicionada!' });
      onTagsUpdated?.();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar tag', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      setIsLoading(true);
      const updated = tags.filter(t => t !== tag);
      const { error } = await supabase.from('criterios').update({ tags: updated }).eq('id', criterioId);
      if (error) throw error;
      toast({ title: 'Tag removida!' });
      onTagsUpdated?.();
    } catch (error: any) {
      toast({ title: 'Erro ao remover tag', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-foreground transition-transform hover:scale-105"
            style={{ backgroundColor: COR_OPTIONS[tag] || '#e2e8f0' }}
          >
            <span>{tag}</span>
            <button onClick={() => handleDeleteTag(tag)} disabled={isLoading} className="p-0 hover:opacity-70 disabled:opacity-50" title="Remover tag">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Input
            placeholder="Nome da tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            disabled={isLoading}
            className="h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
              if (e.key === 'Escape') { setIsAdding(false); setNewTag(''); }
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddTag} disabled={isLoading} title="Adicionar">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsAdding(false); setNewTag(''); }} disabled={isLoading}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setIsAdding(true)} disabled={isLoading}>
          <Plus className="w-3 h-3" />
          Adicionar Tag
        </Button>
      )}
    </div>
  );
}
