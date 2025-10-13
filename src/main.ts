import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Configurar el puerto desde variable de entorno o usar 3000 como valor por defecto
  const port = process.env.PORT || 3000;
  
  await app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${port}`);
    console.log(`📚 Documentación disponible en http://localhost:${port}/api`);
  });
}
bootstrap();
