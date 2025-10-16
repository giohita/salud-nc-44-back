import { Module } from '@nestjs/common';
import { AppointmentsController } from './Appointments.controller';
import { AppointmentsService } from './Appointments.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService],
})
export class AppointmentsModule {}
