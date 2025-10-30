import { Injectable } from '@nestjs/common';
import { PrismaClient, Clinical_data } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const prisma = new PrismaClient();

@Injectable()
export class ClinicalRecordsService {
  async generatePatientPdf(patientId: number): Promise<Buffer> {
    console.log("📄 Generando PDF para pacienteId:", patientId);

   
    const patient = await prisma.patients.findUnique({
      where: { ID_Patients: patientId },
    });
    const patientName = patient ? `${patient.Name} ${patient.Lastname}` : `ID: ${patientId}`;
    console.log("Paciente:", patientName);

    const records = await prisma.clinical_data.findMany({
      where: { ID_Patients: patientId },
      include: { medic: true },
    });

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    let { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const headerHeight = 60;
    const contentOffset = 120;

    
    const drawHeader = () => {
      page.drawRectangle({
        x: 0,
        y: height - headerHeight,
        width,
        height: headerHeight,
        color: rgb(55 / 255, 65 / 255, 81 / 255), 
      });

      page.drawText(`Historial Clínico del Paciente ${patientName}`, {
        x: 50,
        y: height - 45,
        size: 20,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(``, {
        x: 50,
        y: height - 65,
        size: 14,
        font,
        color: rgb(0.9, 0.9, 0.9),
      });
    };

    drawHeader();

    
    let yPos = height - headerHeight - contentOffset; // 🔹 aplicamos offset
    const lineHeight = 20;

    for (const record of records) {
      // Título del registro
      page.drawText(`${record.type}`, {
        x: 50,
        y: yPos,
        size: 13,
        font: fontBold,
        color: rgb(26 / 255, 188 / 255, 156 / 255), // verde profesional
      });
      yPos -= lineHeight;

      // Detalles del registro
      page.drawText(
        `Valor: ${record.value} ${record.unit} | Severidad: ${record.severity} | Médico: ${record.medic.Name}`,
        {
          x: 50,
          y: yPos,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        },
      );
      yPos -= lineHeight + 5;

      // Salto de página si se llena
      if (yPos < 50) {
        page = pdfDoc.addPage([600, 800]);
        ({ width, height } = page.getSize());
        yPos = height - headerHeight - contentOffset;
        drawHeader();
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  findOne(id: number) {
    return prisma.clinical_data.findUnique({ where: { ID_Clinical_data: id } });
  }

  create(dto: any) {
    return prisma.clinical_data.create({ data: dto });
  }

  update(id: number, dto: any) {
    return prisma.clinical_data.update({ where: { ID_Clinical_data: id }, data: dto });
  }

  transfer(id: number, dto: any) {
    return prisma.clinical_data.update({
      where: { ID_Clinical_data: id },
      data: { ...dto, transferred: true },
    });
  }
}
