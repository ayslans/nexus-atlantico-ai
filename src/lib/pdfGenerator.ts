import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare global {
  interface JsPdfAutoTableOptions {
    head?: string[][];
    body?: string[][];
    startY?: number;
    margin?: { left: number; right: number; top?: number; bottom?: number };
    columnStyles?: Record<number, Record<string, unknown>>;
    headStyles?: Record<string, unknown>;
    bodyStyles?: Record<string, unknown>;
    alternateRowStyles?: Record<string, unknown>;
    didDrawPage?: (data: Record<string, unknown>) => void;
  }
}

export class PDFGenerator {
  private doc: jsPDF;
  private pageNumber: number = 1;
  private totalPages: number = 1;
  private margin: number;
  private colors: {
    primary: number[];
    secondary: number[];
    text: number[];
    lightGray: number[];
    white: number[];
  };
  private footerInfo: string;

  constructor(options: { orientation?: 'portrait' | 'landscape'; margin?: number } = {}) {
    this.doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.margin = options.margin || 15;
    this.footerInfo = `Relatório Gerado em ${new Date().toLocaleDateString('pt-BR')}`;

    this.colors = {
      primary: [18, 56, 104], // Azul Corporativo Escuro
      secondary: [72, 85, 99], // Cinza Corporativo
      text: [22, 28, 36], // Preto Suave
      lightGray: [245, 246, 250], // Fundo de Linha Alternada
      white: [255, 255, 255],
    };
    
    // Define a fonte padrão para o documento
    this.doc.setFont('helvetica', 'normal');
  }

  /**
   * Adiciona o rodapé a todas as páginas.
   * @private
   */
  private _addFooter() {
    const pageCount = this.doc.internal.pages.length -1;
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      const pageWidth = this.doc.internal.pageSize.getWidth();
      const pageHeight = this.doc.internal.pageSize.getHeight();
      
      // Linha decorativa
      this.doc.setDrawColor(...this.colors.secondary);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, pageHeight - 10, pageWidth - this.margin, pageHeight - 10);

      // Texto do rodapé
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.colors.secondary);
      
      const footerText = `${this.footerInfo} | Página ${i} de ${pageCount}`;
      const textWidth = this.doc.getStringUnitWidth(footerText) * this.doc.getFontSize() / this.doc.internal.scaleFactor;
      
      this.doc.text(footerText, pageWidth / 2 - textWidth / 2, pageHeight - 7);
    }
  }

  /**
   * Adiciona cabeçalho profissional com logo (placeholder).
   */
  addHeader(options: { title: string; subtitle?: string; logoUrl?: string }): number {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const startY = this.margin;

    // Logo (placeholder)
    if (options.logoUrl) {
      // Exemplo: this.doc.addImage(options.logoUrl, 'PNG', pageWidth - this.margin - 30, startY, 25, 25);
    } else {
        this.doc.setFillColor(...this.colors.primary);
        this.doc.rect(pageWidth - this.margin - 15, startY - 5, 15, 15, 'F');
    }
    
    // Título
    this.doc.setFontSize(22);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(options.title, this.margin, startY + 5);

    let currentY = startY + 12;

    // Subtítulo
    if (options.subtitle) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(options.subtitle, this.margin, currentY);
      currentY += 8;
    }

    // Linha decorativa inferior
    this.doc.setDrawColor(...this.colors.lightGray);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, currentY, pageWidth - this.margin, currentY);

    return currentY + 6;
  }

  /**
   * Adiciona uma seção com título estilizado.
   */
  addSection(title: string, currentY: number): number {
    this._ensurePage(currentY);
    const pageWidth = this.doc.internal.pageSize.getWidth();
    
    // Fundo da seção
    this.doc.setFillColor(...this.colors.lightGray);
    this.doc.rect(this.margin, currentY, pageWidth - 2 * this.margin, 10, 'F');
    
    // Texto do título
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, this.margin + 3, currentY + 7);

    return currentY + 15;
  }

  /**
   * Adiciona parágrafo de texto com formatação e quebra automática.
   */
  addParagraph(text: string, currentY: number, options: { fontSize?: number; bold?: boolean; color?: number[] } = {}): number {
    currentY = this._ensurePage(currentY);
    const { fontSize = 10, bold = false, color = this.colors.text } = options;
    const maxWidth = this.doc.internal.pageSize.getWidth() - 2 * this.margin;

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setTextColor(...(color as [number, number, number]));

    const lines = this.doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35; // Ajuste de espaçamento entre linhas
    
    this.doc.text(lines as string[], this.margin, currentY);

    return currentY + (lines.length * lineHeight) + 4;
  }

  /**
   * Adiciona uma tabela com estilo corporativo.
   */
  addTable(headers: string[], rows: string[][], currentY: number, options: { columnWidths?: number[]; title?: string } = {}): number {
    currentY = this._ensurePage(currentY, 40);

    if (options.title) {
      currentY = this.addParagraph(options.title, currentY, { fontSize: 11, bold: true });
    }

    const headStyles = {
      fillColor: this.colors.primary,
      textColor: this.colors.white,
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 3,
      valign: 'middle',
    };

    const bodyStyles = {
      textColor: this.colors.text,
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      valign: 'middle',
    };

    try {
      (this.doc as jsPDF & { autoTable: (options: JsPdfAutoTableOptions) => void }).autoTable({
        head: [headers],
        body: rows,
        startY: currentY,
        margin: { left: this.margin, right: this.margin },
        styles: { overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 'auto' } },
        headStyles,
        bodyStyles,
        alternateRowStyles: {
          fillColor: this.colors.lightGray,
        },
        didDrawPage: () => {
          // Lógica para cabeçalho/rodapé em cada página da tabela, se necessário
        }
      });

      const finalY = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      return finalY + 8;

    } catch (error) {
      console.error('Erro ao adicionar tabela:', error);
      return currentY + 10;
    }
  }

  /**
   * Adiciona uma caixa de destaque para informações importantes.
   */
  addHighlightBox(title: string, content: string, currentY: number): number {
    currentY = this._ensurePage(currentY, 30);
    const boxWidth = this.doc.internal.pageSize.getWidth() - 2 * this.margin;
    
    const contentLines = this.doc.splitTextToSize(content, boxWidth - 8);
    const boxHeight = 10 + (contentLines.length * 4) + 5;

    // Borda e fundo
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setFillColor(...this.colors.lightGray);
    this.doc.rect(this.margin, currentY, boxWidth, boxHeight, 'FD');
    
    // Título
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, this.margin + 4, currentY + 7);

    // Conteúdo
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(contentLines as string[], this.margin + 4, currentY + 14);

    return currentY + boxHeight + 8;
  }

  /**
   * Garante que há espaço na página, senão adiciona uma nova.
   * @private
   */
  private _ensurePage(currentY: number, spaceNeeded: number = 20): number {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    if (currentY > pageHeight - this.margin - spaceNeeded) {
      return this.addPageBreak();
    }
    return currentY;
  }

  /**
   * Adiciona quebra de página manual.
   */
  addPageBreak(): number {
    this.doc.addPage();
    return this.margin;
  }

  /**
   * Salva o PDF, adicionando o rodapé a todas as páginas antes.
   */
  save(filename: string): void {
    this._addFooter(); // Adiciona rodapés em todas as páginas
    try {
      this.doc.save(filename);
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      throw new Error('Falha ao salvar o PDF. Tente novamente.');
    }
  }

  /**
   * Retorna o documento para manipulação direta, se necessário.
   */
  getDocument(): jsPDF {
    return this.doc;
  }
}
