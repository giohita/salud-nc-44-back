import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

@Injectable()
export class ClinicalRecordsService {
  private readonly logger = new Logger(ClinicalRecordsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createClinicalRecordDto: CreateClinicalRecordDto) {
    try {
      this.logger.log(`Intentando crear registro clínico para paciente ${createClinicalRecordDto.ID_Patients}`);
      
      return await this.prisma.clinical_data.create({
        data: {
          ...createClinicalRecordDto,
          effectiveDate: createClinicalRecordDto.effectiveDate || new Date(),
        },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear registro clínico: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException(
            'No se encontró el paciente, médico o administrador especificado',
          );
        }
      }
      
      throw new InternalServerErrorException(
        'Error al crear el registro clínico. Por favor, verifica los datos e intenta nuevamente.',
      );
    }
  }

  async findOne(id: number) {
    try {
      this.logger.log(`Buscando registro clínico con ID ${id}`);
      
      const record = await this.prisma.clinical_data.findUnique({
        where: { ID_Clinical_data: id },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });

      if (!record) {
        throw new NotFoundException(`Historia clínica con ID ${id} no encontrada`);
      }

      return record;
    } catch (error) {
      this.logger.error(`Error al buscar registro clínico: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateClinicalRecordDto: UpdateClinicalRecordDto) {
    try {
      this.logger.log(`Actualizando registro clínico con ID ${id}`);
      
      return await this.prisma.clinical_data.update({
        where: { ID_Clinical_data: id },
        data: updateClinicalRecordDto,
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al actualizar registro clínico: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`No se encontró el registro clínico con ID ${id}`);
        }
      }
      
      throw new InternalServerErrorException(
        'Error al actualizar el registro clínico. Por favor, verifica los datos e intenta nuevamente.',
      );
    }
  }

  async generateDownloadableRecord(id: number) {
    try {
      this.logger.log(`Generando archivo descargable para registro clínico con ID ${id}`);
      
      // Obtener el registro clínico con sus relaciones
      const record = await this.prisma.clinical_data.findUnique({
        where: { ID_Clinical_data: id },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });

      if (!record) {
        throw new NotFoundException(`No se encontró el registro clínico con ID ${id}`);
      }

      // Crear un buffer para almacenar el PDF
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Capturar los chunks del PDF
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Título del documento
        doc.fontSize(20).text('REGISTRO CLÍNICO', { align: 'center' });
        doc.moveDown();

        // Información del paciente
        doc.fontSize(16).text('Información del Paciente', { underline: true });
        doc.fontSize(12).text(`Nombre: ${record.patient?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID: ${record.ID_Patients}`);
        doc.moveDown();

        // Información del médico
        doc.fontSize(16).text('Información del Médico', { underline: true });
        doc.fontSize(12).text(`Nombre: ${record.medic?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID: ${record.ID_medics}`);
        doc.moveDown();

        // Detalles del registro clínico
        doc.fontSize(16).text('Detalles del Registro', { underline: true });
        doc.fontSize(12).text(`Tipo: ${record.type}`);
        doc.fontSize(12).text(`Código: ${record.code}`);
        doc.fontSize(12).text(`Valor: ${record.value}`);
        doc.fontSize(12).text(`Unidad: ${record.unit}`);
        doc.fontSize(12).text(`Severidad: ${record.severity}`);
        doc.fontSize(12).text(`Fecha: ${record.effectiveDate ? format(new Date(record.effectiveDate), 'dd/MM/yyyy HH:mm') : 'No disponible'}`);
        doc.moveDown();

        // Información de creación
        doc.fontSize(12).text(`Creado por: ${record.admin?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID de creación: ${record.create}`);
        doc.moveDown();

        // Pie de página
        doc.fontSize(10).text(`Documento generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'center' });
        doc.fontSize(10).text('Este documento es confidencial y contiene información médica protegida.', { align: 'center' });

        // Finalizar el PDF
        doc.end();
      });

      // Nombre del archivo
      const fileName = `registro_clinico_${id}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

      return { fileBuffer: pdfBuffer, fileName };
    } catch (error) {
      this.logger.error(`Error al generar archivo descargable: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Error al generar el archivo descargable. Por favor, intenta nuevamente.',
      );
    }
  }
}