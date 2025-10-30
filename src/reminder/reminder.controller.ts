import { Controller, Post } from "@nestjs/common";
import { ReminderService } from "./reminder.service";

@Controller('reminders')
export class ReminderController {
    constructor(private readonly reminderService: ReminderService) {}

    @Post('send-tomorrow')
    async sendRemindersForTomorrow() {
        await this.reminderService.sendReminders();
        return { message: 'Recordatorios enviados para las citas de mañana'}
    }
}