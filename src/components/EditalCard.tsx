import { FileText, Clock, CheckCircle, AlertCircle, Loader2, Trash2, ChevronRight, Brain, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  onSelect: () => void;
  onDelete: () => void;
  onAnalyze?: () => void;
  onReprocess?: () => void;
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

export function EditalCard({ edital, criteriosCount, onSelect, onDelete, onAnalyze, onReprocess }: EditalCardProps) {
  const config = statusConfig[edital.status];
  const StatusIcon = config.icon;

  return (
    <Card className="group hover:shadow-elevated transition-all duration-300 cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium truncate">{edital.nome}</h3>
              <Badge variant={config.variant} className="flex-shrink-0">
                <StatusIcon className={`w-3 h-3 mr-1 ${config.iconClass || ''}`} />
                {config.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {edital.arquivo_nome}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(edital.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
                {edital.status === 'concluido' && (
                  <span className="text-primary font-medium">
                    {criteriosCount} critério{criteriosCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {edital.status === 'erro' && onReprocess && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReprocess();
                    }}
                    title="Reprocessar"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-500" />
                  </Button>
                )}
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