import { useState } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Loader2, Trash2, ChevronRight, Brain, RotateCcw, Plus, RefreshCw, Pencil, Check, X, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TAG_COLORS: Record<string, string> = {
  'obrigatório': 'hsl(var(--chart-1))',
  'técnico': 'hsl(var(--chart-2))',
  'financeiro': 'hsl(var(--chart-3))',
  'jurídico': 'hsl(var(--chart-4))',
  'documental': 'hsl(var(--chart-5))',
  'eliminatório': 'hsl(var(--destructive))',
};

interface Edital {
  id: string;
  nome: string;
  arquivo_nome: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  erro_mensagem?: string;
  created_at: string;
}

interface EditalCardProps {
  edital: Edital;
  criteriosCount: number;
  attachmentsCount: number;
  tags: string[];
  onSelect: () => void;
  onDelete: () => void;
  onAnalyze?: () => void;
  onReprocess?: () => void;
  onAddFile?: () => void;
  onRefreshCount?: () => void;
  onRename?: (newName: string) => void;
  onAddTag?: (tag: string) => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'destructive'; iconClass?: string }> = {
  pendente: { label: 'Pendente', icon: Clock, variant: 'secondary' },
  processando: { label: 'Processando', icon: Loader2, variant: 'secondary', iconClass: 'animate-spin' },
  concluido: { label: 'Concluído', icon: CheckCircle, variant: 'default' },
  erro: { label: 'Erro', icon: AlertCircle, variant: 'destructive' },
};

export function EditalCard({ edital, criteriosCount, attachmentsCount, tags, onSelect, onDelete, onAnalyze, onReprocess, onAddFile, onRefreshCount, onRename, onAddTag }: EditalCardProps) {
  const config = statusConfig[edital.status];
  const StatusIcon = config.icon;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(edital.nome);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== edital.nome && onRename) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  };

  const handleTagSubmit = () => {
    const trimmed = newTagValue.trim().toLowerCase();
    if (trimmed && onAddTag) {
      onAddTag(trimmed);
    }
    setNewTagValue('');
    setIsAddingTag(false);
  };

  return (
    <Card className="group hover:shadow-elevated transition-all duration-300 cursor-pointer" onClick={onSelect}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-7 sm:h-8 text-xs sm:text-sm flex-1 min-w-0"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(edital.nome); }
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" onClick={handleRenameSubmit}>
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" onClick={() => { setIsRenaming(false); setRenameValue(edital.nome); }}>
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <h3 className="font-medium truncate text-sm sm:text-base">{edital.nome}</h3>
              )}
              <Badge variant={config.variant} className="flex-shrink-0 text-[10px] sm:text-xs">
                <StatusIcon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 ${config.iconClass || ''}`} />
                <span className="hidden xs:inline">{config.label}</span>
                <span className="xs:hidden">{config.label.substring(0, 3)}</span>
              </Badge>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              {edital.arquivo_nome}
              {attachmentsCount > 0 && (
                <span className="ml-1 sm:ml-2 text-primary">+{attachmentsCount} arquivo{attachmentsCount !== 1 ? 's' : ''}</span>
              )}
            </p>

            {/* Tags area */}
            {(tags.length > 0 || edital.status === 'concluido') && (
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-foreground"
                    style={{ backgroundColor: TAG_COLORS[tag] || 'hsl(var(--muted))' }}
                  >
                    {tag}
                  </span>
                ))}
                {edital.status === 'concluido' && !isAddingTag && (
                  <button
                    className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-muted-foreground border border-dashed border-muted-foreground/40 hover:border-primary hover:text-primary transition-colors"
                    onClick={() => setIsAddingTag(true)}
                    title="Adicionar tag"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden xs:inline">tag</span>
                  </button>
                )}
                {isAddingTag && (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      placeholder="Tag..."
                      className="h-5 sm:h-6 w-20 sm:w-28 text-[10px] sm:text-xs px-1.5 sm:px-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTagSubmit();
                        if (e.key === 'Escape') { setIsAddingTag(false); setNewTagValue(''); }
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-4 w-4 sm:h-5 sm:w-5" onClick={handleTagSubmit}>
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-4 w-4 sm:h-5 sm:w-5" onClick={() => { setIsAddingTag(false); setNewTagValue(''); }}>
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground min-w-0">
                <span className="truncate">
                  {formatDistanceToNow(new Date(edital.created_at), { addSuffix: true, locale: ptBR })}
                </span>
                {edital.status === 'concluido' && (
                  <span className="text-primary font-medium whitespace-nowrap">
                    {criteriosCount} critério{criteriosCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                {onRename && !isRenaming && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); setRenameValue(edital.nome); setIsRenaming(true); }} title="Renomear">
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                )}
                {onAddFile && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onAddFile(); }} title="Adicionar arquivo">
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                )}
                {edital.status === 'concluido' && onRefreshCount && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onRefreshCount(); }} title="Atualizar contagem">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                )}
                {edital.status === 'erro' && onReprocess && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onReprocess(); }} title="Reprocessar">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  </Button>
                )}
                {edital.status === 'concluido' && onAnalyze && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onAnalyze(); }} title="Analisar com IA">
                    <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground hover:text-destructive" />
                </Button>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hidden sm:block" />
              </div>
            </div>

            {edital.erro_mensagem && (
              <p className="text-xs sm:text-sm text-destructive mt-2 break-words">{edital.erro_mensagem}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
