import { Module } from '@nestjs/common';
import { AgendaConfigController } from './agenda-config.controller';
import { AgendaConfigService } from './agenda-config.service';

@Module({
  controllers: [AgendaConfigController],
  providers: [AgendaConfigService],
  exports: [AgendaConfigService], // Exportamos el servicio para uso en otros módulos
})
export class AgendaConfigModule {}