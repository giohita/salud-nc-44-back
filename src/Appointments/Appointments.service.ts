import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { tr } from 'date-fns/locale';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private prisma: PrismaService) {}


  // Crear cita
  async create(CreateAppointmentDto: CreateAppointmentDto) {
    try {
      this.logger.log(`Intentando crear cita para paciente ${CreateAppointmentDto.ID_Patients} con el doctor ${CreateAppointmentDto.ID_medics}`);
      const status = CreateAppointmentDto.status ?? AppointmentStatus.CONFIRMED;
      return await this.prisma.appointments.create({
        data: {
          ...CreateAppointmentDto,
          status,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear la cita clinica: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError){
        if (error.code === 'P2003'){
          throw new NotFoundException(
            `No se encontro el paciente o el medico especificado`,
          );
        }
      }
      throw new InternalServerErrorException(
        `Error al crear la cita medica, por favor verifica los datos e intente nuevamente`
      );
    }
  }


  // Buscar cita
  findAll() {
    return this.prisma.appointments.findMany({
      select: {
        status:true,
        notes: true,
        appointmentDatetime: true,
        appointmentType: true,

        patient:{
          select: {
            Name: true,
            Lastname: true,
            Birthdate: true,
            DNI: true
          },
        },
        medic: {
          select: {
            Name: true,
            Lastname: true,
            specialty: true,
          }
        }
      }
    });
  }


  // Buscar por Id
  async findOne(id: number) {
    try{
      this.logger.log(`Buscando cita medica con Id ${id}`);
    const appointment = await this.prisma.appointments.findUnique({
      where: { ID_Appointments: id },
      include: { patient: true, medic: true },
    });
    if (!appointment) {
      throw new NotFoundException(`Historia clínica con ID ${id} no encontrada`);
    }
    return appointment;
    } catch (error) {
      this.logger.error(`Error al buscar la cita medica: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Actualizar datos de cita
  update(id: number, data: UpdateAppointmentDto) {
    return this.prisma.appointments.update({
      where: { ID_Appointments: id },
      data,
    });
  }


  // Remover o eliminar
  remove(id: number) {
    return this.prisma.appointments.delete({
      where: { ID_Appointments: id },
    });
  }
}


