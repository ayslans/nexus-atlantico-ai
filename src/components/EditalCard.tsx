import { FileText, Clock, CheckCircle, AlertCircle, Loader2, Trash2, ChevronRight, Brain, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface Edital {
  id: string;
  nome: string;
  nome_customizado?: string;
  arquivo_nome: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  erro_mensagem?: string;
  created_at: string;
}

interface EditalCardProps {
  edital: Edital;
  criteriosCount: number;
  onSelect: () => void;
  onDelete: () => void;
  onAnalyze?: () => void;
  onRename?: (novoNome: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'destructive'; iconClass?: string }> = {
  pendente: {
    label: 'Pendente',
    icon: Clock,
    variant: 'secondary',
  },
  processando: {
    label: 'Processando',
    icon: Loader2,
    variant: 'secondary',
    iconClass: 'animate-spin',
  },
  concluido: {
    label: 'Concluído',
    icon: CheckCircle,
    variant: 'default',
  },
  erro: {
    label: 'Erro',
    icon: AlertCircle,
    variant: 'destructive',
  },
};

export function EditalCard({ edital, criteriosCount, onSelect, onDelete, onAnalyze, onRename }: EditalCardProps) {
  const config = statusConfig[edital.status];
  const StatusIcon = config.icon;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(edital.nome_customizado || edital.nome);
  const [isSaving, setIsSaving] = useState(false);

  const displayName = edital.nome_customizado || edital.nome;

  const handleSaveRename = async () => {
    if (!onRename || editName.trim() === displayName) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onRename(editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error renaming edital:', error);
      setEditName(displayName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(displayName);
    setIsEditing(false);
  };

  return (
    <Card className="group hover:shadow-elevated transition-all duration-300 cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome do edital"
                    className="text-base font-medium"
                    disabled={isSaving}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') handleCancel();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRename();
                    }}
                    disabled={isSaving}
                  >
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel();
                    }}
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{displayName}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {edital.arquivo_nome}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="flex-shrink-0">
                    <StatusIcon className={`w-3 h-3 mr-1 ${config.iconClass || ''}`} />
                    {config.label}
                  </Badge>
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(edital.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                {edital.status === 'concluido' && (
                  <span className="text-primary font-medium">
                    {criteriosCount} critério{criteriosCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {edital.status === 'concluido' && onAnalyze && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnalyze();
                    }}
                    title="Analisar com IA"
                  >
                    <Brain className="w-4 h-4 text-primary" />
                  </Button>
                )}
                {!isEditing && onRename && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    title="Renomear edital"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {edital.erro_mensagem && (
              <p className="text-sm text-destructive mt-2">{edital.erro_mensagem}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}