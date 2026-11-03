import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// ADR-005: libreria de PDF embebida en el propio servidor (no un servicio
// SaaS externo, descartado por RT-01/RN-02). Genera el buffer en memoria;
// quien llama decide donde guardarlo.
@Injectable()
export class GeneradorPdfService {
  generar(datos: { estudianteId: string; totalHoras: number; fecha: Date }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Acta de Finalizacion de Practica Empresarial', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Estudiante: ${datos.estudianteId}`);
      doc.text(`Horas totales validadas: ${datos.totalHoras}`);
      doc.text(`Fecha de generacion: ${datos.fecha.toISOString()}`);
      doc.end();
    });
  }
}
