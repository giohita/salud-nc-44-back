import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReminderService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendDailyReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    const appointments = await this.prisma.appointments.findMany({
      where: {
        appointmentDatetime: { gte: start, lte: end },
        reminderSent: false,
      },
      include: { patient: true },
    });

    for (const appointment of appointments) {
      await this.mailerService.sendReminderEmail(appointment.patient.email, {
        name: appointment.patient.Name,
        date: appointment.appointmentDatetime.toLocaleString(),
        type: appointment.appointmentType,
      });

      await this.prisma.appointments.update({
        where: { ID_Appointments: appointment.ID_Appointments },
        data: { reminderSent: true },
      });
    }

    console.log(`✅ Recordatorios enviados para ${appointments.length} citas.`);
  }
}