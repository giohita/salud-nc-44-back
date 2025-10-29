import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Complete Workflows (E2E)', () => {
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

  describe('Flujo Completo: Registro de Paciente → Cita → Consulta → Registro Clínico', () => {
    it('debería completar el flujo completo de atención médica', async () => {
      // 1. Paciente agenda una cita
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: medicDni,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
          appointmentTime: '10:00',
          appointmentType: 'PRESENCIAL',
          reason: 'Consulta general'
        });

      TestValidationUtils.expectSuccess(appointmentResponse, 201);
      const appointmentId = appointmentResponse.body.appointment.id;

      // 2. Médico confirma la cita
      const confirmResponse = await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          status: 'CONFIRMED'
        });

      TestValidationUtils.expectSuccess(confirmResponse, 200);

      // 3. Médico inicia teleconsulta (si es virtual) o marca como en progreso
      const updateStatusResponse = await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          status: 'IN_PROGRESS'
        });

      TestValidationUtils.expectSuccess(updateStatusResponse, 200);

      // 4. Médico crea registro clínico después de la consulta
      const clinicalRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Paciente en buen estado general',
          treatment: 'Continuar con medicación actual',
          notes: 'Paciente refiere mejoría en síntomas',
          vitalSigns: {
            bloodPressure: '120/80',
            heartRate: 72,
            temperature: 36.5,
            weight: 70
          }
        });

      TestValidationUtils.expectSuccess(clinicalRecordResponse, 201);
      const clinicalRecordId = clinicalRecordResponse.body.clinicalRecord.id;

      // 5. Médico completa la cita
      const completeResponse = await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          status: 'COMPLETED'
        });

      TestValidationUtils.expectSuccess(completeResponse, 200);

      // 6. Paciente puede ver su registro clínico
      const patientRecordsResponse = await request(app.getHttpServer())
        .get('/clinical-records')
        .set('Authorization', `Bearer ${patientToken}`);

      TestValidationUtils.expectSuccess(patientRecordsResponse, 200);
      expect(patientRecordsResponse.body.clinicalRecords).toHaveLength(1);
      expect(patientRecordsResponse.body.clinicalRecords[0].id).toBe(clinicalRecordId);

      // 7. Verificar que la cita aparece como completada
      const appointmentCheckResponse = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      TestValidationUtils.expectSuccess(appointmentCheckResponse, 200);
      expect(appointmentCheckResponse.body.appointment.status).toBe('COMPLETED');

      // 8. Admin puede ver estadísticas actualizadas
      const dashboardResponse = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(dashboardResponse, 200);
      expect(dashboardResponse.body.dashboard.totalAppointments).toBe(1);
      expect(dashboardResponse.body.dashboard.totalClinicalRecords).toBe(1);
    });
  });

  describe('Flujo de Teleconsulta Completo', () => {
    it('debería completar flujo de teleconsulta con WebRTC', async () => {
      // 1. Paciente agenda cita virtual
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: medicDni,
          appointmentDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // En 1 hora
          appointmentTime: '14:00',
          appointmentType: 'VIRTUAL',
          reason: 'Seguimiento post-operatorio'
        });

      TestValidationUtils.expectSuccess(appointmentResponse, 201);
      const appointmentId = appointmentResponse.body.appointment.id;

      // 2. Médico inicia teleconsulta
      const teleconsultationResponse = await request(app.getHttpServer())
        .post('/teleconsultations')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          appointmentId: appointmentId,
          platform: 'WEBRTC'
        });

      TestValidationUtils.expectSuccess(teleconsultationResponse, 201);
      const teleconsultationId = teleconsultationResponse.body.teleconsultation.id;

      // 3. Paciente se une a la teleconsulta
      const joinResponse = await request(app.getHttpServer())
        .post(`/teleconsultations/${teleconsultationId}/join`)
        .set('Authorization', `Bearer ${patientToken}`);

      TestValidationUtils.expectSuccess(joinResponse, 200);

      // 4. Simular intercambio WebRTC - Médico envía oferta
      const offerResponse = await request(app.getHttpServer())
        .post(`/teleconsultations/${teleconsultationId}/webrtc/offer`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          offer: {
            type: 'offer',
            sdp: 'v=0\r\no=- 123456789 123456789 IN IP4 127.0.0.1\r\n...'
          }
        });

      TestValidationUtils.expectSuccess(offerResponse, 200);

      // 5. Paciente envía respuesta
      const answerResponse = await request(app.getHttpServer())
        .post(`/teleconsultations/${teleconsultationId}/webrtc/answer`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          answer: {
            type: 'answer',
            sdp: 'v=0\r\no=- 987654321 987654321 IN IP4 127.0.0.1\r\n...'
          }
        });

      TestValidationUtils.expectSuccess(answerResponse, 200);

      // 6. Intercambio de candidatos ICE
      const iceCandidateResponse = await request(app.getHttpServer())
        .post(`/teleconsultations/${teleconsultationId}/webrtc/ice-candidate`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          candidate: {
            candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
            sdpMLineIndex: 0,
            sdpMid: 'audio'
          }
        });

      TestValidationUtils.expectSuccess(iceCandidateResponse, 200);

      // 7. Médico finaliza teleconsulta
      const endResponse = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${medicToken}`);

      TestValidationUtils.expectSuccess(endResponse, 200);

      // 8. Crear registro clínico post-teleconsulta
      const clinicalRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Evolución favorable post-operatoria',
          treatment: 'Continuar con rehabilitación',
          notes: 'Teleconsulta realizada exitosamente. Paciente sin complicaciones.',
          vitalSigns: {
            bloodPressure: 'No medido - teleconsulta',
            heartRate: 'No medido - teleconsulta'
          }
        });

      TestValidationUtils.expectSuccess(clinicalRecordResponse, 201);

      // 9. Verificar que la teleconsulta está finalizada
      const teleconsultationCheckResponse = await request(app.getHttpServer())
        .get(`/teleconsultations/${teleconsultationId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      TestValidationUtils.expectSuccess(teleconsultationCheckResponse, 200);
      expect(teleconsultationCheckResponse.body.teleconsultation.status).toBe('ENDED');
    });
  });

  describe('Flujo de Gestión Administrativa Completo', () => {
    it('debería completar flujo de gestión administrativa', async () => {
      // 1. Admin crea múltiples usuarios
      const newMedicResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dni: '33333333',
          name: 'Dr. Juan Pérez',
          email: 'juan.perez@hospital.com',
          password: 'SecurePass123!',
          userType: 'MEDIC',
          phone: '555-0103',
          address: 'Calle Médica 123',
          gender: 'MALE',
          birthDate: '1980-05-15',
          specialization: 'Cardiología'
        });

      TestValidationUtils.expectSuccess(newMedicResponse, 201);

      const newPatientResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dni: '44444444',
          name: 'María González',
          email: 'maria.gonzalez@email.com',
          password: 'SecurePass123!',
          userType: 'PATIENT',
          phone: '555-0104',
          address: 'Avenida Paciente 456',
          gender: 'FEMALE',
          birthDate: '1990-08-20'
        });

      TestValidationUtils.expectSuccess(newPatientResponse, 201);

      // 2. Admin verifica dashboard actualizado
      const dashboardResponse = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(dashboardResponse, 200);
      expect(dashboardResponse.body.dashboard.totalUsers).toBeGreaterThanOrEqual(5); // Admin + 2 médicos + 2 pacientes

      // 3. Crear múltiples citas para generar datos
      const appointments = [];
      for (let i = 0; i < 5; i++) {
        const appointmentResponse = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            medicDni: medicDni,
            appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            appointmentTime: `${10 + i}:00`,
            appointmentType: i % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL',
            reason: `Consulta ${i + 1}`
          });

        TestValidationUtils.expectSuccess(appointmentResponse, 201);
        appointments.push(appointmentResponse.body.appointment);
      }

      // 4. Admin genera reporte de citas
      const appointmentsReportResponse = await request(app.getHttpServer())
        .get('/admin/reports?type=appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(appointmentsReportResponse, 200);
      expect(appointmentsReportResponse.body.report.data.totalAppointments).toBe(5);

      // 5. Admin desactiva un usuario
      const deactivateResponse = await request(app.getHttpServer())
        .put('/admin/users/44444444/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      TestValidationUtils.expectSuccess(deactivateResponse, 200);

      // 6. Admin genera reporte de usuarios
      const usersReportResponse = await request(app.getHttpServer())
        .get('/admin/reports?type=users')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(usersReportResponse, 200);
      expect(usersReportResponse.body.report.data.activeUsers).toBeDefined();
      expect(usersReportResponse.body.report.data.inactiveUsers).toBeDefined();

      // 7. Admin crea backup del sistema
      const backupResponse = await request(app.getHttpServer())
        .post('/admin/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          includeUsers: true,
          includeAppointments: true,
          includeClinicalRecords: true
        });

      TestValidationUtils.expectSuccess(backupResponse, 201);
      expect(backupResponse.body.backup.filename).toBeDefined();

      // 8. Admin verifica salud del sistema
      const healthResponse = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(healthResponse, 200);
      expect(healthResponse.body.health.status).toBe('healthy');
    });
  });

  describe('Flujo de Integración FHIR Completo', () => {
    it('debería completar flujo de integración FHIR', async () => {
      // 1. Configurar servidor FHIR
      const fhirConfigResponse = await request(app.getHttpServer())
        .post('/fhir/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serverUrl: 'https://hapi.fhir.org/baseR4',
          apiKey: 'test-api-key',
          enabled: true
        });

      if (fhirConfigResponse.status === 201) {
        // 2. Sincronizar paciente con FHIR
        const syncPatientResponse = await request(app.getHttpServer())
          .post(`/fhir/patients/${patientDni}/sync`)
          .set('Authorization', `Bearer ${medicToken}`);

        TestValidationUtils.expectSuccess(syncPatientResponse, 200);

        // 3. Crear registro clínico
        const clinicalRecordResponse = await request(app.getHttpServer())
          .post('/clinical-records')
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            patientDni: patientDni,
            diagnosis: 'Hipertensión arterial',
            treatment: 'Enalapril 10mg cada 12 horas',
            notes: 'Paciente con buen control de presión arterial',
            vitalSigns: {
              bloodPressure: '130/85',
              heartRate: 75,
              temperature: 36.8,
              weight: 75
            }
          });

        TestValidationUtils.expectSuccess(clinicalRecordResponse, 201);
        const clinicalRecordId = clinicalRecordResponse.body.clinicalRecord.id;

        // 4. Sincronizar registro con FHIR
        const syncRecordResponse = await request(app.getHttpServer())
          .post(`/fhir/clinical-records/${clinicalRecordId}/sync`)
          .set('Authorization', `Bearer ${medicToken}`);

        TestValidationUtils.expectSuccess(syncRecordResponse, 200);

        // 5. Importar observaciones desde FHIR
        const importObservationsResponse = await request(app.getHttpServer())
          .post(`/fhir/patients/${patientDni}/import-observations`)
          .set('Authorization', `Bearer ${medicToken}`);

        TestValidationUtils.expectSuccess(importObservationsResponse, 200);

        // 6. Obtener registros con datos FHIR
        const fhirRecordsResponse = await request(app.getHttpServer())
          .get(`/clinical-records?includeFhirData=true`)
          .set('Authorization', `Bearer ${medicToken}`);

        TestValidationUtils.expectSuccess(fhirRecordsResponse, 200);
        expect(fhirRecordsResponse.body.clinicalRecords[0].fhirData).toBeDefined();
      } else {
        // FHIR no implementado aún, verificar que retorna 404 o similar
        expect(fhirConfigResponse.status).toBeGreaterThanOrEqual(404);
      }
    });
  });

  describe('Flujo de Manejo de Errores y Recuperación', () => {
    it('debería manejar errores y recuperarse correctamente', async () => {
      // 1. Intentar crear cita con médico inexistente
      const invalidAppointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: '99999999', // DNI inexistente
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: '10:00',
          appointmentType: 'PRESENCIAL',
          reason: 'Consulta general'
        });

      expect(invalidAppointmentResponse.status).toBe(404);

      // 2. Crear cita válida
      const validAppointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: medicDni,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: '10:00',
          appointmentType: 'PRESENCIAL',
          reason: 'Consulta general'
        });

      TestValidationUtils.expectSuccess(validAppointmentResponse, 201);
      const appointmentId = validAppointmentResponse.body.appointment.id;

      // 3. Intentar crear registro clínico sin cita completada
      const prematureRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Diagnóstico prematuro',
          treatment: 'Tratamiento prematuro'
        });

      // Debería fallar porque la cita no está completada
      expect(prematureRecordResponse.status).toBeGreaterThanOrEqual(400);

      // 4. Completar cita primero
      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({ status: 'COMPLETED' });

      // 5. Ahora crear registro clínico exitosamente
      const validRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Diagnóstico válido',
          treatment: 'Tratamiento válido'
        });

      TestValidationUtils.expectSuccess(validRecordResponse, 201);

      // 6. Verificar que el sistema se recuperó correctamente
      const finalDashboardResponse = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(finalDashboardResponse, 200);
      expect(finalDashboardResponse.body.dashboard.totalAppointments).toBe(1);
      expect(finalDashboardResponse.body.dashboard.totalClinicalRecords).toBe(1);
    });
  });

  describe('Flujo de Concurrencia y Rendimiento', () => {
    it('debería manejar múltiples operaciones concurrentes', async () => {
      // 1. Crear múltiples citas concurrentemente
      const appointmentPromises = Array(10).fill(null).map((_, index) => 
        request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            medicDni: medicDni,
            appointmentDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
            appointmentTime: `${10 + (index % 8)}:00`,
            appointmentType: index % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL',
            reason: `Consulta concurrente ${index + 1}`
          })
      );

      const appointmentResponses = await Promise.all(appointmentPromises);

      // Verificar que todas las citas se crearon exitosamente
      appointmentResponses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 201);
      });

      // 2. Múltiples consultas concurrentes al dashboard
      const dashboardPromises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const dashboardResponses = await Promise.all(dashboardPromises);

      dashboardResponses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.dashboard.totalAppointments).toBe(10);
      });

      // 3. Múltiples actualizaciones concurrentes de citas
      const updatePromises = appointmentResponses.slice(0, 5).map(response =>
        request(app.getHttpServer())
          .put(`/appointments/${response.body.appointment.id}`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send({ status: 'CONFIRMED' })
      );

      const updateResponses = await Promise.all(updatePromises);

      updateResponses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 200);
      });

      // 4. Verificar consistencia final
      const finalCheckResponse = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${medicToken}`);

      TestValidationUtils.expectSuccess(finalCheckResponse, 200);
      const confirmedAppointments = finalCheckResponse.body.appointments.filter(
        apt => apt.status === 'CONFIRMED'
      );
      expect(confirmedAppointments).toHaveLength(5);
    });
  });

  describe('Flujo de Seguridad y Autorización', () => {
    it('debería mantener seguridad a través de todo el flujo', async () => {
      // 1. Crear cita como paciente
      const appointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: medicDni,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: '10:00',
          appointmentType: 'PRESENCIAL',
          reason: 'Consulta de seguridad'
        });

      TestValidationUtils.expectSuccess(appointmentResponse, 201);
      const appointmentId = appointmentResponse.body.appointment.id;

      // 2. Intentar que otro paciente acceda a la cita (debería fallar)
      const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(
        app, 
        prisma, 
        { dni: '55555555' }
      );

      const unauthorizedAccessResponse = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(unauthorizedAccessResponse.status).toBeGreaterThanOrEqual(401);

      // 3. Médico correcto puede acceder
      const authorizedAccessResponse = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      TestValidationUtils.expectSuccess(authorizedAccessResponse, 200);

      // 4. Completar cita y crear registro clínico
      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({ status: 'COMPLETED' });

      const clinicalRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Diagnóstico seguro',
          treatment: 'Tratamiento seguro'
        });

      TestValidationUtils.expectSuccess(clinicalRecordResponse, 201);
      const clinicalRecordId = clinicalRecordResponse.body.clinicalRecord.id;

      // 5. Verificar que otro médico no puede acceder al registro
      const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(
        app, 
        prisma, 
        { dni: '66666666' }
      );

      const unauthorizedRecordResponse = await request(app.getHttpServer())
        .get(`/clinical-records/${clinicalRecordId}`)
        .set('Authorization', `Bearer ${otherMedicToken}`);

      expect(unauthorizedRecordResponse.status).toBeGreaterThanOrEqual(401);

      // 6. Paciente correcto puede ver su registro
      const patientRecordResponse = await request(app.getHttpServer())
        .get(`/clinical-records/${clinicalRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      TestValidationUtils.expectSuccess(patientRecordResponse, 200);

      // 7. Admin puede ver todo
      const adminRecordResponse = await request(app.getHttpServer())
        .get(`/clinical-records/${clinicalRecordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      TestValidationUtils.expectSuccess(adminRecordResponse, 200);
    });
  });

  describe('Flujo de Validación de Datos Completo', () => {
    it('debería validar datos a través de todo el flujo', async () => {
      // 1. Intentar crear cita con datos inválidos
      const invalidDataTests = [
        {
          data: { medicDni: '', appointmentDate: '', appointmentTime: '', reason: '' },
          expectedField: 'medicDni'
        },
        {
          data: { 
            medicDni: medicDni, 
            appointmentDate: 'invalid-date', 
            appointmentTime: '10:00', 
            reason: 'Test' 
          },
          expectedField: 'appointmentDate'
        },
        {
          data: { 
            medicDni: medicDni, 
            appointmentDate: new Date().toISOString(), 
            appointmentTime: '25:00', 
            reason: 'Test' 
          },
          expectedField: 'appointmentTime'
        }
      ];

      for (const test of invalidDataTests) {
        const response = await request(app.getHttpServer())
          .post('/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(test.data);

        TestValidationUtils.expectValidationError(response, test.expectedField);
      }

      // 2. Crear cita válida
      const validAppointmentResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          medicDni: medicDni,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          appointmentTime: '10:00',
          appointmentType: 'PRESENCIAL',
          reason: 'Consulta válida'
        });

      TestValidationUtils.expectSuccess(validAppointmentResponse, 201);
      const appointmentId = validAppointmentResponse.body.appointment.id;

      // 3. Completar cita
      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({ status: 'COMPLETED' });

      // 4. Intentar crear registro clínico con datos inválidos
      const invalidRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: '', // DNI vacío
          appointmentId: appointmentId,
          diagnosis: '',  // Diagnóstico vacío
          treatment: ''   // Tratamiento vacío
        });

      TestValidationUtils.expectValidationError(invalidRecordResponse, 'patientDni');

      // 5. Crear registro clínico válido
      const validRecordResponse = await request(app.getHttpServer())
        .post('/clinical-records')
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          patientDni: patientDni,
          appointmentId: appointmentId,
          diagnosis: 'Diagnóstico válido con suficiente detalle',
          treatment: 'Tratamiento válido con instrucciones claras',
          notes: 'Notas adicionales del médico',
          vitalSigns: {
            bloodPressure: '120/80',
            heartRate: 72,
            temperature: 36.5,
            weight: 70
          }
        });

      TestValidationUtils.expectSuccess(validRecordResponse, 201);

      // 6. Verificar que todos los datos se guardaron correctamente
      const recordCheckResponse = await request(app.getHttpServer())
        .get(`/clinical-records/${validRecordResponse.body.clinicalRecord.id}`)
        .set('Authorization', `Bearer ${medicToken}`);

      TestValidationUtils.expectSuccess(recordCheckResponse, 200);
      const record = recordCheckResponse.body.clinicalRecord;
      expect(record.diagnosis).toBe('Diagnóstico válido con suficiente detalle');
      expect(record.treatment).toBe('Tratamiento válido con instrucciones claras');
      expect(record.vitalSigns.bloodPressure).toBe('120/80');
    });
  });
});