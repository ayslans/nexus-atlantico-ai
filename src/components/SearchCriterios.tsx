import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, ArrowLeft, Copy, CheckCircle, X, Download, FileSpreadsheet, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

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

interface SearchCriteriosProps {
  editais: Edital[];
  criterios: Record<string, Criterio[]>;
  onBack: () => void;
}

export function SearchCriterios({ editais, criterios, onBack }: SearchCriteriosProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEditalId, setSelectedEditalId] = useState<string>('all');
  const [selectedSecao, setSelectedSecao] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allCriterios = useMemo(() => {
    return Object.entries(criterios).flatMap(([editalId, items]) =>
      items.map((c) => ({ ...c, editalId }))
    );
  }, [criterios]);

  const editalMap = useMemo(() => {
    const map: Record<string, Edital> = {};
    editais.forEach((e) => (map[e.id] = e));
    return map;
  }, [editais]);

  const allSecoes = useMemo(() => {
    const set = new Set<string>();
    allCriterios.forEach((c) => {
      if (c.secao) set.add(c.secao);
    });
    return Array.from(set).sort();
  }, [allCriterios]);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allCriterios.filter((c) => {
      if (selectedEditalId !== 'all' && c.edital_id !== selectedEditalId) return false;
      if (selectedSecao !== 'all' && c.secao !== selectedSecao) return false;
      if (query) {
        const matchTitle = c.titulo?.toLowerCase().includes(query);
        const matchContent = c.conteudo.toLowerCase().includes(query);
        const matchSecao = c.secao?.toLowerCase().includes(query);
        const editalNome = editalMap[c.edital_id]?.nome?.toLowerCase() || '';
        const matchEdital = editalNome.includes(query);
        if (!matchTitle && !matchContent && !matchSecao && !matchEdital) return false;
      }
      return true;
    });
  }, [allCriterios, searchQuery, selectedEditalId, selectedSecao, editalMap]);

  const copyToClipboard = async (criterio: typeof filtered[0]) => {
    const editalNome = editalMap[criterio.edital_id]?.nome || 'Edital';
    const text = `[${editalNome}]\n${criterio.titulo ? `${criterio.titulo}\n` : ''}${criterio.conteudo}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(criterio.id);
    toast({ title: 'Copiado para a área de transferência!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasActiveFilters = selectedEditalId !== 'all' || selectedSecao !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedEditalId('all');
    setSelectedSecao('all');
  };

  const completedEditais = editais.filter((e) => e.status === 'concluido');

  const exportCSV = useCallback(() => {
    if (filtered.length === 0) return;
    const headers = ['Edital', 'Seção', 'Título', 'Conteúdo'];
    const rows = filtered.map((c) => [
      editalMap[c.edital_id]?.nome || '',
      c.secao || '',
      c.titulo || `Critério ${c.ordem}`,
      c.conteudo.replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `criterios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length} critérios exportados para CSV` });
  }, [filtered, editalMap, toast]);

  const exportPDF = useCallback(async () => {
    if (filtered.length === 0) return;
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.text('Critérios Extraídos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')} — ${filtered.length} critérios`, 14, 22);

    const rows = filtered.map((c) => [
      editalMap[c.edital_id]?.nome || '',
      c.secao || '',
      c.titulo || `Critério ${c.ordem}`,
      c.conteudo.substring(0, 300) + (c.conteudo.length > 300 ? '...' : ''),
    ]);

    (doc as any).autoTable({
      head: [['Edital', 'Seção', 'Título', 'Conteúdo']],
      body: rows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 'auto' },
      },
    });

    doc.save(`criterios_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: `${filtered.length} critérios exportados para PDF` });
  }, [filtered, editalMap, toast]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm" disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCSV} className="gap-2 text-xs sm:text-sm">
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF} className="gap-2 text-xs sm:text-sm">
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">Buscar Critérios</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {filtered.length} critério{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''} em {completedEditais.length} edita{completedEditais.length !== 1 ? 'is' : 'l'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, conteúdo, seção ou edital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-muted-foreground">Filtros:</span>
          </div>

          <Select value={selectedEditalId} onValueChange={setSelectedEditalId}>
            <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm">
              <SelectValue placeholder="Edital" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os editais</SelectItem>
              {completedEditais.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSecao} onValueChange={setSelectedSecao}>
            <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm">
              <SelectValue placeholder="Seção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as seções</SelectItem>
              {allSecoes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs sm:text-sm text-muted-foreground">
              <X className="w-3 h-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="h-[calc(100vh-380px)] sm:h-[calc(100vh-420px)]">
        <div className="space-y-3 pr-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'Nenhum critério encontrado com os filtros selecionados'
                  : 'Nenhum critério disponível'}
              </p>
            </div>
          ) : (
            filtered.map((criterio) => {
              const edital = editalMap[criterio.edital_id];
              return (
                <Card key={criterio.id} className="group hover:shadow-card transition-shadow">
                  <CardHeader className="pb-2 px-3 sm:px-6">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base font-medium break-words">
                        {criterio.titulo || `Critério ${criterio.ordem}`}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => copyToClipboard(criterio)}
                      >
                        {copiedId === criterio.id ? (
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
                      {criterio.conteudo}
                    </p>
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {edital?.nome || 'Edital'}
                      </Badge>
                      {criterio.secao && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                          {criterio.secao}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
