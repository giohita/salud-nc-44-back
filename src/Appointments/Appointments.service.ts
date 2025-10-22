import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateAppointmentDto) {
    return this.prisma.appointments.create({ data });
  }

  findAll() {
    return this.prisma.appointments.findMany({
      include: { patient: true, medic: true },
    });
  }

  findOne(id: number) {
    return this.prisma.appointments.findUnique({
      where: { ID_Appointments: id },
      include: { patient: true, medic: true },
    });
  }

  update(id: number, data: UpdateAppointmentDto) {
    return this.prisma.appointments.update({
      where: { ID_Appointments: id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.appointments.delete({
      where: { ID_Appointments: id },
    });
  }
}
