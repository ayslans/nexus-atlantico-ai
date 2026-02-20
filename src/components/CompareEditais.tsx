import { useState, useMemo } from 'react';
import { ArrowLeft, GitCompareArrows, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

interface CompareEditaisProps {
  editais: Edital[];
  criterios: Record<string, Criterio[]>;
  onBack: () => void;
}

export function CompareEditais({ editais, criterios, onBack }: CompareEditaisProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const completedEditais = editais.filter((e) => e.status === 'concluido');

  const toggleEdital = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const editalMap = useMemo(() => {
    const map: Record<string, Edital> = {};
    editais.forEach((e) => (map[e.id] = e));
    return map;
  }, [editais]);

  // Group criteria by section across selected editais
  const comparisonData = useMemo(() => {
    if (selectedIds.length < 2) return null;

    const allSections = new Set<string>();
    selectedIds.forEach((id) => {
      (criterios[id] || []).forEach((c) => {
        allSections.add(c.secao || 'Sem seção');
      });
    });

    const sections = Array.from(allSections).sort();
    return sections.map((section) => ({
      section,
      columns: selectedIds.map((editalId) => ({
        editalId,
        criterios: (criterios[editalId] || [])
          .filter((c) => (c.secao || 'Sem seção') === section)
          .sort((a, b) => a.ordem - b.ordem),
      })),
    }));
  }, [selectedIds, criterios]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isComparing = selectedIds.length >= 2;

  // Color palette for edital columns
  const columnColors = [
    'border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20',
    'border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20',
    'border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20',
    'border-purple-400/50 bg-purple-50/30 dark:bg-purple-950/20',
    'border-rose-400/50 bg-rose-50/30 dark:bg-rose-950/20',
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <GitCompareArrows className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">Comparar Editais</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Selecione 2 ou mais editais para comparar seus critérios lado a lado
          </p>
        </div>
      </div>

      {/* Edital selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Editais para comparar</CardTitle>
        </CardHeader>
        <CardContent>
          {completedEditais.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              É necessário ter pelo menos 2 editais processados para comparar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {completedEditais.map((edital, i) => (
                <label
                  key={edital.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.includes(edital.id)
                      ? columnColors[selectedIds.indexOf(edital.id) % columnColors.length]
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.includes(edital.id)}
                    onCheckedChange={() => toggleEdital(edital.id)}
                  />
                  <span className="text-sm font-medium">{edital.nome}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(criterios[edital.id] || []).length}
                  </Badge>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison view */}
      {isComparing && comparisonData && (
        <ScrollArea className="h-[calc(100vh-440px)] sm:h-[calc(100vh-480px)]">
          <div className="space-y-3 pr-2 sm:pr-4">
            {comparisonData.map(({ section, columns }) => {
              const isOpen = openSections[section] !== false; // default open
              const totalInSection = columns.reduce((s, c) => s + c.criterios.length, 0);

              return (
                <Collapsible
                  key={section}
                  open={isOpen}
                  onOpenChange={() => toggleSection(section)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                      )}
                      <Badge variant="secondary" className="text-xs sm:text-sm font-medium">
                        {section}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
                        {totalInSection} critério{totalInSection !== 1 ? 's' : ''}
                      </span>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div
                      className="grid gap-2 sm:gap-3 mt-2 sm:mt-3"
                      style={{
                        gridTemplateColumns: `repeat(${selectedIds.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {columns.map(({ editalId, criterios: sectionCriterios }, colIdx) => (
                        <div
                          key={editalId}
                          className={`rounded-lg border p-2 sm:p-3 space-y-2 sm:space-y-3 ${
                            columnColors[colIdx % columnColors.length]
                          }`}
                        >
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                            {editalMap[editalId]?.nome}
                          </p>

                          {sectionCriterios.length === 0 ? (
                            <p className="text-[10px] sm:text-xs text-muted-foreground italic py-3 sm:py-4 text-center">
                              Sem critérios nesta seção
                            </p>
                          ) : (
                            sectionCriterios.map((c) => (
                              <div
                                key={c.id}
                                className="bg-background rounded-md p-2 sm:p-3 border text-xs sm:text-sm space-y-1"
                              >
                                {c.titulo && (
                                  <p className="font-medium text-xs sm:text-sm break-words">{c.titulo}</p>
                                )}
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {c.conteudo}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {selectedIds.length === 1 && (
        <div className="text-center py-6 sm:py-8">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Selecione mais um edital para iniciar a comparação
          </p>
        </div>
      )}
    </div>
  );
}
