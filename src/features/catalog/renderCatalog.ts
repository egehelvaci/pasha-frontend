import { jsPDF } from 'jspdf';
import { planCatalogPages, type CatalogProduct, type CatalogOptions, type CatalogProgress } from './model';

export interface CatalogImage { bytes: Uint8Array; width: number; height: number }
export interface RenderDependencies {
  font: string;
  getImage: (url: string) => Promise<CatalogImage | null>;
  progress: (progress: CatalogProgress) => void;
}

/** Pure PDF layout shared by the worker and regression fixtures; no DOM/print timers. */
export async function renderCatalog(products: CatalogProduct[], options: CatalogOptions, dependencies: RenderDependencies) {
  if (!products.length) throw new Error('En az bir ürün seçin.');
  const pages = planCatalogPages(products, options);
  const totalPages = pages.length + Number(options.cover);
  const total = pages.reduce((sum, page) => sum + page.products.length, 0);
  const warnings: string[] = [];
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS('Catalog.ttf', dependencies.font);
  pdf.addFont('Catalog.ttf', 'Catalog', 'normal');
  pdf.setFont('Catalog');
  pdf.setProperties({ title: options.title, author: 'Paşa Home', creator: 'Paşa Home E-Katalog' });
  let completed = 0;
  dependencies.progress({ phase: 'layout', completed: 0, total, pages: totalPages });

  const text = (value: string, x: number, y: number, width: number, size: number, maxLines: number, color = '#183342') => {
    pdf.setFontSize(size).setTextColor(color);
    const lines: string[] = pdf.splitTextToSize(value.replace(/\s+/g, ' ').trim(), width);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last && pdf.getTextWidth(`${last}…`) > width) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last}…`;
    }
    pdf.text(lines, x, y, { lineHeightFactor: 1.35 });
  };
  const footer = (number: number) => {
    pdf.setDrawColor('#deddd5').line(14, 282, 196, 282);
    text('PAŞA HOME  /  E-KATALOG', 14, 288, 140, 8, 1, '#65747c');
    text(`${number} / ${totalPages}`, 175, 288, 21, 8, 1, '#65747c');
  };
  if (options.cover) {
    pdf.setFillColor('#12384b').rect(0, 0, 210, 297, 'F');
    pdf.setDrawColor('#416170');
    for (let i = 0; i < 12; i++) pdf.roundedRect(95 + i * 3, -35 + i * 5, 130, 220, 45, 45, 'S');
    text('PAŞA HOME', 20, 29, 170, 18, 1, '#ffffff');
    text('ÜRÜN KATALOĞU', 20, 169, 170, 10, 1, '#cfbb9e');
    text(options.title || 'Paşa Home E-Katalog', 20, 191, 166, 30, 3, '#ffffff');
    text(`${total} ürün  /  ${new Set(products.map(p => p.collectionId || p.collectionName)).size} koleksiyon`, 20, 253, 170, 11, 1, '#cfbb9e');
    text(new Date().toLocaleDateString('tr-TR'), 20, 274, 170, 10, 1, '#ffffff');
  }
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (options.cover || pageIndex > 0) pdf.addPage();
    const page = pages[pageIndex];
    pdf.setFillColor('#faf9f6').rect(0, 0, 210, 297, 'F');
    text('PAŞA HOME', 14, 17, 130, 10, 1);
    text(page.collection, 14, 30, 180, 18, 2);
    pdf.setDrawColor('#deddd5').line(14, 44, 196, 44);
    const rows = options.layout === 'compact' ? 3 : 2;
    const cellWidth = 87;
    const cellHeight = rows === 3 ? 72 : 108;
    // Only one page's decoded images is resident; network concurrency is bounded by worker loader.
    const images = await Promise.all(page.products.map(async product => {
      const image = product.image ? await dependencies.getImage(product.image) : null;
      if (!image) warnings.push(product.id);
      completed++;
      dependencies.progress({ phase: 'assets', completed, total, pages: totalPages });
      return image;
    }));
    page.products.forEach((product, index) => {
      const x = 14 + (index % 2) * 95;
      const y = 51 + Math.floor(index / 2) * (cellHeight + 4);
      const imageHeight = cellHeight - (options.descriptions ? 25 : 16);
      pdf.setFillColor('#f0eee8').roundedRect(x, y, cellWidth, imageHeight, 2, 2, 'F');
      const image = images[index];
      if (image) {
        const scale = Math.min((cellWidth - 4) / image.width, (imageHeight - 4) / image.height);
        const w = image.width * scale, h = image.height * scale;
        pdf.addImage(image.bytes, 'JPEG', x + (cellWidth - w) / 2, y + (imageHeight - h) / 2, w, h, product.image, 'FAST');
      } else text('Görsel bulunamadı', x + 14, y + imageHeight / 2, 65, 9, 1, '#65747c');
      text(product.name, x, y + imageHeight + 5, cellWidth, 9.5, 2);
      if (options.descriptions && product.description) text(product.description, x, y + imageHeight + 16, cellWidth, 7.5, 2, '#65747c');
    });
    footer(pageIndex + 1 + Number(options.cover));
  }
  dependencies.progress({ phase: 'finalizing', completed: total, total, pages: totalPages });
  return { buffer: pdf.output('arraybuffer'), pages: totalPages, warnings };
}
