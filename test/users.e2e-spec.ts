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

describe('Users Module (E2E)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

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
    // Crear admin para las pruebas que requieren autenticación
    const { token } = await AuthTestUtils.createAndLoginAdmin(app, prisma);
    adminToken = token;
  });

  describe('POST /admin/users', () => {
    describe('Crear Administrador', () => {
      it('debería crear un administrador correctamente', async () => {
        // Arrange
        const adminData = TestUserFactory.createAdmin({
          dni: '11111111',
          email: 'nuevo.admin@test.com'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(adminData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.message).toContain('Usuario creado exitosamente');
        expect(response.body.user).toBeDefined();
        expect(response.body.user.dni).toBe(adminData.dni);
        expect(response.body.user.userType).toBe('ADMIN');
        expect(response.body.user.email).toBe(adminData.email);
        expect(response.body.user).not.toHaveProperty('passwordHash');

        // Verificar en base de datos
        const userInDb = await prisma.users.findUnique({
          where: { DNI: adminData.dni }
        });
        expect(userInDb).toBeTruthy();
        expect(userInDb.userType).toBe('ADMIN');

        const adminInDb = await prisma.admins.findUnique({
          where: { DNI: adminData.dni }
        });
        expect(adminInDb).toBeTruthy();
        expect(adminInDb.Email).toBe(adminData.email);
      });

      it('debería validar campos requeridos para administrador', async () => {
        // Act - Sin DNI
        const responseWithoutDni = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userType: 'ADMIN',
            Name: 'Test',
            Lastname: 'Admin',
            Email: 'test@test.com',
            password: 'password123'
          });

        // Assert
        TestValidationUtils.expectValidationError(responseWithoutDni, 'DNI');
      });

      it('debería rechazar DNI duplicado', async () => {
        // Arrange
        const adminData = TestUserFactory.createAdmin();
        await AuthTestUtils.createUserInDatabase(prisma, adminData);

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(adminData);

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toContain('DNI ya existe');
      });
    });

    describe('Crear Médico', () => {
      it('debería crear un médico correctamente', async () => {
        // Arrange
        const medicData = TestUserFactory.createMedic({
          dni: '22222222',
          email: 'nuevo.medico@test.com'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(medicData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.user.userType).toBe('MEDIC');
        expect(response.body.user.specialty).toBe(medicData.specialty);

        // Verificar en base de datos
        const medicInDb = await prisma.medics.findUnique({
          where: { DNI: medicData.dni }
        });
        expect(medicInDb).toBeTruthy();
        expect(medicInDb.specialty).toBe(medicData.specialty);
        expect(medicInDb.schedule).toBe(medicData.schedule);
      });

      it('debería validar especialidad para médicos', async () => {
        // Arrange
        const medicData = TestUserFactory.createMedic();
        delete medicData.specialty;

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(medicData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'specialty');
      });

      it('debería validar formato de fecha de nacimiento', async () => {
        // Arrange
        const medicData = TestUserFactory.createMedic({
          birthdate: 'fecha-invalida'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(medicData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'birthdate');
      });
    });

    describe('Crear Paciente', () => {
      it('debería crear un paciente correctamente', async () => {
        // Arrange
        const patientData = TestUserFactory.createPatient({
          dni: '33333333',
          email: 'nuevo.paciente@test.com'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(patientData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.user.userType).toBe('PATIENT');

        // Verificar en base de datos
        const patientInDb = await prisma.patients.findUnique({
          where: { DNI: patientData.dni }
        });
        expect(patientInDb).toBeTruthy();
        expect(patientInDb.email).toBe(patientData.email);
      });

      it('debería manejar paciente sin fecha de nacimiento', async () => {
        // Arrange
        const patientData = TestUserFactory.createPatient();
        delete patientData.birthdate;

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(patientData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
      });
    });

    describe('Validaciones Generales', () => {
      it('debería validar formato de email', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          email: 'email-invalido'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'email');
      });

      it('debería validar longitud mínima de contraseña', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          password: '123'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'password');
      });

      it('debería validar tipo de usuario válido', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin();
        userData.userType = 'INVALID_TYPE' as any;

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'userType');
      });

      it('debería validar género válido', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          gender: 'INVALID_GENDER' as any
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'gender');
      });

      it('debería validar formato de número de teléfono', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          phone_number: '123'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'phone_number');
      });
    });

    describe('Seguridad y Autorización', () => {
      it('debería rechazar creación sin autenticación', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin();

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .send(userData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });

      it('debería rechazar token inválido', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin();

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', 'Bearer token_invalido')
          .send(userData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });

      it('debería rechazar acceso de médico a creación de usuarios', async () => {
        // Arrange
        const { token: medicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma);
        const userData = TestUserFactory.createPatient();

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(userData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });

      it('debería rechazar acceso de paciente a creación de usuarios', async () => {
        // Arrange
        const { token: patientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma);
        const userData = TestUserFactory.createAdmin();

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(userData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });
    });

    describe('Casos Edge y Manejo de Errores', () => {
      it('debería manejar caracteres especiales en nombres', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          name: 'José María',
          lastname: 'González-Pérez'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.user.name).toBe(userData.name);
        expect(response.body.user.lastname).toBe(userData.lastname);
      });

      it('debería manejar emails con dominios internacionales', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          email: 'usuario@dominio.co.uk'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
      });

      it('debería rechazar DNI con caracteres no numéricos', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin({
          dni: '1234567A'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'DNI');
      });

      it('debería manejar payload con campos adicionales', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin();
        const payloadWithExtraFields = {
          ...userData,
          extraField: 'valor_extra',
          anotherField: 123
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payloadWithExtraFields);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.user).not.toHaveProperty('extraField');
        expect(response.body.user).not.toHaveProperty('anotherField');
      });

      it('debería manejar email duplicado', async () => {
        // Arrange
        const firstUser = TestUserFactory.createAdmin();
        await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(firstUser);

        const secondUser = TestUserFactory.createAdmin({
          dni: '99999999',
          email: firstUser.email // Mismo email
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(secondUser);

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toContain('Email ya existe');
      });

      it('debería encriptar la contraseña correctamente', async () => {
        // Arrange
        const userData = TestUserFactory.createAdmin();

        // Act
        const response = await request(app.getHttpServer())
          .post('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);

        // Verificar que la contraseña está encriptada en la DB
        const userInDb = await prisma.users.findUnique({
          where: { DNI: userData.dni }
        });
        expect(userInDb.passwordHash).toBeDefined();
        expect(userInDb.passwordHash).not.toBe(userData.password);
        expect(userInDb.passwordHash.length).toBeGreaterThan(50); // Hash bcrypt típico
      });
    });

    describe('Rendimiento y Límites', () => {
      it('debería manejar creación de múltiples usuarios', async () => {
        // Arrange
        const users = [];
        for (let i = 0; i < 5; i++) {
          users.push(TestUserFactory.createAdmin({
            dni: `1000000${i}`,
            email: `user${i}@test.com`
          }));
        }

        // Act
        const promises = users.map(user =>
          request(app.getHttpServer())
            .post('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(user)
        );

        const responses = await Promise.all(promises);

        // Assert
        responses.forEach(response => {
          TestValidationUtils.expectSuccess(response, 201);
        });

        // Verificar que todos los usuarios fueron creados
        const usersInDb = await prisma.users.findMany();
        expect(usersInDb.length).toBeGreaterThanOrEqual(6); // 5 + admin de prueba
      });
    });
  });
});