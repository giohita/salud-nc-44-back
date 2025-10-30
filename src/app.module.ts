import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './Appointments/Appointments.module';
import { AgendaConfigModule } from './agenda-config/agenda-config.module';
import { TeleconsultationModule } from './teleconsultation/teleconsultation.module';
import { ReminderModule } from './reminder/reminder.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ClinicalRecordsModule,
    AuthModule,
    UsersModule,
    AdminModule,
    AppointmentsModule,
    AgendaConfigModule,
    TeleconsultationModule,
    ReminderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}