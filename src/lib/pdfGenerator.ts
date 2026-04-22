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
  private margin: number;
  private colors: {
    primary: number[];
    secondary: number[];
    text: number[];
    lightGray: number[];
  };

  constructor(options: { orientation?: 'portrait' | 'landscape'; margin?: number } = {}) {
    this.doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    this.margin = options.margin || 12;

    this.colors = {
      primary: [59, 130, 246],
      secondary: [107, 114, 128],
      text: [31, 41, 55],
      lightGray: [243, 244, 246],
    };
  }

  /**
   * Adiciona cabeçalho profissional
   */
  addHeader(options: { title: string; subtitle?: string; date?: Date }): number {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const startX = this.margin;
    const startY = this.margin;

    // Linha decorativa superior
    this.doc.setDrawColor(...(this.colors.primary as [number, number, number]));
    this.doc.setLineWidth(1.5);
    this.doc.line(startX, startY, pageWidth - this.margin, startY);

    // Título
    this.doc.setFontSize(24);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(...(this.colors.primary as [number, number, number]));
    this.doc.text(options.title, startX, startY + 10);

    let currentY = startY + 18;

    // Subtítulo
    if (options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(...(this.colors.secondary as [number, number, number]));
      this.doc.text(options.subtitle, startX, currentY);
      currentY += 8;
    }

    // Data
    if (options.date) {
      this.doc.setFontSize(9);
      this.doc.setTextColor(...(this.colors.text as [number, number, number]));
      const dateStr = options.date.toLocaleDateString('pt-BR');
      const timeStr = options.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      this.doc.text(`Gerado em: ${dateStr} às ${timeStr}`, startX, currentY);
      currentY += 5;
    }

    // Linha decorativa inferior
    this.doc.setLineWidth(0.5);
    this.doc.setDrawColor(240, 240, 240);
    this.doc.line(startX, currentY + 2, pageWidth - this.margin, currentY + 2);

    return currentY + 8;
  }

  /**
   * Adiciona uma seção com título colorido
   */
  addSection(title: string, currentY: number): number {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const startX = this.margin;

    // Verificar se precisa nova página
    if (currentY > pageHeight - 30) {
      this.doc.addPage();
      this.pageNumber++;
      return this.margin;
    }

    // Fundo colorido
    this.doc.setFillColor(...(this.colors.primary as [number, number, number]));
    this.doc.rect(startX - 2, currentY - 5, pageWidth - 2 * this.margin + 4, 8, 'F');

    // Texto
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, startX + 2, currentY);

    return currentY + 10;
  }

  /**
   * Adiciona parágrafo de texto com quebra automática
   */
  addParagraph(text: string, currentY: number, fontSize: number = 10, bold: boolean = false): number {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const startX = this.margin;
    const maxWidth = pageWidth - 2 * this.margin;

    // Verificar se precisa nova página
    if (currentY > pageHeight - 20) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    this.doc.setFontSize(fontSize);
    this.doc.setFont(undefined, bold ? 'bold' : 'normal');
    this.doc.setTextColor(...(this.colors.text as [number, number, number]));

    const lines = this.doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize / 2.8;

    this.doc.text(lines as string[], startX, currentY);

    return currentY + (lines.length * lineHeight) + 4;
  }

  /**
   * Adiciona uma tabela formatada
   */
  addTable(headers: string[], rows: string[][], currentY: number, columnWidths?: number[]): number {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();

    // Verificar se precisa nova página
    if (currentY > pageHeight - 40) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    // Calcular larguras das colunas
    const colWidths = columnWidths || new Array(headers.length).fill((pageWidth - 2 * this.margin) / headers.length);

    // Construir styles de coluna
    const columnStyles: Record<number, Record<string, unknown>> = {};
    colWidths.forEach((width, idx) => {
      columnStyles[idx] = { cellWidth: width };
    });

    try {
      const tableOptions: JsPdfAutoTableOptions = {
        head: [headers],
        body: rows,
        startY: currentY,
        margin: { left: this.margin, right: this.margin },
        columnStyles,
        headStyles: {
          fillColor: this.colors.primary,
          textColor: [255, 255, 255],
          font: 'helvetica',
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 4,
          halign: 'left',
        } as Record<string, unknown>,
        bodyStyles: {
          textColor: this.colors.text,
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3,
        } as Record<string, unknown>,
        alternateRowStyles: {
          fillColor: this.colors.lightGray,
        } as Record<string, unknown>,
      };

      (this.doc as any).autoTable(tableOptions);

      const lastAutoTable = (this.doc as any).lastAutoTable;
      if (lastAutoTable) {
        this.pageNumber = this.doc.internal.pages.length - 1;
        return lastAutoTable.finalY + 5;
      }
    } catch (error) {
      console.error('Erro ao adicionar tabela:', error);
    }

    return currentY + 20;
  }

  /**
   * Adiciona um box de destaque
   */
  addHighlightBox(title: string, content: string, currentY: number): number {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const startX = this.margin;
    const boxWidth = pageWidth - 2 * this.margin;

    // Verificar se precisa nova página
    if (currentY > pageHeight - 30) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    // Fundo do box
    const bgColor = [
      Math.min(255, this.colors.primary[0] + 30),
      Math.min(255, this.colors.primary[1] + 30),
      Math.min(255, this.colors.primary[2] + 30),
    ];
    this.doc.setFillColor(...(bgColor as [number, number, number]));

    // Calcular altura
    const contentLines = this.doc.splitTextToSize(content, boxWidth - 8);
    const boxHeight = 5 + 5 + contentLines.length * 4 + 4;

    this.doc.rect(startX, currentY, boxWidth, boxHeight, 'F');

    // Título
    this.doc.setFontSize(11);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(...(this.colors.primary as [number, number, number]));
    this.doc.text(title, startX + 4, currentY + 5);

    // Conteúdo
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(...(this.colors.text as [number, number, number]));
    this.doc.text(contentLines as string[], startX + 4, currentY + 11);

    return currentY + boxHeight + 6;
  }

  /**
   * Adiciona quebra de página
   */
  addPageBreak(): number {
    this.doc.addPage();
    this.pageNumber++;
    return this.margin;
  }

  /**
   * Salva o PDF
   */
  save(filename: string): void {
    try {
      this.doc.save(filename);
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      throw new Error('Falha ao salvar o PDF. Tente novamente.');
    }
  }

  /**
   * Retorna o documento para manipulação direta
   */
  getDocument(): jsPDF {
    return this.doc;
  }
}
