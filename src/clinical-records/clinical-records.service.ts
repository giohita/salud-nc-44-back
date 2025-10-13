import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { Prisma } from '@prisma/client';

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
          throw new NotFoundException(`Historia clínica con ID ${id} no encontrada`);
        }
      }
      
      throw new InternalServerErrorException(
        'Error al actualizar el registro clínico. Por favor, verifica los datos e intenta nuevamente.',
      );
    }
  }
}