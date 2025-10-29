import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { 
  TestApp, 
  AuthTestUtils, 
  TestValidationUtils,
  TestCleanupUtils 
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Teleconsultations Module (E2E)', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let medicToken: string;
  let patientToken: string;
  let medicDni: string;
  let patientDni: string;
  let appointmentId: string;

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

    // Crear una cita virtual para las teleconsultas
    const appointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni, {
      type: 'VIRTUAL'
    });
    appointmentId = appointment.id;
  });

  describe('POST /teleconsultations/start', () => {
    describe('Iniciar Teleconsulta como Médico', () => {
      it('debería iniciar una teleconsulta correctamente', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(teleconsultationData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.message).toContain('Teleconsulta iniciada');
        expect(response.body.teleconsultation).toBeDefined();
        expect(response.body.teleconsultation.appointmentId).toBe(appointmentId);
        expect(response.body.teleconsultation.status).toBe('ACTIVE');
        expect(response.body.teleconsultation.meetingLink).toBeDefined();
        expect(response.body.teleconsultation.roomId).toBeDefined();

        // Verificar en base de datos
        const teleconsultationInDb = await prisma.teleconsultations.findFirst({
          where: { appointmentId }
        });
        expect(teleconsultationInDb).toBeTruthy();
        expect(teleconsultationInDb.status).toBe('ACTIVE');
      });

      it('debería generar enlace de reunión único', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(teleconsultationData);

        // Assert
        TestValidationUtils.expectSuccess(response, 201);
        expect(response.body.teleconsultation.meetingLink).toMatch(/^https?:\/\/.+/);
        expect(response.body.teleconsultation.roomId).toMatch(/^[a-zA-Z0-9-]+$/);
      });

      it('debería validar que la cita existe', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId: '999999999', // ID inexistente
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(teleconsultationData);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('Cita no encontrada');
      });

      it('debería validar que la cita es virtual', async () => {
        // Arrange - Crear cita presencial
        const presentialAppointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni, {
          type: 'PRESENCIAL'
        });

        const teleconsultationData = {
          appointmentId: presentialAppointment.id,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send(teleconsultationData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('virtual');
      });

      it('debería rechazar inicio por médico no autorizado', async () => {
        // Arrange
        const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
          dni: '88888888'
        });

        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${otherMedicToken}`)
          .send(teleconsultationData);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('No autorizado');
      });

      it('debería soportar diferentes plataformas', async () => {
        // Arrange
        const platforms = ['WEBRTC', 'ZOOM', 'GOOGLE_MEET'];

        for (const platform of platforms) {
          // Crear nueva cita para cada plataforma
          const appointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni, {
            type: 'VIRTUAL'
          });

          const teleconsultationData = {
            appointmentId: appointment.id,
            platform
          };

          // Act
          const response = await request(app.getHttpServer())
            .post('/teleconsultations/start')
            .set('Authorization', `Bearer ${medicToken}`)
            .send(teleconsultationData);

          // Assert
          TestValidationUtils.expectSuccess(response, 201);
          expect(response.body.teleconsultation.platform).toBe(platform);
        }
      });

      it('debería validar campos requeridos', async () => {
        // Act - Sin appointmentId
        const responseWithoutAppointment = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            platform: 'WEBRTC'
          });

        // Assert
        TestValidationUtils.expectValidationError(responseWithoutAppointment, 'appointmentId');
      });
    });

    describe('Seguridad y Autorización', () => {
      it('debería rechazar inicio sin autenticación', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .send(teleconsultationData);

        // Assert
        TestValidationUtils.expectUnauthorized(response);
      });

      it('debería rechazar inicio por paciente', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${patientToken}`)
          .send(teleconsultationData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });

      it('debería rechazar inicio por administrador', async () => {
        // Arrange
        const teleconsultationData = {
          appointmentId,
          platform: 'WEBRTC'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(teleconsultationData);

        // Assert
        expect(response.status).toBeGreaterThanOrEqual(401);
      });
    });
  });

  describe('POST /teleconsultations/:id/join', () => {
    let teleconsultationId: string;

    beforeEach(async () => {
      // Crear teleconsulta activa
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);
      teleconsultationId = teleconsultation.id;
    });

    describe('Unirse a Teleconsulta como Paciente', () => {
      it('debería permitir al paciente unirse a su teleconsulta', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/join`)
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('unido');
        expect(response.body.joinInfo).toBeDefined();
        expect(response.body.joinInfo.meetingLink).toBeDefined();
        expect(response.body.joinInfo.roomId).toBeDefined();
        expect(response.body.joinInfo.accessToken).toBeDefined();
      });

      it('debería rechazar unión de paciente no autorizado', async () => {
        // Arrange
        const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
          dni: '77777777'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/join`)
          .set('Authorization', `Bearer ${otherPatientToken}`);

        // Assert
        expect(response.status).toBe(403);
      });

      it('debería validar que la teleconsulta está activa', async () => {
        // Arrange - Finalizar teleconsulta
        await prisma.teleconsultations.update({
          where: { id: teleconsultationId },
          data: { status: 'COMPLETED' }
        });

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/join`)
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('activa');
      });
    });

    describe('Unirse a Teleconsulta como Médico', () => {
      it('debería permitir al médico unirse a su teleconsulta', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/join`)
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.joinInfo.role).toBe('MODERATOR');
      });

      it('debería rechazar unión de médico no autorizado', async () => {
        // Arrange
        const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
          dni: '66666666'
        });

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/join`)
          .set('Authorization', `Bearer ${otherMedicToken}`);

        // Assert
        expect(response.status).toBe(403);
      });
    });

    it('debería retornar 404 para teleconsulta inexistente', async () => {
      // Arrange
      const fakeId = '999999999';

      // Act
      const response = await request(app.getHttpServer())
        .post(`/teleconsultations/${fakeId}/join`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /teleconsultations/:id/end', () => {
    let teleconsultationId: string;

    beforeEach(async () => {
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);
      teleconsultationId = teleconsultation.id;
    });

    it('debería permitir al médico finalizar la teleconsulta', async () => {
      // Arrange
      const endData = {
        summary: 'Consulta completada exitosamente',
        duration: 30
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(endData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('finalizada');
      expect(response.body.teleconsultation.status).toBe('COMPLETED');
      expect(response.body.teleconsultation.summary).toBe(endData.summary);
      expect(response.body.teleconsultation.duration).toBe(endData.duration);

      // Verificar en base de datos
      const teleconsultationInDb = await prisma.teleconsultations.findUnique({
        where: { id: teleconsultationId }
      });
      expect(teleconsultationInDb.status).toBe('COMPLETED');
      expect(teleconsultationInDb.endedAt).toBeTruthy();
    });

    it('debería rechazar finalización por paciente', async () => {
      // Arrange
      const endData = {
        summary: 'Paciente no puede finalizar'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(endData);

      // Assert
      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('debería rechazar finalización por médico no autorizado', async () => {
      // Arrange
      const { token: otherMedicToken } = await AuthTestUtils.createAndLoginMedic(app, prisma, {
        dni: '55555555'
      });

      const endData = {
        summary: 'No autorizado'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${otherMedicToken}`)
        .send(endData);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería validar que la teleconsulta está activa', async () => {
      // Arrange - Ya finalizada
      await prisma.teleconsultations.update({
        where: { id: teleconsultationId },
        data: { status: 'COMPLETED' }
      });

      const endData = {
        summary: 'Ya finalizada'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(endData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('activa');
    });

    it('debería actualizar el estado de la cita asociada', async () => {
      // Arrange
      const endData = {
        summary: 'Consulta completada',
        duration: 25
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultationId}/end`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(endData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);

      // Verificar que la cita se marcó como completada
      const appointmentInDb = await prisma.appointments.findUnique({
        where: { id: appointmentId }
      });
      expect(appointmentInDb.status).toBe('COMPLETED');
    });
  });

  describe('GET /teleconsultations', () => {
    beforeEach(async () => {
      // Crear varias teleconsultas de prueba
      await TestCleanupUtils.createTestTeleconsultations(prisma, medicDni, patientDni);
    });

    describe('Obtener Teleconsultas como Médico', () => {
      it('debería obtener teleconsultas del médico autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.teleconsultations).toBeDefined();
        expect(Array.isArray(response.body.teleconsultations)).toBe(true);
        
        // Verificar que todas las teleconsultas pertenecen al médico
        response.body.teleconsultations.forEach(teleconsultation => {
          expect(teleconsultation.appointment.medicDni).toBe(medicDni);
        });
      });

      it('debería incluir información de la cita y paciente', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.teleconsultations.length > 0) {
          const teleconsultation = response.body.teleconsultations[0];
          expect(teleconsultation.appointment).toBeDefined();
          expect(teleconsultation.appointment.patient).toBeDefined();
          expect(teleconsultation.appointment.patient.name).toBeDefined();
        }
      });

      it('debería filtrar por estado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations?status=ACTIVE')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.teleconsultations.forEach(teleconsultation => {
          expect(teleconsultation.status).toBe('ACTIVE');
        });
      });

      it('debería filtrar por fecha', async () => {
        // Arrange
        const today = new Date().toISOString().split('T')[0];

        // Act
        const response = await request(app.getHttpServer())
          .get(`/teleconsultations?date=${today}`)
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        response.body.teleconsultations.forEach(teleconsultation => {
          const teleconsultationDate = new Date(teleconsultation.startedAt).toISOString().split('T')[0];
          expect(teleconsultationDate).toBe(today);
        });
      });
    });

    describe('Obtener Teleconsultas como Paciente', () => {
      it('debería obtener teleconsultas del paciente autenticado', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.teleconsultations).toBeDefined();
        
        // Verificar que todas las teleconsultas pertenecen al paciente
        response.body.teleconsultations.forEach(teleconsultation => {
          expect(teleconsultation.appointment.patientDni).toBe(patientDni);
        });
      });

      it('debería incluir información del médico', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations')
          .set('Authorization', `Bearer ${patientToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.teleconsultations.length > 0) {
          const teleconsultation = response.body.teleconsultations[0];
          expect(teleconsultation.appointment.medic).toBeDefined();
          expect(teleconsultation.appointment.medic.name).toBeDefined();
        }
      });
    });

    describe('Paginación y Ordenamiento', () => {
      it('debería soportar paginación', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations?page=1&limit=2')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.teleconsultations.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination).toBeDefined();
      });

      it('debería ordenar por fecha descendente por defecto', async () => {
        // Act
        const response = await request(app.getHttpServer())
          .get('/teleconsultations')
          .set('Authorization', `Bearer ${medicToken}`);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        if (response.body.teleconsultations.length > 1) {
          const dates = response.body.teleconsultations.map(tc => new Date(tc.startedAt));
          for (let i = 1; i < dates.length; i++) {
            expect(dates[i].getTime()).toBeLessThanOrEqual(dates[i-1].getTime());
          }
        }
      });
    });
  });

  describe('GET /teleconsultations/:id', () => {
    let teleconsultationId: string;

    beforeEach(async () => {
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);
      teleconsultationId = teleconsultation.id;
    });

    it('debería obtener teleconsulta específica como médico', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/teleconsultations/${teleconsultationId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.teleconsultation).toBeDefined();
      expect(response.body.teleconsultation.id).toBe(teleconsultationId);
      expect(response.body.teleconsultation.appointment).toBeDefined();
    });

    it('debería obtener teleconsulta específica como paciente', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/teleconsultations/${teleconsultationId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.teleconsultation.id).toBe(teleconsultationId);
    });

    it('debería rechazar acceso no autorizado', async () => {
      // Arrange
      const { token: otherPatientToken } = await AuthTestUtils.createAndLoginPatient(app, prisma, {
        dni: '44444444'
      });

      // Act
      const response = await request(app.getHttpServer())
        .get(`/teleconsultations/${teleconsultationId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      // Assert
      expect(response.status).toBe(403);
    });

    it('debería retornar 404 para teleconsulta inexistente', async () => {
      // Arrange
      const fakeId = '999999999';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/teleconsultations/${fakeId}`)
        .set('Authorization', `Bearer ${medicToken}`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('WebRTC Signaling Endpoints', () => {
    let teleconsultationId: string;

    beforeEach(async () => {
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);
      teleconsultationId = teleconsultation.id;
    });

    describe('POST /teleconsultations/:id/webrtc/offer', () => {
      it('debería manejar oferta WebRTC', async () => {
        // Arrange
        const offerData = {
          offer: {
            type: 'offer',
            sdp: 'v=0\r\no=- 123456789 123456789 IN IP4 127.0.0.1\r\n...'
          },
          participantId: 'participant-123'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/webrtc/offer`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(offerData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('Oferta procesada');
      });

      it('debería validar formato de oferta SDP', async () => {
        // Arrange
        const invalidOfferData = {
          offer: {
            type: 'invalid',
            sdp: 'invalid-sdp'
          }
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/webrtc/offer`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(invalidOfferData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'offer');
      });
    });

    describe('POST /teleconsultations/:id/webrtc/answer', () => {
      it('debería manejar respuesta WebRTC', async () => {
        // Arrange
        const answerData = {
          answer: {
            type: 'answer',
            sdp: 'v=0\r\no=- 987654321 987654321 IN IP4 127.0.0.1\r\n...'
          },
          participantId: 'participant-456'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/webrtc/answer`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send(answerData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('Respuesta procesada');
      });
    });

    describe('POST /teleconsultations/:id/webrtc/ice-candidate', () => {
      it('debería manejar candidatos ICE', async () => {
        // Arrange
        const iceCandidateData = {
          candidate: {
            candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
            sdpMLineIndex: 0,
            sdpMid: '0'
          },
          participantId: 'participant-789'
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/webrtc/ice-candidate`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(iceCandidateData);

        // Assert
        TestValidationUtils.expectSuccess(response, 200);
        expect(response.body.message).toContain('Candidato ICE procesado');
      });

      it('debería validar formato de candidato ICE', async () => {
        // Arrange
        const invalidCandidateData = {
          candidate: {
            candidate: 'invalid-candidate'
          }
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultationId}/webrtc/ice-candidate`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send(invalidCandidateData);

        // Assert
        TestValidationUtils.expectValidationError(response, 'candidate');
      });
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    it('debería manejar múltiples teleconsultas simultáneas', async () => {
      // Arrange
      const appointments = [];
      for (let i = 0; i < 3; i++) {
        const appointment = await TestCleanupUtils.createSingleTestAppointment(prisma, medicDni, patientDni, {
          type: 'VIRTUAL'
        });
        appointments.push(appointment);
      }

      // Act
      const promises = appointments.map(appointment =>
        request(app.getHttpServer())
          .post('/teleconsultations/start')
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            appointmentId: appointment.id,
            platform: 'WEBRTC'
          })
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 201);
      });

      // Verificar que todas tienen roomId únicos
      const roomIds = responses.map(r => r.body.teleconsultation.roomId);
      const uniqueRoomIds = new Set(roomIds);
      expect(uniqueRoomIds.size).toBe(roomIds.length);
    });

    it('debería manejar desconexión inesperada', async () => {
      // Arrange
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);

      // Simular desconexión
      const disconnectData = {
        reason: 'NETWORK_ERROR',
        participantId: 'participant-123'
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/teleconsultations/${teleconsultation.id}/disconnect`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(disconnectData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.message).toContain('Desconexión registrada');
    });

    it('debería manejar teleconsulta sin participantes', async () => {
      // Arrange
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);

      // Simular timeout sin participantes
      const timeoutData = {
        reason: 'NO_PARTICIPANTS_TIMEOUT'
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultation.id}/timeout`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(timeoutData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.teleconsultation.status).toBe('CANCELLED');
    });

    it('debería manejar errores de plataforma externa', async () => {
      // Arrange
      const teleconsultationData = {
        appointmentId,
        platform: 'ZOOM' // Plataforma que podría fallar
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/teleconsultations/start')
        .set('Authorization', `Bearer ${medicToken}`)
        .send(teleconsultationData);

      // Assert
      // Debería manejar el error gracefully
      if (response.status >= 400) {
        expect(response.body.message).toContain('error');
      } else {
        TestValidationUtils.expectSuccess(response, 201);
      }
    });

    it('debería limpiar recursos al finalizar teleconsulta', async () => {
      // Arrange
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultation.id}/end`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send({
          summary: 'Consulta finalizada',
          duration: 20
        });

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      
      // Verificar que los recursos fueron liberados
      const teleconsultationInDb = await prisma.teleconsultations.findUnique({
        where: { id: teleconsultation.id }
      });
      expect(teleconsultationInDb.status).toBe('COMPLETED');
      expect(teleconsultationInDb.endedAt).toBeTruthy();
    });
  });

  describe('Rendimiento y Límites', () => {
    it('debería manejar múltiples participantes en WebRTC', async () => {
      // Arrange
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);
      const participants = ['medic-123', 'patient-456', 'observer-789'];

      // Act
      const promises = participants.map(participantId =>
        request(app.getHttpServer())
          .post(`/teleconsultations/${teleconsultation.id}/webrtc/ice-candidate`)
          .set('Authorization', `Bearer ${medicToken}`)
          .send({
            candidate: {
              candidate: `candidate:1 1 UDP 2130706431 192.168.1.${participantId.slice(-3)} 54400 typ host`,
              sdpMLineIndex: 0,
              sdpMid: '0'
            },
            participantId
          })
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        TestValidationUtils.expectSuccess(response, 200);
      });
    });

    it('debería manejar teleconsultas de larga duración', async () => {
      // Arrange
      const teleconsultation = await TestCleanupUtils.createTestTeleconsultation(prisma, appointmentId);

      // Simular teleconsulta de 2 horas
      const endData = {
        summary: 'Consulta de larga duración completada',
        duration: 120
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/teleconsultations/${teleconsultation.id}/end`)
        .set('Authorization', `Bearer ${medicToken}`)
        .send(endData);

      // Assert
      TestValidationUtils.expectSuccess(response, 200);
      expect(response.body.teleconsultation.duration).toBe(120);
    });
  });
});