import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Portal Web de Coordinación de Citas y Teleasistencia - API funcionando correctamente!';
  }

  getHealth(): object {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'salud-nc-44-back',
      version: '1.0.0'
    };
  }
}