import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  // Habilitar validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Habilitar CORS para múltiples orígenes
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000', 
      'http://localhost:8080',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5500',
      'null' // Para archivos abiertos directamente (file://)
    ],
    credentials: true, // si necesitas enviar cookies o autenticación
  });

  // Configurar el puerto desde variable de entorno o usar 3000 como valor por defecto
  const port = process.env.PORT || 3000;
  
  await app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${port}`);
    console.log(`📚 Documentación disponible en http://localhost:${port}/api`);
  });
}
bootstrap();
