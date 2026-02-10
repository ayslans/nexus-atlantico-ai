import { useState, useCallback } from 'react';
import { ArrowLeft, ShieldCheck, FlaskConical, DollarSign, Brain, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Criterio {
  id: string;
  edital_id: string;
  titulo: string | null;
  conteudo: string;
  secao: string | null;
  ordem: number;
}

interface Edital {
  id: string;
  nome: string;
  arquivo_nome: string;
  status: string;
}

interface AnalisePersonasProps {
  edital: Edital;
  criterios: Criterio[];
  onBack: () => void;
}

type PersonaKey = 'auditor' | 'consultor' | 'orcamentario';

interface PersonaConfig {
  key: PersonaKey;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    key: 'auditor',
    label: 'Auditor de Conformidade',
    icon: <ShieldCheck className="w-4 h-4" />,
    description: 'Elegibilidade, proibições e prazos',
    color: 'border-l-destructive',
  },
  {
    key: 'consultor',
    label: 'Consultor de P&D',
    icon: <FlaskConical className="w-4 h-4" />,
    description: 'Escopo técnico, TRL e inovação',
    color: 'border-l-primary',
  },
  {
    key: 'orcamentario',
    label: 'Analista Orçamentário',
    icon: <DollarSign className="w-4 h-4" />,
    description: 'Regras financeiras e contrapartida',
    color: 'border-l-warning',
  },
];

export function AnalisePersonas({ edital, criterios, onBack }: AnalisePersonasProps) {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<Record<PersonaKey, string>>({
    auditor: '',
    consultor: '',
    orcamentario: '',
  });
  const [loading, setLoading] = useState<Record<PersonaKey, boolean>>({
    auditor: false,
    consultor: false,
    orcamentario: false,
  });
  const [activeTab, setActiveTab] = useState<PersonaKey>('auditor');

  const buildCriteriosText = useCallback(() => {
    return criterios
      .sort((a, b) => a.ordem - b.ordem)
      .map(c => {
        const parts: string[] = [];
        if (c.secao) parts.push(`[Seção: ${c.secao}]`);
        if (c.titulo) parts.push(c.titulo);
        parts.push(c.conteudo);
        return parts.join('\n');
      })
      .join('\n\n---\n\n');
  }, [criterios]);

  const runAnalysis = useCallback(async (persona: PersonaKey) => {
    if (criterios.length === 0) {
      toast({ title: 'Nenhum critério disponível para análise', variant: 'destructive' });
      return;
    }

    setLoading(prev => ({ ...prev, [persona]: true }));

    try {
      const criteriosText = buildCriteriosText();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-personas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            persona,
            criteriosText,
            editalNome: edital.nome,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setAnalyses(prev => ({ ...prev, [persona]: data.analysis }));
    } catch (error: any) {
      toast({
        title: 'Erro na análise',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [persona]: false }));
    }
  }, [criterios, edital.nome, buildCriteriosText, toast]);

  const runAllAnalyses = useCallback(async () => {
    for (const persona of PERSONAS) {
      await runAnalysis(persona.key);
    }
  }, [runAnalysis]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button onClick={runAllAnalyses} className="gap-2" disabled={Object.values(loading).some(Boolean)}>
          <Brain className="w-4 h-4" />
          Analisar com Todas as Personas
        </Button>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Análise por Personas — {edital.nome}</h2>
          <p className="text-sm text-muted-foreground">
            3 perspectivas de IA aplicadas a {criterios.length} critério{criterios.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PersonaKey)}>
        <TabsList className="grid w-full grid-cols-3">
          {PERSONAS.map(p => (
            <TabsTrigger key={p.key} value={p.key} className="gap-2 text-xs sm:text-sm">
              {p.icon}
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.label.split(' ')[0]}</span>
              {analyses[p.key] && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center text-[10px]">✓</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {PERSONAS.map(p => (
          <TabsContent key={p.key} value={p.key}>
            <Card className={`border-l-4 ${p.color}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {p.icon}
                      {p.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAnalysis(p.key)}
                    disabled={loading[p.key]}
                    className="gap-2"
                  >
                    {loading[p.key] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : analyses[p.key] ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Brain className="w-4 h-4" />
                    )}
                    {loading[p.key] ? 'Analisando...' : analyses[p.key] ? 'Reanalisar' : 'Analisar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading[p.key] ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisando com {p.label}...</p>
                  </div>
                ) : analyses[p.key] ? (
                  <ScrollArea className="h-[calc(100vh-440px)]">
                    <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                      <ReactMarkdown>{analyses[p.key]}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    {p.icon}
                    <p className="text-sm">Clique em "Analisar" para gerar a análise desta persona</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
