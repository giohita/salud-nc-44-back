import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  TestClinicalRecordFactory, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Clinical Records Module (E2E)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let medicToken: string;
  let patientToken: string;
  let medicDni: string;
  let patientDni: string;

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
    const { token: medicTk, dni: medicDniValue } = await AuthTestUtils.createAndLoginMedic(app, prisma);
    const { token: patientTk, dni: patientDniValue } = await AuthTestUtils.createAndLoginPatient(app, prisma);
    
    adminToken = adminTk;
    medicToken = medicTk;
    patientToken = patientTk;
    medicDni = medicDniValue;
    patientDni = patientDniValue;
  });

  describe('POST /clinical-records', () => {
    describe('Crear Registro Clínico como Médico', () => {
      it('debería crear un registro clínico correctamente', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(recordData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.message).toContain('Registro clínico creado');
        expect(response.body.record).toBeDefined();
        expect(response.body.record.patientDni).toBe(patientDni);
        expect(response.body.record.medicDni).toBe(medicDni);
        expect(response.body.record.diagnosis).toBe(recordData.diagnosis);

        // Verificar en base de datos
        const recordInDb = await prisma.clinicalRecords.findFirst({
          where: { 
            patientDni,
            medicDni 
          }
        });
        expect(recordInDb).toBeTruthy();
        expect(recordInDb.diagnosis).toBe(recordData.diagnosis);
      });

      it('debería validar campos requeridos', async () => {
        // Act - Sin diagnóstico
        const responseWithoutDiagnosis = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            patientDni,
            medicDni,
            treatment: 'Tratamiento de prueba'
          });

        // Assert
        TestValidationUtils.expectValidationError(responseWithoutDiagnosis, 'diagnosis');
      });

      it('debería validar que el paciente existe', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni: '99999999', // DNI inexistente
          medicDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(recordData);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Paciente no encontrado');
      });

      it('debería rechazar creación por médico no autorizado', async () => {
        // Arrange
        const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
          dni: '88888888'
        });

        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni // Médico diferente al autenticado
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${otherMedicToken}`)
          .send(recordData);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('No autorizado');
      });

      it('debería crear registro con observaciones y medicamentos', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni,
          observations: 'Paciente presenta mejoría significativa',
          medications: 'Paracetamol 500mg cada 8 horas'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(recordData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.record.observations).toBe(recordData.observations);
        expect(response.body.record.medications).toBe(recordData.medications);
      });
    });

    describe('Seguridad y Autorización', () => {
      it('debería rechazar creación sin autenticación', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .send(recordData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });

      it('debería rechazar creación por paciente', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(recordData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });

      it('debería rechazar creación por administrador', async () => {
        // Arrange
        const recordData = TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(recordData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });
    });
  });

  describe('GET /clinical-records', () => {
    beforeEach(async () => {
      // Crear algunos registros de prueba
      await TestCleanupUtils.createTestClinicalRecords(prisma, medicDni, patientDni);
    });

    describe('Obtener Registros como Paciente', () => {
      it('debería obtener registros del paciente autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.records).toBeDefined();
        expect(Array.isArray(response.body.records)).toBe(true);
        
        // Verificar que todos los registros pertenecen al paciente
        response.body.records.forEach(record => {
          expect(record.patientDni).toBe(patientDni);
        });
      });

      it('debería incluir información del médico en los registros', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.records.length > 0) {
          expect(response.body.records[0].medic).toBeDefined();
          expect(response.body.records[0].medic.name).toBeDefined();
        }
      });

      it('debería filtrar registros por fecha', async () => {
        // Arrange
        const today = new Date().toISOString().split('T')[0];

        // Act
        const response = await request(app.getHttpServer())
          .get(`/clinical-records?date=${today}`)
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.records.forEach(record => {
          const recordDate = new Date(record.createdAt).toISOString().split('T')[0];
          expect(recordDate).toBe(today);
        });
      });
    });

    describe('Obtener Registros como Médico', () => {
      it('debería obtener registros creados por el médico autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.records).toBeDefined();
        
        // Verificar que todos los registros fueron creados por el médico
        response.body.records.forEach(record => {
          expect(record.medicDni).toBe(medicDni);
        });
      });

      it('debería obtener registros de un paciente específico', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get(`/clinical-records?patientDni=${patientDni}`)
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.records.forEach(record => {
          expect(record.patientDni).toBe(patientDni);
        });
      });
    });

    describe('Paginación y Ordenamiento', () => {
      it('debería soportar paginación', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records?page=1&limit=2')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.records.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination).toBeDefined();
      });

      it('debería ordenar por fecha descendente por defecto', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.records.length > 1) {
          const dates = response.body.records.map(record => new Date(record.createdAt));
          for (let i = 1; i < dates.length; i++) {
            expect(dates[i].getTime()).toBeLessThanOrEqual(dates[i-1].getTime());
          }
        }
      });
    });
  });

  describe('GET /clinical-records/:id', () => {
    let recordId: string;

    beforeEach(async () => {
      const record = await TestCleanupUtils.createSingleTestClinicalRecord(prisma, medicDni, patientDni);
      recordId = record.id;
    });

    it('debería obtener un registro específico como paciente propietario', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.record).toBeDefined();
      expect(response.body.record.id).toBe(recordId);
      expect(response.body.record.patientDni).toBe(patientDni);
    });

    it('debería obtener un registro específico como médico creador', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.record.medicDni).toBe(medicDni);
    });

    it('debería rechazar acceso a registro de otro paciente', async () => {
      // Arrange
      const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
        dni: '77777777'
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería rechazar acceso a registro de otro médico', async () => {
      // Arrange
      const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
        dni: '66666666'
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${otherMedicToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería retornar 404 para registro inexistente', async () => {
      // Arrange
      const fakeId = '999999999';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /clinical-records/:id', () => {
    let recordId: string;

    beforeEach(async () => {
      const record = await TestCleanupUtils.createSingleTestClinicalRecord(prisma, medicDni, patientDni);
      recordId = record.id;
    });

    it('debería permitir al médico creador actualizar el registro', async () => {
      // Arrange
      const updateData = {
        diagnosis: 'Diagnóstico actualizado',
        treatment: 'Tratamiento modificado',
        observations: 'Nuevas observaciones'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(updateData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('actualizado');
      expect(response.body.record.diagnosis).toBe(updateData.diagnosis);
      expect(response.body.record.treatment).toBe(updateData.treatment);
    });

    it('debería rechazar actualización por otro médico', async () => {
      // Arrange
      const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
        dni: '55555555'
      });

      const updateData = {
        diagnosis: 'Diagnóstico no autorizado'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${otherMedicToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería rechazar actualización por paciente', async () => {
      // Arrange
      const updateData = {
        diagnosis: 'Paciente no puede modificar'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('debería validar campos en la actualización', async () => {
      // Arrange
      const updateData = {
        diagnosis: '' // Diagnóstico vacío
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/clinical-records/${recordId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(updateData);

      // Assert
      TestValidationUtils.expectValidationError(response, 'diagnosis');
    });
  });

  describe('FHIR Integration Endpoints', () => {
    describe('POST /clinical-records/fhir/configure', () => {
      it('debería configurar servidor FHIR como administrador', async () => {
        // Arrange
        const fhirConfig = {
          serverUrl: 'https://hapi.fhir.org/baseR4',
          authToken: 'test-token-123',
          version: 'R4'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/configure')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(fhirConfig);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('configurado');
        expect(response.body.config.serverUrl).toBe(fhirConfig.serverUrl);
      });

      it('debería rechazar configuración por no administrador', async () => {
        // Arrange
        const fhirConfig = {
          serverUrl: 'https://test.fhir.org/baseR4'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/configure')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(fhirConfig);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });

      it('debería validar URL del servidor FHIR', async () => {
        // Arrange
        const fhirConfig = {
          serverUrl: 'url-invalida'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/configure')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(fhirConfig);

        // Assert
        TestValidationUtils.expectValidationError(response, 'serverUrl');
      });
    });

    describe('POST /clinical-records/fhir/sync-patients', () => {
      it('debería sincronizar pacientes con servidor FHIR', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/sync-patients')
          .set('Authorization', `Bearer ${adminToken}`)
          .send();

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('sincronización');
        expect(response.body.syncResult).toBeDefined();
      });

      it('debería rechazar sincronización por no administrador', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/sync-patients')
          .set('Authorization', `Bearer ${medicToken}`)
          .send();

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });
    });

    describe('POST /clinical-records/fhir/sync-records', () => {
      it('debería sincronizar registros clínicos con FHIR', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/sync-records')
          .set('Authorization', `Bearer ${adminToken}`)
          .send();

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('sincronización');
        expect(response.body.syncResult).toBeDefined();
      });
    });

    describe('POST /clinical-records/fhir/import-observations', () => {
      it('debería importar observaciones FHIR', async () => {
        // Arrange
        const importData = {
          patientId: 'patient-123',
          fromDate: '2024-01-01',
          toDate: '2024-12-31'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/import-observations')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(importData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('importación');
        expect(response.body.importResult).toBeDefined();
      });

      it('debería validar parámetros de importación', async () => {
        // Act - Sin patientId
        const response = await request(app.getHttpServer())
          .post('/clinical-records/fhir/import-observations')
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            fromDate: '2024-01-01'
          });

        // Assert
        TestValidationUtils.expectValidationError(response, 'patientId');
      });
    });

    describe('GET /clinical-records/:id/fhir', () => {
      let recordId: string;

      beforeEach(async () => {
        const record = await TestCleanupUtils.createSingleTestClinicalRecord(prisma, medicDni, patientDni);
        recordId = record.id;
      });

      it('debería obtener registro con datos FHIR', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get(`/clinical-records/${recordId}/fhir`)
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.record).toBeDefined();
        expect(response.body.fhirData).toBeDefined();
        expect(response.body.fhirData.resourceType).toBe('Observation');
      });

      it('debería rechazar acceso no autorizado a datos FHIR', async () => {
        // Arrange
        const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
          dni: '44444444'
        });

        // Act
        const response = await request(app.getHttpServer())
          .get(`/clinical-records/${recordId}/fhir`)
          .set('Authorization', `Bearer ${otherPatientToken}`);

        // Assert
        expect(response.status).toBe(403);
      });
    });

    describe('GET /clinical-records/fhir', () => {
      it('debería obtener registros con datos FHIR como médico', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/clinical-records/fhir')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.records).toBeDefined();
        expect(Array.isArray(response.body.records)).toBe(true);
      });

      it('debería filtrar registros FHIR por paciente', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get(`/clinical-records/fhir?patientDni=${patientDni}`)
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.records.forEach(record => {
          expect(record.patientDni).toBe(patientDni);
        });
      });
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    it('debería manejar diagnósticos largos', async () => {
      // Arrange
      const longDiagnosis = 'A'.repeat(1000);
      const recordData = TestClinicalRecordFactory.createClinicalRecord({
        patientDni,
        medicDni,
        diagnosis: longDiagnosis
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send(recordData);

      // Assert
      TestValidationUtils.expectSuccess(response, 201);
      expect(response.body.record.diagnosis).toBe(longDiagnosis);
    });

    it('debería manejar caracteres especiales en diagnósticos', async () => {
      // Arrange
      const specialDiagnosis = 'Diagnóstico con ñ, acentos á é í ó ú y símbolos @#$%';
      const recordData = TestClinicalRecordFactory.createClinicalRecord({
        patientDni,
        medicDni,
        diagnosis: specialDiagnosis
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send(recordData);

      // Assert
      TestValidationUtils.expectSuccess(response, 201);
      expect(response.body.record.diagnosis).toBe(specialDiagnosis);
    });

    it('debería manejar múltiples registros para el mismo paciente', async () => {
      // Arrange
      const records = [];
      for (let i = 0; i < 3; i++) {
        records.push(TestClinicalRecordFactory.createClinicalRecord({
          patientDni,
          medicDni,
          diagnosis: `Diagnóstico ${i + 1}`
        }));
      }

      // Act
      const promises = records.map(record =>
        request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(record)
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 201);
      });

      // Verificar que todos los registros fueron creados
      const recordsInDb = await prisma.clinicalRecords.findMany({
        where: { patientDni }
      });
      expect(recordsInDb.length).toBe(3);
    });

    it('debería manejar búsqueda sin resultados', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/clinical-records?patientDni=00000000')
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.records).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('debería manejar errores de conexión FHIR gracefully', async () => {
      // Arrange - Configurar servidor FHIR inválido
      await request(app.getHttpServer())
        .post('/clinical-records/fhir/configure')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serverUrl: 'https://servidor-inexistente.com/fhir',
          authToken: 'token-invalido'
        });

      // Act
      const response = await request(app.getHttpServer())
        .post('/clinical-records/fhir/sync-patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      // Assert
      // Debería manejar el error sin fallar completamente
      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status >= 400) {
        expect(response.body.message).toContain('error');
      }
    });
  });

  describe('Rendimiento y Límites', () => {
    it('debería manejar paginación con muchos registros', async () => {
      // Arrange - Crear muchos registros
      for (let i = 0; i < 20; i++) {
        await TestCleanupUtils.createSingleTestClinicalRecord(prisma, medicDni, patientDni);
      }

      // Act
      const response = await request(app.getHttpServer())
        .get('/clinical-records?limit=5')
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.records.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(20);
    });

    it('debería manejar búsquedas complejas eficientemente', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/clinical-records?patientDni=${patientDni}&date=${new Date().toISOString().split('T')[0]}&limit=10`)
        .set('Authorization', `Bearer ${medicToken}`);

      const endTime = Date.now();

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
    });
  });
});