import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  TestUserFactory, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Module (E2E)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.initialize();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await TestCleanupUtils.cleanupAll(prisma);
  });

  describe('POST /auth/login', () => {
    it('debería autenticar un administrador correctamente', async () => {
      // Arrange
      const adminData = TestUserFactory.createAdmin();
      await AuthTestUtils.createUserInDatabase(prisma, adminData);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: adminData.dni,
          password: adminData.password
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.dni).toBe(adminData.dni);
      expect(response.body.user.userType).toBe('ADMIN');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('debería autenticar un médico correctamente', async () => {
      // Arrange
      const medicData = TestUserFactory.createMedic();
      await AuthTestUtils.createUserInDatabase(prisma, medicData);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: medicData.dni,
          password: medicData.password
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user.userType).toBe('MEDIC');
      expect(response.body.user.specialty).toBe(medicData.specialty);
    });

    it('debería autenticar un paciente correctamente', async () => {
      // Arrange
      const patientData = TestUserFactory.createPatient();
      await AuthTestUtils.createUserInDatabase(prisma, patientData);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: patientData.dni,
          password: patientData.password
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.userType).toBe('PATIENT');
    });

    it('debería rechazar credenciales inválidas', async () => {
      // Arrange
      const adminData = TestUserFactory.createAdmin();
      await AuthTestUtils.createUserInDatabase(prisma, adminData);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: adminData.dni,
          password: 'contraseña_incorrecta'
        });

      // Assert
      TestValidationUtils.expectUnauthorized(response);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('debería rechazar DNI inexistente', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: '99999999',
          password: 'cualquier_password'
        });

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería validar campos requeridos', async () => {
      // Act - Sin DNI
      const responseWithoutDni = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'password123'
        });

      // Assert
      TestValidationUtils.expectValidationError(responseWithoutDni, 'dni');

      // Act - Sin password
      const responseWithoutPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: '12345678'
        });

      // Assert
      TestValidationUtils.expectValidationError(responseWithoutPassword, 'password');
    });

    it('debería validar formato de DNI', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: '123', // DNI muy corto
          password: 'password123'
        });

      // Assert
      TestValidationUtils.expectValidationError(response, 'dni');
    });
  });

  describe('POST /auth/refresh', () => {
    it('debería renovar token con refresh token válido', async () => {
      // Arrange
      const adminData = TestUserFactory.createAdmin();
      await AuthTestUtils.createUserInDatabase(prisma, adminData);
      
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: adminData.dni,
          password: adminData.password
        });

      const refreshToken = loginResponse.body.refresh_token;

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).not.toBe(loginResponse.body.access_token);
    });

    it('debería rechazar refresh token inválido', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'token_invalido'
        });

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería rechazar refresh token expirado', async () => {
      // Arrange - Crear un refresh token y luego "expirarlo" eliminándolo de la DB
      const adminData = TestUserFactory.createAdmin();
      await AuthTestUtils.createUserInDatabase(prisma, adminData);
      
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: adminData.dni,
          password: adminData.password
        });

      const refreshToken = loginResponse.body.refresh_token;
      
      // Eliminar el refresh token de la base de datos para simular expiración
      await prisma.refresh_tokens.deleteMany({
        where: { token: refreshToken }
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken
        });

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });
  });

  describe('POST /auth/logout', () => {
    it('debería cerrar sesión correctamente', async () => {
      // Arrange
      const { token } = await AuthTestUtils.createAndLoginAdmin(app, prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('Sesión cerrada exitosamente');
    });

    it('debería rechazar logout sin token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout');

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería rechazar token inválido en logout', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer token_invalido');

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });
  });

  describe('Seguridad y Validaciones', () => {
    it('debería proteger endpoints que requieren autenticación', async () => {
      // Act - Intentar acceder a endpoint protegido sin token
      const response = await request(app.getHttpServer())
        .get('/admin/users');

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería validar formato de JWT en headers', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', 'InvalidFormat');

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería manejar múltiples intentos de login fallidos', async () => {
      // Arrange
      const adminData = TestUserFactory.createAdmin();
      await AuthTestUtils.createUserInDatabase(prisma, adminData);

      // Act - Múltiples intentos fallidos
      const attempts = [];
      for (let i = 0; i < 3; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              dni: adminData.dni,
              password: 'password_incorrecto'
            })
        );
      }

      const responses = await Promise.all(attempts);

      // Assert - Todos deberían fallar
      responses.forEach(response => {
        TestValidationUtils.expectUnauthorized(response);
      });
    });

    it('debería limpiar refresh tokens al hacer logout', async () => {
      // Arrange
      const adminData = TestUserFactory.createAdmin();
      const { user } = await AuthTestUtils.createUserInDatabase(prisma, adminData);
      
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: adminData.dni,
          password: adminData.password
        });

      const token = loginResponse.body.access_token;
      const refreshToken = loginResponse.body.refresh_token;

      // Verificar que el refresh token existe
      const tokenExists = await prisma.refresh_tokens.findFirst({
        where: { token: refreshToken }
      });
      expect(tokenExists).toBeTruthy();

      // Act - Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Assert - El refresh token debería haber sido eliminado
      const tokenAfterLogout = await prisma.refresh_tokens.findFirst({
        where: { token: refreshToken }
      });
      expect(tokenAfterLogout).toBeNull();
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    it('debería manejar caracteres especiales en credenciales', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: '12345678',
          password: 'password<script>alert("xss")</script>'
        });

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });

    it('debería manejar payloads muy grandes', async () => {
      // Arrange
      const largeString = 'a'.repeat(10000);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          dni: largeString,
          password: largeString
        });

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('debería manejar JSON malformado', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send('{"dni": "12345678", "password":}'); // JSON inválido

      // Assert
      expect(response.status).toBe(400);
    });
  });
});