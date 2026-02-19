import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, FlaskConical, DollarSign, Brain, Loader2, RefreshCw, Save, History, FileText, FileCheck, Download, Sparkles, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

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

type PersonaKey = 'auditor' | 'consultor' | 'orcamentario' | 'caracteristicas';

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

interface UltimaSaida {
  auditor_text: string | null;
  consultor_text: string | null;
  orcamentario_text: string | null;
  caracteristicas_proposta_text: string | null;
  created_at: string;
}

interface ProposalSection {
  id: string;
  titulo: string;
  descricao: string;
  conteudo_sugerido: string;
  pontuacao_maxima?: number;
  obrigatorio: boolean;
  ordem: number;
}

interface ChecklistItem {
  id: string;
  item: string;
  categoria: 'documento' | 'conteudo' | 'formato' | 'prazo';
  obrigatorio: boolean;
  verificado: boolean;
}

interface ProposalModel {
  titulo: string;
  resumo_executivo: string;
  estrutura: ProposalSection[];
  requisitos_obrigatorios: string[];
  checklist: ChecklistItem[];
  anexos_necessarios: string[];
  dicas_estrategicas: string[];
  criterios_avaliacao: { criterio: string; peso: number; dica: string }[];
}

export function AnalisePersonas({ edital, criterios, onBack }: AnalisePersonasProps) {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<Record<PersonaKey, string>>({
    auditor: '',
    consultor: '',
    orcamentario: '',
    caracteristicas: '',
  });
  const [loading, setLoading] = useState<Record<PersonaKey, boolean>>({
    auditor: false,
    consultor: false,
    orcamentario: false,
    caracteristicas: false,
  });
  const [activeTab, setActiveTab] = useState<PersonaKey>('auditor');
  const [ultimaSaida, setUltimaSaida] = useState<UltimaSaida | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado para o modelo de proposta
  const [proposalModel, setProposalModel] = useState<ProposalModel | null>(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showProposalBuilder, setShowProposalBuilder] = useState(false);

  // Carregar modelo do localStorage ao iniciar
  useEffect(() => {
    const savedModel = localStorage.getItem(`proposal_model_${edital.id}`);
    if (savedModel) {
      try {
        const parsed = JSON.parse(savedModel);
        setProposalModel(parsed);
        setChecklist(parsed.checklist || []);
      } catch (e) {
        console.error('Erro ao carregar modelo salvo:', e);
      }
    }
  }, [edital.id]);

  // Salvar modelo no localStorage quando for gerado ou alterado
  useEffect(() => {
    if (proposalModel) {
      localStorage.setItem(`proposal_model_${edital.id}`, JSON.stringify({
        ...proposalModel,
        checklist // Usar o estado atual do checklist que pode ter sido marcado
      }));
    }
  }, [proposalModel, checklist, edital.id]);

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

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Não autenticado');
      }

      const aiUrl = import.meta.env.VITE_AI_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
      const aiKey = import.meta.env.VITE_AI_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${aiUrl}/functions/v1/analyze-personas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
            'apikey': aiKey,
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
    // Também executa a análise de características
    await runAnalysis('caracteristicas');
  }, [runAnalysis]);

  const fetchUltimaSaida = useCallback(async () => {
    const { data, error } = await supabase
      .from('analise_personas_saidas')
      .select('auditor_text, consultor_text, orcamentario_text, caracteristicas_proposta_text, created_at')
      .eq('edital_id', edital.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) setUltimaSaida(data);
  }, [edital.id]);

  useEffect(() => {
    fetchUltimaSaida();
  }, [fetchUltimaSaida]);

  const handleSave = useCallback(async () => {
    const hasAny = analyses.auditor || analyses.consultor || analyses.orcamentario || analyses.caracteristicas;
    if (!hasAny) {
      toast({ title: 'Nada para salvar', description: 'Execute as análises primeiro.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('analise_personas_saidas').insert({
        edital_id: edital.id,
        auditor_text: analyses.auditor || null,
        consultor_text: analyses.consultor || null,
        orcamentario_text: analyses.orcamentario || null,
        caracteristicas_proposta_text: analyses.caracteristicas || null,
      });
      if (error) throw error;
      toast({ title: 'Saída salva com sucesso!' });
      fetchUltimaSaida();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [edital.id, analyses, fetchUltimaSaida, toast]);

  // Função para gerar modelo de proposta completo usando IA
  const generateProposalModel = useCallback(async () => {
    if (criterios.length === 0) {
      toast({ title: 'Nenhum critério disponível', variant: 'destructive' });
      return;
    }

    setGeneratingProposal(true);

    try {
      const criteriosText = buildCriteriosText();
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.access_token) {
        throw new Error('Não autenticado');
      }

      const aiUrl = import.meta.env.VITE_AI_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
      const aiKey = import.meta.env.VITE_AI_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${aiUrl}/functions/v1/generate-proposal-model`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
            'apikey': aiKey,
          },
          body: JSON.stringify({
            criteriosText,
            editalNome: edital.nome,
            editalId: edital.id,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setProposalModel(data.proposalModel);
      setChecklist(data.proposalModel.checklist || []);
      setShowProposalBuilder(true);

      // O salvamento no localStorage ocorrerá via useEffect
      toast({ title: 'Modelo de proposta gerado com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar modelo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingProposal(false);
    }
  }, [criterios, edital, buildCriteriosText, toast]);

  // Toggle checklist item
  const toggleChecklistItem = useCallback((itemId: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, verificado: !item.verificado } : item
    ));
  }, []);

  // Calcular progresso do checklist
  const checklistProgress = checklist.length > 0
    ? Math.round((checklist.filter(i => i.verificado).length / checklist.length) * 100)
    : 0;

  // Exportar modelo de proposta como markdown
  const exportProposalAsMarkdown = useCallback(() => {
    if (!proposalModel) return;

    let markdown = `# ${proposalModel.titulo}\n\n`;
    markdown += `## Resumo Executivo\n${proposalModel.resumo_executivo}\n\n`;

    markdown += `## Estrutura da Proposta\n\n`;
    proposalModel.estrutura.forEach((section, idx) => {
      markdown += `### ${idx + 1}. ${section.titulo}${section.obrigatorio ? ' *(Obrigatório)*' : ''}\n`;
      markdown += `${section.descricao}\n\n`;
      if (section.pontuacao_maxima) {
        markdown += `**Pontuação máxima:** ${section.pontuacao_maxima} pontos\n\n`;
      }
      markdown += `**Conteúdo sugerido:**\n${section.conteudo_sugerido}\n\n`;
    });

    markdown += `## Requisitos Obrigatórios\n`;
    proposalModel.requisitos_obrigatorios.forEach(req => {
      markdown += `- ${req}\n`;
    });

    markdown += `\n## Anexos Necessários\n`;
    proposalModel.anexos_necessarios.forEach(anexo => {
      markdown += `- ${anexo}\n`;
    });

    markdown += `\n## Critérios de Avaliação\n`;
    proposalModel.criterios_avaliacao.forEach(crit => {
      markdown += `- **${crit.criterio}** (Peso: ${crit.peso}%): ${crit.dica}\n`;
    });

    markdown += `\n## Dicas Estratégicas\n`;
    proposalModel.dicas_estrategicas.forEach(dica => {
      markdown += `- ${dica}\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo-proposta-${edital.nome.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [proposalModel, edital.nome]);

  // Renderizar conteúdo específico da aba Características
  const renderCaracteristicasContent = () => {
    if (showProposalBuilder && proposalModel) {
      return (
        <div className="space-y-6">
          {/* Header do Modelo de Proposta */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Modelo de Proposta Gerado
              </h3>
              <p className="text-sm text-muted-foreground">
                Estrutura otimizada para {edital.nome}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowProposalBuilder(false)}>
              Ver Análise
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Tem certeza que deseja apagar o modelo atual e gerar um novo?')) {
                  localStorage.removeItem(`proposal_model_${edital.id}`);
                  setProposalModel(null);
                  setChecklist([]);
                  setShowProposalBuilder(false);
                  generateProposalModel();
                }
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regerar
            </Button>
          </div>

          {/* Progresso do Checklist */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Progresso da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{checklist.filter(i => i.verificado).length} de {checklist.length} itens</span>
                  <span className="font-medium">{checklistProgress}%</span>
                </div>
                <Progress value={checklistProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Resumo Executivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo Executivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{proposalModel.resumo_executivo}</p>
            </CardContent>
          </Card>

          {/* Estrutura da Proposta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estrutura da Proposta</CardTitle>
              <CardDescription>Seções recomendadas com base nos critérios do edital</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {proposalModel.estrutura.map((section, idx) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-medium">{section.titulo}</span>
                          {section.obrigatorio && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">Obrigatório</Badge>
                          )}
                          {section.pontuacao_maxima && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">{section.pontuacao_maxima} pts</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-9 space-y-3">
                        <p className="text-sm text-muted-foreground">{section.descricao}</p>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs font-medium mb-1">Conteúdo Sugerido:</p>
                          <p className="text-sm">{section.conteudo_sugerido}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Checklist Interativo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Checklist de Conformidade
              </CardTitle>
              <CardDescription>Marque os itens conforme for completando a proposta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['documento', 'conteudo', 'formato', 'prazo'].map(categoria => {
                  const items = checklist.filter(i => i.categoria === categoria);
                  if (items.length === 0) return null;

                  const categoriaLabels: Record<string, string> = {
                    documento: '📄 Documentos',
                    conteudo: '📝 Conteúdo',
                    formato: '📐 Formato',
                    prazo: '⏰ Prazos'
                  };

                  return (
                    <div key={categoria}>
                      <h4 className="text-sm font-medium mb-2">{categoriaLabels[categoria]}</h4>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${item.verificado ? 'bg-green-500/10' : 'hover:bg-muted/50'
                              }`}
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.verificado}
                              onCheckedChange={() => toggleChecklistItem(item.id)}
                            />
                            <label
                              htmlFor={item.id}
                              className={`text-sm cursor-pointer flex-1 ${item.verificado ? 'line-through text-muted-foreground' : ''
                                }`}
                            >
                              {item.item}
                              {item.obrigatorio && (
                                <AlertTriangle className="inline w-3 h-3 ml-1 text-destructive" />
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Critérios de Avaliação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Critérios de Avaliação</CardTitle>
              <CardDescription>Como sua proposta será pontuada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposalModel.criterios_avaliacao.map((crit, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {crit.peso}%
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{crit.criterio}</p>
                      <p className="text-xs text-muted-foreground mt-1">{crit.dica}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dicas Estratégicas */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Dicas Estratégicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {proposalModel.dicas_estrategicas.map((dica, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500">💡</span>
                    {dica}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Anexos Necessários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anexos Necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {proposalModel.anexos_necessarios.map((anexo, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                    <Circle className="w-2 h-2 text-primary" />
                    {anexo}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div >
      );
    }

    // Conteúdo padrão da análise + botão para gerar modelo
    return (
      <>
        {loading.caracteristicas ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando características da proposta...</p>
          </div>
        ) : analyses.caracteristicas ? (
          <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-540px)]">
              <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                <ReactMarkdown>{analyses.caracteristicas}</ReactMarkdown>
              </div>
            </ScrollArea>

            <div className="pt-4 border-t flex flex-col gap-2">
              {proposalModel ? (
                <Button
                  onClick={() => setShowProposalBuilder(true)}
                  variant="outline"
                  className="w-full gap-2 border-primary text-primary hover:bg-primary/5"
                  size="lg"
                >
                  <FileCheck className="w-4 h-4" />
                  Ver Modelo de Proposta Existente
                </Button>
              ) : null}

              <Button
                onClick={generateProposalModel}
                disabled={generatingProposal}
                className="w-full gap-2"
                size="lg"
              >
                {generatingProposal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Modelo de Proposta...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {proposalModel ? 'Regerar Modelo de Proposta Completo' : 'Gerar Modelo de Proposta Completo'}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                A IA irá criar uma estrutura detalhada de proposta com checklist interativo
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <FileText className="w-8 h-8" />
            <p className="text-sm">Clique em "Analisar" para extrair as características da proposta</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button onClick={runAllAnalyses} className="gap-2" disabled={Object.values(loading).some(Boolean)}>
            <Brain className="w-4 h-4" />
            Analisar com Todas as Personas
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            className="gap-2"
            disabled={saving || !(analyses.auditor || analyses.consultor || analyses.orcamentario || analyses.caracteristicas)}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Análise por Personas — {edital.nome}</h2>
          <p className="text-sm text-muted-foreground">
            4 perspectivas de IA aplicadas a {criterios.length} critério{criterios.length !== 1 ? 's' : ''}
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
                  {p.key !== 'caracteristicas' || !showProposalBuilder ? (
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
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {p.key === 'caracteristicas' ? (
                  renderCaracteristicasContent()
                ) : loading[p.key] ? (
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

      {/* Seção de Características e Modelo de Proposta - Sempre visível abaixo das tabs */}
      <Card className="border-l-4 border-l-blue-500 overflow-hidden">
        <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-500" />
                Características & Modelo de Proposta
              </CardTitle>
              <CardDescription>Análise de formato, critérios e construção do modelo estruturado</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runAnalysis('caracteristicas')}
                disabled={loading.caracteristicas}
                className="gap-2"
              >
                {loading.caracteristicas ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : analyses.caracteristicas ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                {loading.caracteristicas ? 'Analisando...' : 'Analisar Texto'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {renderCaracteristicasContent()}
        </CardContent>
      </Card>

      {ultimaSaida && (ultimaSaida.auditor_text || ultimaSaida.consultor_text || ultimaSaida.orcamentario_text || ultimaSaida.caracteristicas_proposta_text) && (
        <Collapsible defaultOpen={false} className="rounded-xl border bg-muted/30">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Última saída salva</span>
              <Badge variant="secondary" className="text-xs">
                {new Date(ultimaSaida.created_at).toLocaleString('pt-BR')}
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-6">
              {ultimaSaida.auditor_text && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    Auditor de Conformidade
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{ultimaSaida.auditor_text}</ReactMarkdown>
                  </div>
                </div>
              )}
              {ultimaSaida.consultor_text && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <FlaskConical className="w-4 h-4" />
                    Consultor de P&D
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{ultimaSaida.consultor_text}</ReactMarkdown>
                  </div>
                </div>
              )}
              {ultimaSaida.orcamentario_text && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Analista Orçamentário
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{ultimaSaida.orcamentario_text}</ReactMarkdown>
                  </div>
                </div>
              )}
              {ultimaSaida.caracteristicas_proposta_text && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    Características da Proposta
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{ultimaSaida.caracteristicas_proposta_text}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
