import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';

@Module({
  imports: [PrismaModule, ClinicalRecordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
