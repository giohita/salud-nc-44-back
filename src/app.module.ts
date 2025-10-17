import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, ClinicalRecordsModule, AuthModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
