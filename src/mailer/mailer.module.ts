import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { MailerService } from './mailer.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'gmail',
        auth: {
          user: 'clinicasaludprueba@gmail.com',
          pass: 'TU_CONTRASEÑA_O_TOKEN',
        },
      },
      defaults: {
        from: '"Clínica Salud" <clinicasaludprueba@gmail.com>',
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new (require('handlebars'))(),
        options: { strict: true },
      },
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class CustomMailerModule {}