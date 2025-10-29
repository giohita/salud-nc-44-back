import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  TestAppointmentFactory, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Appointments Module (E2E)', () => {
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

  describe('POST /appointments', () => {
    describe('Crear Cita como Paciente', () => {
      it('debería crear una cita correctamente', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
          time: '10:00'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.message).toContain('Cita creada exitosamente');
        expect(response.body.appointment).toBeDefined();
        expect(response.body.appointment.medicDni).toBe(medicDni);
        expect(response.body.appointment.patientDni).toBe(patientDni);
        expect(response.body.appointment.status).toBe('SCHEDULED');

        // Verificar en base de datos
        const appointmentInDb = await prisma.appointments.findFirst({
          where: { 
            medicDni,
            patientDni 
          }
        });
        expect(appointmentInDb).toBeTruthy();
        expect(appointmentInDb.status).toBe('SCHEDULED');
      });

      it('debería validar fecha futura', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
          time: '10:00'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'date');
      });

      it('debería validar horario de trabajo', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '23:00' // Fuera de horario
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'time');
      });

      it('debería validar disponibilidad del médico', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '10:00'
        });

        // Crear primera cita
        await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Intentar crear segunda cita en el mismo horario
        const { dni: otherPatientDni } = await AuthTestUtils.createPatientInDatabase(prisma, {
          dni: '99999999'
        });

        const duplicateAppointment = {
          ...appointmentData,
          patientDni: otherPatientDni
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(duplicateAppointment);

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toContain('horario no disponible');
      });

      it('debería validar que el médico existe', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni: '99999999', // DNI inexistente
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '10:00'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Médico no encontrado');
      });

      it('debería validar campos requeridos', async () => {
        // Act - Sin fecha
        const responseWithoutDate = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            medicDni,
            patientDni,
            time: '10:00',
            type: 'PRESENCIAL'
          });

        // Assert
        TestValidationUtils.expectValidationError(responseWithoutDate, 'date');
      });

      it('debería crear cita virtual correctamente', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '10:00',
          type: 'VIRTUAL'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.appointment.type).toBe('VIRTUAL');
        expect(response.body.appointment.meetingLink).toBeDefined();
      });
    });

    describe('Crear Cita como Médico', () => {
      it('debería permitir al médico crear citas para sus pacientes', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '14:00'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
      });

      it('debería rechazar si el médico intenta crear cita para otro médico', async () => {
        // Arrange
        const { dni: otherMedicDni } = await AuthTestUtils.createMedicInDatabase(prisma, {
          dni: '88888888'
        });

        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni: otherMedicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: '14:00'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(appointmentData);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('No autorizado');
      });
    });

    describe('Seguridad y Autorización', () => {
      it('debería rechazar creación sin autenticación', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });

      it('debería rechazar token inválido', async () => {
        // Arrange
        const appointmentData = TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', 'Bearer token_invalido')
          .send(appointmentData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });
    });
  });

  describe('GET /appointments', () => {
    beforeEach(async () => {
      // Crear algunas citas de prueba
      await TestCleanupUtils.createTestAppointments(prisma, medicDni, patientDni);
    });

    describe('Obtener Citas como Paciente', () => {
      it('debería obtener citas del paciente autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.appointments).toBeDefined();
        expect(Array.isArray(response.body.appointments)).toBe(true);
        
        // Verificar que todas las citas pertenecen al paciente
        response.body.appointments.forEach(appointment => {
          expect(appointment.patientDni).toBe(patientDni);
        });
      });

      it('debería filtrar citas por estado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments?status=SCHEDULED')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.appointments.forEach(appointment => {
          expect(appointment.status).toBe('SCHEDULED');
        });
      });

      it('debería filtrar citas por fecha', async () => {
        // Arrange
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const dateFilter = tomorrow.toISOString().split('T')[0];

        // Act
        const response = await request(app.getHttpServer())
          .get(`/appointments?date=${dateFilter}`)
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.appointments.forEach(appointment => {
          const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
          expect(appointmentDate).toBe(dateFilter);
        });
      });
    });

    describe('Obtener Citas como Médico', () => {
      it('debería obtener citas del médico autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.appointments).toBeDefined();
        
        // Verificar que todas las citas pertenecen al médico
        response.body.appointments.forEach(appointment => {
          expect(appointment.medicDni).toBe(medicDni);
        });
      });

      it('debería incluir información del paciente en las citas del médico', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.appointments.length > 0) {
          expect(response.body.appointments[0].patient).toBeDefined();
          expect(response.body.appointments[0].patient.name).toBeDefined();
        }
      });
    });

    describe('Paginación y Ordenamiento', () => {
      it('debería soportar paginación', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments?page=1&limit=2')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.appointments.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(2);
      });

      it('debería ordenar por fecha ascendente por defecto', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/appointments')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.appointments.length > 1) {
          const dates = response.body.appointments.map(apt => new Date(apt.date));
          for (let i = 1; i < dates.length; i++) {
            expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i-1].getTime());
          }
        }
      });
    });
  });

  describe('PUT /appointments/:id', () => {
    let appointmentId: string;

    beforeEach(async () => {
      // Crear una cita de prueba
      const appointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni);
      appointmentId = appointment.id;
    });

    describe('Actualizar Cita como Paciente', () => {
      it('debería permitir al paciente reprogramar su cita', async () => {
        // Arrange
        const updateData = {
          date: new Date(Date.now() + 48 * 60 * 60 * 1000), // Pasado mañana
          time: '15:00'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(updateData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('Cita actualizada');
        expect(response.body.appointment.time).toBe('15:00');
      });

      it('debería permitir al paciente cancelar su cita', async () => {
        // Arrange
        const updateData = {
          status: 'CANCELLED'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(updateData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.appointment.status).toBe('CANCELLED');
      });

      it('debería rechazar actualización de cita de otro paciente', async () => {
        // Arrange
        const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
          dni: '77777777'
        });

        const updateData = {
          time: '16:00'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${otherPatientToken}`)
          .send(updateData);

        // Assert
        expect(response.status).toBe(403);
      });
    });

    describe('Actualizar Cita como Médico', () => {
      it('debería permitir al médico actualizar el estado de la cita', async () => {
        // Arrange
        const updateData = {
          status: 'COMPLETED',
          notes: 'Consulta completada exitosamente'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(updateData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.appointment.status).toBe('COMPLETED');
        expect(response.body.appointment.notes).toBe(updateData.notes);
      });

      it('debería rechizar actualización de cita de otro médico', async () => {
        // Arrange
        const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
          dni: '66666666'
        });

        const updateData = {
          status: 'COMPLETED'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${otherMedicToken}`)
          .send(updateData);

        // Assert
        expect(response.status).toBe(403);
      });
    });

    describe('Validaciones de Actualización', () => {
      it('debería validar que no se puede reprogramar a fecha pasada', async () => {
        // Arrange
        const updateData = {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Ayer
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(updateData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'date');
      });

      it('debería validar estados válidos', async () => {
        // Arrange
        const updateData = {
          status: 'INVALID_STATUS'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(updateData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'status');
      });

      it('debería rechazar actualización de cita inexistente', async () => {
        // Arrange
        const fakeId = '999999999';
        const updateData = {
          time: '16:00'
        };

        // Act
        const response = await request(app.getHttpServer())
          .put(`/appointments/${fakeId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(updateData);

        // Assert
        expect(response.status).toBe(404);
      });
    });
  });

  describe('DELETE /appointments/:id', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const appointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni);
      appointmentId = appointment.id;
    });

    it('debería permitir al paciente eliminar su cita', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('Cita eliminada');

      // Verificar que la cita fue eliminada
      const appointmentInDb = await prisma.appointments.findUnique({
        where: { id: appointmentId }
      });
      expect(appointmentInDb).toBeNull();
    });

    it('debería permitir al médico eliminar citas de su agenda', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
    });

    it('debería rechazar eliminación de cita de otro usuario', async () => {
      // Arrange
      const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
        dni: '55555555'
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería rechazar eliminación de cita inexistente', async () => {
      // Arrange
      const fakeId = '999999999';

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('GET /appointments/availability', () => {
    it('debería obtener disponibilidad de un médico', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/appointments/availability?medicDni=${medicDni}&date=${new Date().toISOString().split('T')[0]}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.availability).toBeDefined();
      expect(Array.isArray(response.body.availability)).toBe(true);
    });

    it('debería validar parámetros requeridos', async () => {
      // Act - Sin medicDni
      const response = await request(app.getHttpServer())
        .get('/appointments/availability?date=2024-01-01')
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectValidationError(response, 'medicDni');
    });

    it('debería rechazar consulta sin autenticación', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/appointments/availability?medicDni=${medicDni}&date=2024-01-01`);

      // Assert
      TestValidationUtils.expectUnauthorized(response);
    });
  });

  describe('Casos Edge y Rendimiento', () => {
    it('debería manejar múltiples citas simultáneas', async () => {
      // Arrange
      const appointments = [];
      for (let i = 0; i < 3; i++) {
        const { dni: patientDni } = await AuthTestUtils.createPatientInDatabase(prisma, {
          dni: `5555555${i}`
        });
        
        appointments.push(TestAppointmentFactory.createAppointment({
          medicDni,
          patientDni,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: `${10 + i}:00`
        }));
      }

      // Act
      const promises = appointments.map(appointment =>
        request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(appointment)
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 201);
      });
    });

    it('debería manejar búsqueda con muchos resultados', async () => {
      // Arrange - Crear muchas citas
      for (let i = 0; i < 10; i++) {
        await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni);
      }

      // Act
      const response = await request(app.getHttpServer())
        .get('/appointments?limit=5')
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.appointments.length).toBeLessThanOrEqual(5);
    });
  });
});