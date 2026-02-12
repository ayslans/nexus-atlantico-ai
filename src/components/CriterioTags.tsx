import { Badge, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Tag {
  id: string;
  tag: string;
  cor_destaque: string;
}

interface CriterioTagsProps {
  criterioId: string;
  tags: Tag[];
  onTagsUpdated?: () => void;
}

const COR_OPTIONS = [
  { nome: 'Amarelo', valor: '#FFE5B4' },
  { nome: 'Rosa', valor: '#FFB4D4' },
  { nome: 'Verde', valor: '#B4E5A0' },
  { nome: 'Azul', valor: '#B4D4FF' },
  { nome: 'Roxo', valor: '#D4B4FF' },
  { nome: 'Laranja', valor: '#FFC9A0' },
];

export function CriterioTags({ criterioId, tags, onTagsUpdated }: CriterioTagsProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(COR_OPTIONS[0].valor);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast({ title: 'Tag não pode estar vazia', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      const { error } = await supabase
        .from('criterio_tags')
        .insert({
          criterio_id: criterioId,
          tag: newTag.trim(),
          cor_destaque: selectedColor,
          criado_por: userId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Tag já existe para este critério', variant: 'destructive' });
          return;
        }
        throw error;
      }

      setNewTag('');
      setSelectedColor(COR_OPTIONS[0].valor);
      setIsAdding(false);
      toast({ title: 'Tag adicionada!' });
      
      if (onTagsUpdated) {
        onTagsUpdated();
      }
    } catch (error: any) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Erro ao adicionar tag',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('criterio_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({ title: 'Tag removida!' });
      if (onTagsUpdated) {
        onTagsUpdated();
      }
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Erro ao remover tag',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Displayed Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-gray-900 transition-transform hover:scale-105"
            style={{ backgroundColor: tag.cor_destaque }}
          >
            <span>{tag.tag}</span>
            <button
              onClick={() => handleDeleteTag(tag.id)}
              disabled={isLoading}
              className="p-0 hover:opacity-70 disabled:opacity-50"
              title="Remover tag"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Tag Form */}
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
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTag('');
              }
            }}
          />
          <div className="flex gap-1">
            {COR_OPTIONS.map((cor) => (
              <button
                key={cor.valor}
                onClick={() => setSelectedColor(cor.valor)}
                disabled={isLoading}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  selectedColor === cor.valor ? 'border-gray-900 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: cor.valor }}
                title={cor.nome}
              />
            ))}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleAddTag}
            disabled={isLoading}
            title="Adicionar tag"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setIsAdding(false);
              setNewTag('');
            }}
            disabled={isLoading}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setIsAdding(true)}
          disabled={isLoading}
        >
          <Plus className="w-3 h-3" />
          Adicionar Tag
        </Button>
      )}
    </div>
  );
}
