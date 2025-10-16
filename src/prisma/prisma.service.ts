import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import e from 'express';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
    private readonly logger = new Logger('Api-Project');

    async onModuleInit() {
        try {
       await this.$connect();
       this.logger.log('Database conectada');
        } catch (error) {
            this.logger.error('Fallo la conexion a la base de datos', e);
            throw Error
        }
    }

   async onModuleDestroy() {
       await this.$disconnect();
       this.logger.log('Database desconectada')
   } 
}
