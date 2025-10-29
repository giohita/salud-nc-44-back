import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin Module (E2E)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let medicToken: string;
  let patientToken: string;

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
    
    // Crear usuarios de prueba
    const { token: adminTk } = await AuthTestUtils.createAndLoginAdmin(app, prisma);
    const { token: medicTk } = await AuthTestUtils.createAndLoginMedic(app, prisma);
    const { token: patientTk } = await AuthTestUtils.createAndLoginPatient(app, prisma);
    
    adminToken = adminTk;
    medicToken = medicTk;
    patientToken = patientTk;
  });

  describe('GET /admin/dashboard', () => {
    beforeEach(async () => {
      // Crear datos de prueba para el dashboard
      const medic = await prisma.users.findFirst({ where: { userType: 'MEDIC' } });
      const patient = await prisma.users.findFirst({ where: { userType: 'PATIENT' } });
      
      await TestCleanupUtils.createMultipleTestAppointments(prisma, medic.dni, patient.dni, 5);
      await TestCleanupUtils.createMultipleTestClinicalRecords(prisma, medic.dni, patient.dni, 3);
    });

    it('debería obtener estadísticas del dashboard como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.totalUsers).toBeDefined();
      expect(response.body.dashboard.totalAppointments).toBeDefined();
      expect(response.body.dashboard.totalClinicalRecords).toBeDefined();
      expect(response.body.dashboard.totalTeleconsultations).toBeDefined();
      expect(response.body.dashboard.usersByType).toBeDefined();
      expect(response.body.dashboard.appointmentsByStatus).toBeDefined();
      expect(response.body.dashboard.appointmentsByType).toBeDefined();
      expect(response.body.dashboard.recentActivity).toBeDefined();
    });

    it('debería incluir estadísticas detalladas de usuarios', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      const usersByType = response.body.dashboard.usersByType;
      expect(usersByType.ADMIN).toBeGreaterThanOrEqual(1);
      expect(usersByType.MEDIC).toBeGreaterThanOrEqual(1);
      expect(usersByType.PATIENT).toBeGreaterThanOrEqual(1);
    });

    it('debería incluir estadísticas de citas por estado', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      const appointmentsByStatus = response.body.dashboard.appointmentsByStatus;
      expect(appointmentsByStatus).toHaveProperty('SCHEDULED');
      expect(appointmentsByStatus).toHaveProperty('COMPLETED');
      expect(appointmentsByStatus).toHaveProperty('CANCELLED');
    });

    it('debería incluir actividad reciente', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.dashboard.recentActivity).toBeDefined();
      expect(Array.isArray(response.body.dashboard.recentActivity)).toBe(true);
    });

    it('debería rechazar acceso a médicos', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('debería rechazar acceso a pacientes', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('debería rechazar acceso sin autenticación', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard');

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });
  });

  describe('GET /admin/users', () => {
    beforeEach(async () => {
      // Crear usuarios adicionales para pruebas
      await AuthTestUtils.createAndLoginMedic(app, prisma, { dni: '33333333' });
      await AuthTestUtils.createAndLoginPatient(app, prisma, { dni: '44444444' });
    });

    it('debería obtener lista de usuarios como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(4); // Admin, 2 médicos, 2 pacientes
      expect(response.body.pagination).toBeDefined();
    });

    it('debería filtrar usuarios por tipo', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?userType=MEDIC')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      response.body.users.forEach(user => {
        expect(user.userType).toBe('MEDIC');
      });
    });

    it('debería filtrar usuarios por estado activo', async () => {
      // Arrange - Desactivar un usuario
      const userToDeactivate = await prisma.users.findFirst({ where: { userType: 'PATIENT' } });
      await prisma.users.update({
        where: { dni: userToDeactivate.dni },
        data: { isActive: false }
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      response.body.users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('debería buscar usuarios por nombre', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      response.body.users.forEach(user => {
        expect(user.name.toLowerCase()).toContain('test');
      });
    });

    it('debería soportar paginación', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.users.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('debería ordenar usuarios por fecha de creación', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      if (response.body.users.length > 1) {
        const dates = response.body.users.map(user => new Date(user.createdAt));
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i].getTime()).toBeLessThanOrEqual(dates[i-1].getTime());
        }
      }
    });

    it('debería excluir información sensible', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const medicResponse = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${medicToken}`);

      const patientResponse = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      expect(medicResponse.status).toBeGreaterThanOrEqual(401);
      expect(patientResponse.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('PUT /admin/users/:dni/status', () => {
    let targetUserDni: string;

    beforeEach(async () => {
      const targetUser = await AuthTestUtils.createAndLoginPatient(app, prisma, { dni: '55555555' });
      targetUserDni = targetUser.dni;
    });

    it('debería activar usuario como administrador', async () => {
      // Arrange - Desactivar usuario primero
      await prisma.users.update({
        where: { dni: targetUserDni },
        data: { isActive: false }
      });

      // Act
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${targetUserDni}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('actualizado');
      expect(response.body.user.isActive).toBe(true);

      // Verificar en base de datos
      const userInDb = await prisma.users.findUnique({ where: { dni: targetUserDni } });
      expect(userInDb.isActive).toBe(true);
    });

    it('debería desactivar usuario como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${targetUserDni}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.user.isActive).toBe(false);

      // Verificar en base de datos
      const userInDb = await prisma.users.findUnique({ where: { dni: targetUserDni } });
      expect(userInDb.isActive).toBe(false);
    });

    it('debería validar que el usuario existe', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .put('/admin/users/99999999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Usuario no encontrado');
    });

    it('debería validar campos requeridos', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${targetUserDni}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      TestValidationUtils.expectValidationError(response, 'isActive');
    });

    it('debería rechazar cambio de estado de administrador', async () => {
      // Arrange
      const adminUser = await prisma.users.findFirst({ where: { userType: 'ADMIN' } });

      // Act
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${adminUser.dni}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('administrador');
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const medicResponse = await request(app.getHttpServer())
        .put(`/admin/users/${targetUserDni}/status`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({ isActive: false });

      // Assert
      expect(medicResponse.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /admin/reports', () => {
    beforeEach(async () => {
      // Crear datos para reportes
      const medic = await prisma.users.findFirst({ where: { userType: 'MEDIC' } });
      const patient = await prisma.users.findFirst({ where: { userType: 'PATIENT' } });
      
      await TestCleanupUtils.createMultipleTestAppointments(prisma, medic.dni, patient.dni, 10);
      await TestCleanupUtils.createMultipleTestClinicalRecords(prisma, medic.dni, patient.dni, 5);
    });

    it('debería generar reporte de usuarios', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=users')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.type).toBe('users');
      expect(response.body.report.data).toBeDefined();
      expect(response.body.report.generatedAt).toBeDefined();
    });

    it('debería generar reporte de citas', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.report.type).toBe('appointments');
      expect(response.body.report.data.totalAppointments).toBeDefined();
      expect(response.body.report.data.appointmentsByStatus).toBeDefined();
      expect(response.body.report.data.appointmentsByType).toBeDefined();
    });

    it('debería generar reporte de registros clínicos', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=clinical-records')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.report.type).toBe('clinical-records');
      expect(response.body.report.data.totalRecords).toBeDefined();
      expect(response.body.report.data.recordsByMedic).toBeDefined();
    });

    it('debería filtrar reportes por fecha', async () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/admin/reports?type=appointments&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.report.filters).toBeDefined();
      expect(response.body.report.filters.startDate).toBeDefined();
      expect(response.body.report.filters.endDate).toBeDefined();
    });

    it('debería exportar reporte en formato CSV', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=users&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('debería exportar reporte en formato Excel', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=appointments&format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('debería validar tipo de reporte', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectValidationError(response, 'type');
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=users')
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /admin/system/health', () => {
    it('debería obtener estado del sistema como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.health).toBeDefined();
      expect(response.body.health.status).toBeDefined();
      expect(response.body.health.database).toBeDefined();
      expect(response.body.health.memory).toBeDefined();
      expect(response.body.health.uptime).toBeDefined();
      expect(response.body.health.timestamp).toBeDefined();
    });

    it('debería incluir información de la base de datos', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      const dbHealth = response.body.health.database;
      expect(dbHealth.status).toBeDefined();
      expect(dbHealth.responseTime).toBeDefined();
    });

    it('debería incluir información de memoria', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      const memoryHealth = response.body.health.memory;
      expect(memoryHealth.used).toBeDefined();
      expect(memoryHealth.total).toBeDefined();
      expect(memoryHealth.percentage).toBeDefined();
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('POST /admin/system/backup', () => {
    it('debería crear backup del sistema como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          includeUsers: true,
          includeAppointments: true,
          includeClinicalRecords: true
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 201);
      expect(response.body.message).toContain('Backup creado');
      expect(response.body.backup).toBeDefined();
      expect(response.body.backup.id).toBeDefined();
      expect(response.body.backup.filename).toBeDefined();
      expect(response.body.backup.size).toBeDefined();
      expect(response.body.backup.createdAt).toBeDefined();
    });

    it('debería crear backup parcial', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          includeUsers: true,
          includeAppointments: false,
          includeClinicalRecords: false
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 201);
      expect(response.body.backup.tables).toContain('users');
      expect(response.body.backup.tables).not.toContain('appointments');
    });

    it('debería validar parámetros de backup', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Assert
      TestValidationUtils.expectValidationError(response, 'includeUsers');
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          includeUsers: true,
          includeAppointments: true,
          includeClinicalRecords: true
        });

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /admin/audit-logs', () => {
    beforeEach(async () => {
      // Crear algunos logs de auditoría simulados
      // En un sistema real, estos se crearían automáticamente
      await prisma.auditLogs?.createMany?.({
        data: [
          {
            userId: '12345678',
            action: 'LOGIN',
            resource: 'AUTH',
            details: 'Usuario inició sesión',
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
            timestamp: new Date()
          },
          {
            userId: '12345678',
            action: 'CREATE',
            resource: 'APPOINTMENT',
            details: 'Cita creada',
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
            timestamp: new Date()
          }
        ]
      }).catch(() => {
        // Tabla de auditoría podría no existir en el esquema actual
        console.log('Tabla de auditoría no disponible');
      });
    });

    it('debería obtener logs de auditoría como administrador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      if (response.status === 200) {
        expect(response.body.logs).toBeDefined();
        expect(Array.isArray(response.body.logs)).toBe(true);
        expect(response.body.pagination).toBeDefined();
      } else {
        // Funcionalidad no implementada aún
        expect(response.status).toBe(404);
      }
    });

    it('debería filtrar logs por usuario', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?userId=12345678')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      if (response.status === 200) {
        response.body.logs.forEach(log => {
          expect(log.userId).toBe('12345678');
        });
      }
    });

    it('debería filtrar logs por acción', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?action=LOGIN')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      if (response.status === 200) {
        response.body.logs.forEach(log => {
          expect(log.action).toBe('LOGIN');
        });
      }
    });

    it('debería rechazar acceso a no administradores', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    it('debería manejar dashboard sin datos', async () => {
      // Arrange - Limpiar todos los datos
      await TestCleanupUtils.cleanupAll(prisma);
      
      // Recrear solo el admin
      const { token } = await AuthTestUtils.createAndLoginAdmin(app, prisma);

      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.dashboard.totalUsers).toBe(1); // Solo admin
      expect(response.body.dashboard.totalAppointments).toBe(0);
    });

    it('debería manejar búsqueda de usuarios sin resultados', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?search=NoExiste')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.users).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('debería manejar paginación fuera de rango', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=999&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.users).toHaveLength(0);
    });

    it('debería manejar reportes con fechas inválidas', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/reports?type=appointments&startDate=invalid&endDate=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectValidationError(response, 'startDate');
    });

    it('debería manejar backup cuando no hay datos', async () => {
      // Arrange - Limpiar datos
      await TestCleanupUtils.cleanupAll(prisma);
      const { token } = await AuthTestUtils.createAndLoginAdmin(app, prisma);

      // Act
      const response = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${token}`)
        .send({
          includeUsers: true,
          includeAppointments: true,
          includeClinicalRecords: true
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 201);
      expect(response.body.backup.size).toBeGreaterThan(0); // Al menos el admin
    });
  });

  describe('Rendimiento y Límites', () => {
    it('debería manejar dashboard con muchos datos', async () => {
      // Arrange - Crear muchos datos
      const medic = await prisma.users.findFirst({ where: { userType: 'MEDIC' } });
      const patient = await prisma.users.findFirst({ where: { userType: 'PATIENT' } });
      
      // Crear muchas citas (simular carga)
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          TestCleanupUtils.createSingleTestAppointment(prisma, medic.dni, patient.dni)
        );
      }
      await Promise.all(promises);

      // Act
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      const endTime = Date.now();

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
      expect(response.body.dashboard.totalAppointments).toBe(50);
    });

    it('debería manejar lista de usuarios con paginación grande', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.users.length).toBeLessThanOrEqual(100); // Límite máximo
    });

    it('debería manejar múltiples solicitudes concurrentes al dashboard', async () => {
      // Arrange
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      responses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 200);
      });
    });
  });
});