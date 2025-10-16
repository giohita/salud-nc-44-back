import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HomeController } from './prisma/prisma.controller';
import { AppointmentsModule  } from './Appointments/Appointments.module';

@Module({
  imports: [PrismaModule, AppointmentsModule],
  controllers: [HomeController],
  providers: [],
})
export class AppModule {}
