import { ArrowLeft, FileText, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface Criterio {
  id: string;
  titulo: string | null;
  conteudo: string;
  secao: string | null;
  ordem: number;
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
}

export function CriteriosList({ edital, criterios, onBack }: CriteriosListProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groupedCriterios = criterios.reduce((acc, criterio) => {
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
    const text = criterios
      .map(c => `[${edital.nome}]\n${c.titulo ? `${c.titulo}\n` : ''}${c.conteudo}`)
      .join('\n\n---\n\n');
    await navigator.clipboard.writeText(text);
    toast({ title: 'Todos os critérios copiados!' });
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
            {criterios.length} critério{criterios.length !== 1 ? 's' : ''} encontrado{criterios.length !== 1 ? 's' : ''}
          </p>
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