import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, ClinicalRecordsModule, AuthModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
