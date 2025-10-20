import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto) {
    const conflict = await this.prisma.appointments.findFirst({
      where: {
        ID_medics: dto.ID_medics,
        appointmentDatetime: new Date(dto.appointmentDatetime),
      },
    });

    if (conflict) {
      throw new ConflictException('El médico ya tiene una cita en ese horario');
    }

    return this.prisma.appointments.create({
      data: {
        ...dto,
        status: 'PENDING',
        reminderSent: false,
      },
    });
  }
}
