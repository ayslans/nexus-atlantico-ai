import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface PDFHeaderOptions {
  title: string;
  subtitle?: string;
  date?: Date;
  companyName?: string;
}

export interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PDFGeneratorOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
  margin?: number;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

/**
 * Classe para gerar PDFs profissionais com design consistente
 */
export class PDFGenerator {
  private doc: jsPDF;
  private pageNumber: number = 1;
  private margin: number;
  private colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    text: [number, number, number];
    lightGray: [number, number, number];
  };

  constructor(options: PDFGeneratorOptions = {}) {
    this.doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4',
    });

    this.margin = options.margin || 12;

    // Cores padrão - tema azul e cinza moderno
    const colorPrimary = [59, 130, 246]; // Azul
    const colorSecondary = [107, 114, 128]; // Cinza escuro
    const colorAccent = [34, 197, 94]; // Verde
    const colorText = [31, 41, 55]; // Cinza muito escuro
    const colorLightGray = [243, 244, 246]; // Cinza claro

    this.colors = {
      primary: options.colors?.primary ? this.hexToRgb(options.colors.primary as any) : colorPrimary,
      secondary: options.colors?.secondary ? this.hexToRgb(options.colors.secondary as any) : colorSecondary,
      accent: options.colors?.accent ? this.hexToRgb(options.colors.accent as any) : colorAccent,
      text: colorText,
      lightGray: colorLightGray,
    };
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1] as string, 16),
        parseInt(result[2] as string, 16),
        parseInt(result[3] as string, 16),
      ];
    }
    return [0, 0, 0];
  }

  private getPageHeight(): number {
    return this.doc.internal.pageSize.getHeight();
  }

  private getPageWidth(): number {
    return this.doc.internal.pageSize.getWidth();
  }

  private addPageNumber(): void {
    const pageSize = this.doc.getPageSize();
    const pageCount = this.doc.getNumberOfPages();
    const width = pageSize.getWidth();
    const height = pageSize.getHeight();

    this.doc.setFontSize(9);
    this.doc.setTextColor(this.colors.secondary[0], this.colors.secondary[1], this.colors.secondary[2]);
    this.doc.text(
      `Página ${this.pageNumber} de ${pageCount}`,
      width - this.margin - 20,
      height - this.margin + 5,
      { align: 'right' }
    );
  }

  /**
   * Adiciona cabeçalho profissional com título, subtítulo e informações
   */
  addHeader(options: PDFHeaderOptions): void {
    const pageWidth = this.getPageWidth();
    const startX = this.margin;
    const startY = this.margin;

    // Linha decorativa superior
    this.doc.setDrawColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
    this.doc.setLineWidth(1.5);
    this.doc.line(startX, startY, pageWidth - this.margin, startY);

    // Título principal
    this.doc.setFontSize(24);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
    this.doc.text(options.title, startX, startY + 10);

    let currentY = startY + 18;

    // Subtítulo (se fornecido)
    if (options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(this.colors.secondary[0], this.colors.secondary[1], this.colors.secondary[2]);
      this.doc.text(options.subtitle, startX, currentY);
      currentY += 8;
    }

    // Informações de data e empresa
    this.doc.setFontSize(9);
    this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);

    if (options.date) {
      const dateStr = options.date.toLocaleDateString('pt-BR');
      const timeStr = options.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      this.doc.text(`Gerado em: ${dateStr} às ${timeStr}`, startX, currentY);
      currentY += 5;
    }

    if (options.companyName) {
      this.doc.text(`${options.companyName}`, startX, currentY);
      currentY += 5;
    }

    // Linha decorativa inferior
    this.doc.setLineWidth(0.5);
    this.doc.setDrawColor(this.colors.lightGray[0], this.colors.lightGray[1], this.colors.lightGray[2]);
    this.doc.line(startX, currentY + 2, pageWidth - this.margin, currentY + 2);

    return currentY + 8 as number;
  }

  /**
   * Adiciona uma seção com título
   */
  addSection(title: string, currentY: number): number {
    const startX = this.margin;
    const pageWidth = this.getPageWidth();
    const pageHeight = this.getPageHeight();

    // Verificar se precisa de nova página
    if (currentY > pageHeight - 30) {
      this.doc.addPage();
      this.pageNumber++;
      return this.margin;
    }

    // Fundo colorido para o título da seção
    this.doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
    (this.doc as jsPDF & { rect: (x: number, y: number, w: number, h: number, style: string) => void }).rect(startX - 2, currentY - 5, pageWidth - 2 * this.margin + 4, 8, 'F');

    // Texto do título
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, startX + 2, currentY);

    this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);

    return currentY + 10;
  }

  /**
   * Adiciona um parágrafo de texto
   */
  addParagraph(text: string, currentY: number, fontSize: number = 10, bold: boolean = false): number {
    const startX = this.margin;
    const pageWidth = this.getPageWidth();
    const pageHeight = this.getPageHeight();
    const maxWidth = pageWidth - 2 * this.margin;

    // Verificar se precisa de nova página
    if (currentY > pageHeight - 20) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    this.doc.setFontSize(fontSize);
    this.doc.setFont(undefined, bold ? 'bold' : 'normal');
    this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);

    const lines = this.doc.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = fontSize / 2.8;

    this.doc.text(lines, startX, currentY);

    return currentY + lines.length * lineHeight + 4;
  }

  /**
   * Adiciona uma tabela com styling profissional
   */
  addTable(
    headers: string[],
    rows: string[][],
    currentY: number,
    options: { columnWidths?: number[]; maxHeight?: number } = {}
  ): number {
    const pageHeight = this.getPageHeight();

    // Verificar se precisa de nova página
    if (currentY > pageHeight - 40) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    const columnWidths = options.columnWidths || this.calculateColumnWidths(headers);

    interface AutoTableOptions {
      head: string[][];
      body: string[][];
      startY: number;
      margin: { left: number; right: number };
      columnStyles: Record<number, { cellWidth: number }>;
      headStyles: {
        fillColor: [number, number, number];
        textColor: [number, number, number];
        font: string;
        fontStyle: string;
        fontSize: number;
        cellPadding: number;
        halign: string;
      };
      bodyStyles: {
        textColor: [number, number, number];
        font: string;
        fontSize: number;
        cellPadding: number;
      };
      alternateRowStyles: {
        fillColor: [number, number, number];
      };
      didDrawPage: (data: { pageNumber: number }) => void;
    }

    const autoTableOptions: AutoTableOptions = {
      head: [headers],
      body: rows,
      startY: currentY,
      margin: { left: this.margin, right: this.margin },
      columnStyles: this.getColumnStyles(columnWidths),
      headStyles: {
        fillColor: [this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]],
        textColor: [255, 255, 255],
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 4,
        halign: 'left',
      },
      bodyStyles: {
        textColor: [this.colors.text[0], this.colors.text[1], this.colors.text[2]],
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [this.colors.lightGray[0], this.colors.lightGray[1], this.colors.lightGray[2]],
      },
      didDrawPage: (data: { pageNumber: number }) => {
        // Adicionar números de página a cada página da tabela
        const pageCount = (this.doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
        if (pageCount > this.pageNumber) {
          this.pageNumber = pageCount;
        }
      },
    };

    (this.doc as jsPDF & { autoTable: (options: AutoTableOptions) => void }).autoTable(autoTableOptions);

    interface LastAutoTable {
      finalY: number;
    }
    const finalY = ((this.doc as jsPDF & { lastAutoTable: LastAutoTable }).lastAutoTable?.finalY) || currentY + 20;
    return finalY + 5;
  }

  /**
   * Adiciona um box de resumo/highlight
   */
  addHighlightBox(title: string, content: string, currentY: number): number {
    const startX = this.margin;
    const pageWidth = this.getPageWidth();
    const pageHeight = this.getPageHeight();
    const boxWidth = pageWidth - 2 * this.margin;

    // Verificar se precisa de nova página
    if (currentY > pageHeight - 30) {
      this.doc.addPage();
      this.pageNumber++;
      currentY = this.margin;
    }

    // Fundo do box
    this.doc.setFillColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2]);
    this.doc.setFillColor(
      Math.min(255, this.colors.primary[0] + 30),
      Math.min(255, this.colors.primary[1] + 30),
      Math.min(255, this.colors.primary[2] + 30)
    );

    // Calcular altura do box baseado no conteúdo
    const contentLines = this.doc.splitTextToSize(content, boxWidth - 8) as string[];
    const boxHeight = 5 + 5 + (contentLines.length * 4) + 4;

    (this.doc as jsPDF & { rect: (x: number, y: number, w: number, h: number, style: string) => void }).rect(startX, currentY, boxWidth, boxHeight, 'F');

    // Título do box
    this.doc.setFontSize(11);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
    this.doc.text(title, startX + 4, currentY + 5);

    // Conteúdo do box
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
    this.doc.text(contentLines, startX + 4, currentY + 11);

    return currentY + boxHeight + 6;
  }

  /**
   * Adiciona uma quebra de página
   */
  addPageBreak(): number {
    this.doc.addPage();
    this.pageNumber++;
    return this.margin;
  }

  /**
   * Calcula larguras de colunas baseado na quantidade de headers
   */
  private calculateColumnWidths(headers: string[]): number[] {
    const pageWidth = this.getPageWidth();
    const availableWidth = pageWidth - 2 * this.margin;
    return new Array(headers.length).fill(availableWidth / headers.length);
  }

  /**
   * Gera estilos de coluna para a tabela
   */
  private getColumnStyles(columnWidths: number[]): Record<number, any> {
    const styles: Record<number, any> = {};
    columnWidths.forEach((width, idx) => {
      styles[idx] = { cellWidth: width };
    });
    return styles;
  }

  /**
   * Finaliza e retorna o PDF como Blob
   */
  getBlob(): Blob {
    return this.doc.output('blob') as Blob;
  }

  /**
   * Salva o PDF com um nome de arquivo
   */
  save(filename: string): void {
    this.doc.save(filename);
  }

  /**
   * Retorna o objeto PDF para manipulação direta
   */
  getDocument(): jsPDF {
    return this.doc;
  }
}
