import PDFDocument from 'pdfkit';
import path from 'path';
import { Buffer } from 'buffer';

interface Order {
  id: string;
  customer_name: string;
  total: number;
  address?: string;
  items?: { description: string; quantity: number; price: number }[];
}

export const generateInvoicePDF = (order: Order) => {
  const fontPath = path.join(process.cwd(), 'lib', 'fonts', 'Helvetica.ttf');
  const logoPath = path.join(process.cwd(), 'public', 'images', 'SkoollyLogo.png'); // tuo logo

  const doc = new PDFDocument({ margin: 50, font: fontPath });
  const buffers: Buffer[] = [];

  doc.on('data', (data: Buffer) => buffers.push(data));

  // **Registra e usa il font Helvetica TTF**
  doc.registerFont('Helvetica', fontPath);
  doc.registerFont('Helvetica-Bold', fontPath); // puoi usare lo stesso per bold se non hai versione bold separata
  doc.font('Helvetica');

  // Logo
  doc.image(logoPath, 50, 45, { width: 100 });

  // Intestazione azienda
  doc
    .fontSize(20)
    .text('La Tua Azienda S.r.l.', 200, 50)
    .fontSize(10)
    .text('Via Esempio 123, 00100 Roma', { align: 'right' })
    .text('Email: info@tuaazienda.com', { align: 'right' })
    .text('Telefono: +39 012 3456789', { align: 'right' })
    .moveDown();

  // Titolo fattura
  doc
    .moveDown(2)
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(`Fattura Ordine #${order.id}`, { align: 'center', underline: true })
    .moveDown();

  // Dati cliente
  doc.font('Helvetica').fontSize(12).text(`Cliente: ${order.customer_name}`);
  if (order.address) doc.text(`Indirizzo: ${order.address}`);
  doc.text(`Data: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // Tabella dettagli ordine
  if (order.items && order.items.length > 0) {
    doc.font('Helvetica-Bold').text('Dettagli ordine:', { underline: true });
    doc.moveDown(0.5);

    // Header tabella
    doc.font('Helvetica-Bold');
    doc.text('Descrizione', 50, doc.y, { continued: true });
    doc.text('Quantità', 300, doc.y, { continued: true });
    doc.text('Prezzo', 400, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica');

    order.items.forEach((item) => {
      doc.text(item.description, 50, doc.y, { continued: true });
      doc.text(item.quantity.toString(), 300, doc.y, { continued: true });
      doc.text(`€${item.price.toFixed(2)}`, 400, doc.y, { align: 'right' });
      doc.moveDown(0.2);
    });

    doc.moveDown();
  }

  // Totale
  doc.font('Helvetica-Bold').fontSize(14).text(`Totale: €${order.total.toFixed(2)}`, { align: 'right', underline: true });

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
};
