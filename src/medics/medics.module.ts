import { Module } from '@nestjs/common';
import { MedicsController } from './medics.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MedicsController],
  providers: [PrismaService],
})
export class MedicsModule {}
