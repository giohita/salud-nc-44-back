import { Module } from '@nestjs/common';
import { MedicsController } from './medics.controller';
import { MedicsService } from './medics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicsController],
  providers: [MedicsService],
  exports: [MedicsService]
})
export class MedicsModule {}