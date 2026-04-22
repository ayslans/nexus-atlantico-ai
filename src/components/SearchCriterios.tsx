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
import { PDFGenerator } from '@/lib/pdfGenerator';

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

    try {
      const pdf = new PDFGenerator({ orientation: 'landscape' });
      const now = new Date();

      // Cabeçalho do Relatório
      let currentY = pdf.addHeader({
        title: 'Relatório de Análise de Critérios',
        subtitle: `Exportado de Tender Hunter AI em ${now.toLocaleDateString('pt-br')}`,
      });
      
      // Estatísticas
      const editaisUnicos = new Set(filtered.map(c => editalMap[c.edital_id]?.nome || 'Desconhecido')).size;
      const stats = `Total de Critérios Filtrados: ${filtered.length} | Abrangendo ${editaisUnicos} edita(is).`;
      currentY = pdf.addParagraph(stats, currentY, { fontSize: 9, color: pdf.colors.secondary });
      currentY += 5;

      // Seção de Critérios
      currentY = pdf.addSection('Critérios Detalhados', currentY);

      // Preparar dados da tabela
      const rows = filtered.map((c) => [
        editalMap[c.edital_id]?.nome || '—',
        c.secao || '—',
        c.titulo || `Critério ${c.ordem}`,
        c.conteudo, // Passa o conteúdo completo
      ]);

      // Adicionar tabela
      currentY = pdf.addTable(
        ['Edital', 'Seção', 'Título', 'Conteúdo'],
        rows,
        currentY,
      );

      // Salvar PDF (o rodapé com paginação é adicionado automaticamente)
      pdf.save(`Relatorio_Criterios_${now.toISOString().slice(0, 10)}.pdf`);
      
      toast({
        title: '✅ PDF exportado com sucesso!',
        description: `${filtered.length} critérios incluídos no relatório.`,
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: '❌ Erro ao exportar PDF',
        description: 'Não foi possível gerar o relatório. Tente o formato CSV.',
        variant: 'destructive',
      });
    }
  }, [filtered, editalMap, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={filtered.length === 0}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCSV} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Search className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Buscar Critérios</h2>
          <p className="text-sm text-muted-foreground">
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

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros:</span>
          </div>

          <Select value={selectedEditalId} onValueChange={setSelectedEditalId}>
            <SelectTrigger className="w-[200px]">
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
            <SelectTrigger className="w-[200px]">
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="w-3 h-3" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="h-[calc(100vh-420px)]">
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
                          <CheckCircle className="w-4 h-4 text-green-500" />
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
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {edital?.nome || 'Edital'}
                      </Badge>
                      {criterio.secao && (
                        <Badge variant="secondary" className="text-xs">
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
