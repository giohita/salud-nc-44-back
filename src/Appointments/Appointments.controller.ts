import { Controller, Post, Body } from '@nestjs/common';
import { AppointmentsService } from './Appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  async create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }
}
