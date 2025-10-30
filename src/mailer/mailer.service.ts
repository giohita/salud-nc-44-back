import { Injectable } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly mailer: NestMailerService) {}

  async sendReminderEmail(to: string, context: { name: string; date: string; type: string }) {
    await this.mailer.sendMail({
      to,
      subject: 'Recordatorio de cita médica',
      template: 'reminder',
      context,
    });
  }
}
