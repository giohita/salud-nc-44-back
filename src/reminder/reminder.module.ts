import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { CustomMailerModule } from '../mailer/mailer.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [CustomMailerModule],
  providers: [ReminderService, PrismaService],
  controllers: [ReminderController],
})
export class ReminderModule {}