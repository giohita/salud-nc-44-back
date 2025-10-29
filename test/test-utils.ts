import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Tipos para datos de prueba
export interface TestUser {
  id?: number;
  dni: string;
  email: string;
  password: string;
  name: string;
  lastname: string;
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
  phone_number?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthdate?: string;
  specialty?: string;
  schedule?: string;
}

export interface TestAppointment {
  patientId: number;
  medicId: number;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface TestClinicalRecord {
  patientId: number;
  medicId: number;
  diagnosis: string;
  treatment: string;
  notes?: string;
  symptoms?: string;
  vitalSigns?: string;
}

// Clase para manejar la aplicación de pruebas
export class TestApp {
  public app: INestApplication;
  public prisma: PrismaService;
  private moduleFixture: TestingModule;

  async initialize(): Promise<void> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();
    this.prisma = this.app.get<PrismaService>(PrismaService);
    
    await this.app.init();
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }
}

// Factory para crear usuarios de prueba
export class TestUserFactory {
  static createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return {
      dni: '12345678',
      email: 'admin@test.com',
      password: 'admin123456',
      name: 'Admin',
      lastname: 'Test',
      userType: 'ADMIN',
      phone_number: '555-0001',
      gender: 'MALE',
      ...overrides
    };
  }

  static createMedic(overrides: Partial<TestUser> = {}): TestUser {
    return {
      dni: '87654321',
      email: 'medic@test.com',
      password: 'medic123456',
      name: 'Dr. María',
      lastname: 'González',
      userType: 'MEDIC',
      phone_number: '555-0002',
      gender: 'FEMALE',
      birthdate: '1985-03-15',
      specialty: 'Cardiología',
      schedule: 'Lunes a Viernes 8:00-16:00',
      ...overrides
    };
  }

  static createPatient(overrides: Partial<TestUser> = {}): TestUser {
    return {
      dni: '11223344',
      email: 'patient@test.com',
      password: 'patient123456',
      name: 'Juan',
      lastname: 'Pérez',
      userType: 'PATIENT',
      phone_number: '555-0003',
      gender: 'MALE',
      birthdate: '1990-05-20',
      ...overrides
    };
  }
}

// Factory para crear citas de prueba
export class TestAppointmentFactory {
  static create(overrides: Partial<TestAppointment> = {}): TestAppointment {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      patientId: 1,
      medicId: 1,
      appointmentDate: tomorrow.toISOString().split('T')[0],
      appointmentTime: '10:00',
      appointmentType: 'Consulta General',
      status: 'SCHEDULED',
      notes: 'Consulta de rutina',
      ...overrides
    };
  }
}

// Factory para crear registros clínicos de prueba
export class TestClinicalRecordFactory {
  static create(overrides: Partial<TestClinicalRecord> = {}): TestClinicalRecord {
    return {
      patientId: 1,
      medicId: 1,
      diagnosis: 'Hipertensión arterial',
      treatment: 'Medicamento antihipertensivo',
      notes: 'Paciente responde bien al tratamiento',
      symptoms: 'Dolor de cabeza ocasional',
      vitalSigns: 'PA: 140/90, FC: 80, Temp: 36.5°C',
      ...overrides
    };
  }
}

// Utilidades de autenticación
export class AuthTestUtils {
  static async loginUser(app: INestApplication, credentials: { dni: string; password: string }) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    return response.body.access_token;
  }

  static async createAndLoginAdmin(app: INestApplication, prisma: PrismaService): Promise<{ user: any; token: string }> {
    const adminData = TestUserFactory.createAdmin();
    const user = await this.createUserInDatabase(prisma, adminData);
    const token = await this.loginUser(app, { dni: adminData.dni, password: adminData.password });
    
    return { user, token };
  }

  static async createAndLoginMedic(app: INestApplication, prisma: PrismaService): Promise<{ user: any; token: string }> {
    const medicData = TestUserFactory.createMedic();
    const user = await this.createUserInDatabase(prisma, medicData);
    const token = await this.loginUser(app, { dni: medicData.dni, password: medicData.password });
    
    return { user, token };
  }

  static async createAndLoginPatient(app: INestApplication, prisma: PrismaService): Promise<{ user: any; token: string }> {
    const patientData = TestUserFactory.createPatient();
    const user = await this.createUserInDatabase(prisma, patientData);
    const token = await this.loginUser(app, { dni: patientData.dni, password: patientData.password });
    
    return { user, token };
  }

  private static async createUserInDatabase(prisma: PrismaService, userData: TestUser) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Crear usuario base
    const user = await prisma.users.create({
      data: {
        DNI: userData.dni,
        passwordHash: hashedPassword,
        userType: userData.userType
      }
    });

    // Crear registro específico según tipo de usuario
    let specificUser;
    switch (userData.userType) {
      case 'ADMIN':
        specificUser = await prisma.admins.create({
          data: {
            DNI: userData.dni,
            Name: userData.name,
            Lastname: userData.lastname,
            Email: userData.email,
            Phone_number: userData.phone_number,
            gender: userData.gender
          }
        });
        break;
      
      case 'MEDIC':
        specificUser = await prisma.medics.create({
          data: {
            DNI: userData.dni,
            name: userData.name,
            lastname: userData.lastname,
            email: userData.email,
            phone_number: userData.phone_number,
            gender: userData.gender,
            birthdate: userData.birthdate ? new Date(userData.birthdate) : undefined,
            specialty: userData.specialty,
            schedule: userData.schedule
          }
        });
        break;
      
      case 'PATIENT':
        specificUser = await prisma.patients.create({
          data: {
            DNI: userData.dni,
            name: userData.name,
            lastname: userData.lastname,
            email: userData.email,
            phone_number: userData.phone_number,
            gender: userData.gender,
            birthdate: userData.birthdate ? new Date(userData.birthdate) : undefined
          }
        });
        break;
    }

    return { user, specificUser };
  }
}

// Utilidades para validaciones comunes
export class TestValidationUtils {
  static expectValidationError(response: any, field: string) {
    expect(response.status).toBe(400);
    expect(response.body.message).toContain(field);
  }

  static expectUnauthorized(response: any) {
    expect(response.status).toBe(401);
  }

  static expectNotFound(response: any) {
    expect(response.status).toBe(404);
  }

  static expectSuccess(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }
}

// Utilidades para limpiar datos específicos
export class TestCleanupUtils {
  static async cleanupUsers(prisma: PrismaService) {
    await prisma.patients.deleteMany();
    await prisma.medics.deleteMany();
    await prisma.admins.deleteMany();
    await prisma.users.deleteMany();
  }

  static async cleanupAppointments(prisma: PrismaService) {
    await prisma.appointments.deleteMany();
  }

  static async cleanupClinicalRecords(prisma: PrismaService) {
    await prisma.clinical_data.deleteMany();
  }

  static async cleanupTeleconsultations(prisma: PrismaService) {
    await prisma.teleconsultation_sessions.deleteMany();
  }

  /**
   * Limpia todas las tablas de la base de datos
   */
  static async cleanupAll(prisma: PrismaService): Promise<void> {
    // Limpiar en orden correcto para evitar errores de foreign key
    await prisma.teleconsultations.deleteMany();
    await prisma.refreshTokens.deleteMany();
    await prisma.clinicalRecords.deleteMany();
    await prisma.appointments.deleteMany();
    await prisma.fhirSyncLog.deleteMany();
    await prisma.users.deleteMany();
  }

  /**
   * Crea una cita de prueba
   */
  static async createSingleTestAppointment(
    prisma: PrismaService,
    medicDni: string,
    patientDni: string,
    overrides: Partial<any> = {}
  ): Promise<any> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return await prisma.appointments.create({
      data: {
        medicDni,
        patientDni,
        date: tomorrow,
        time: '10:00',
        type: 'PRESENCIAL',
        status: 'SCHEDULED',
        reason: 'Consulta de prueba',
        ...overrides
      }
    });
  }

  /**
   * Crea múltiples citas de prueba
   */
  static async createMultipleTestAppointments(
    prisma: PrismaService,
    medicDni: string,
    patientDni: string,
    count: number = 3
  ): Promise<any[]> {
    const appointments = [];
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      date.setHours(10 + i, 0, 0, 0);

      const appointment = await prisma.appointments.create({
        data: {
          medicDni,
          patientDni,
          date,
          time: `${10 + i}:00`,
          type: i % 2 === 0 ? 'PRESENCIAL' : 'VIRTUAL',
          status: 'SCHEDULED',
          reason: `Consulta de prueba ${i + 1}`
        }
      });
      
      appointments.push(appointment);
    }
    
    return appointments;
  }

  /**
   * Crea una teleconsulta de prueba
   */
  static async createTestTeleconsultation(
    prisma: PrismaService,
    appointmentId: string,
    overrides: Partial<any> = {}
  ): Promise<any> {
    return await prisma.teleconsultations.create({
      data: {
        appointmentId,
        platform: 'WEBRTC',
        status: 'ACTIVE',
        meetingLink: `https://test-meeting.com/room/${appointmentId}`,
        roomId: `room-${appointmentId}`,
        startedAt: new Date(),
        ...overrides
      }
    });
  }

  /**
   * Crea múltiples teleconsultas de prueba
   */
  static async createTestTeleconsultations(
    prisma: PrismaService,
    medicDni: string,
    patientDni: string,
    count: number = 3
  ): Promise<any[]> {
    const teleconsultations = [];
    
    // Crear citas virtuales primero
    const appointments = await this.createMultipleTestAppointments(prisma, medicDni, patientDni, count);
    
    for (const appointment of appointments) {
      // Solo crear teleconsultas para citas virtuales
      if (appointment.type === 'VIRTUAL') {
        const teleconsultation = await this.createTestTeleconsultation(prisma, appointment.id);
        teleconsultations.push(teleconsultation);
      }
    }
    
    return teleconsultations;
  }

  /**
   * Crea un registro clínico de prueba
   */
  static async createTestClinicalRecord(
    prisma: PrismaService,
    medicDni: string,
    patientDni: string,
    overrides: Partial<any> = {}
  ): Promise<any> {
    return await prisma.clinicalRecords.create({
      data: {
        medicDni,
        patientDni,
        diagnosis: 'Diagnóstico de prueba',
        treatment: 'Tratamiento de prueba',
        notes: 'Notas de prueba',
        date: new Date(),
        ...overrides
      }
    });
  }

  /**
   * Crea múltiples registros clínicos de prueba
   */
  static async createMultipleTestClinicalRecords(
    prisma: PrismaService,
    medicDni: string,
    patientDni: string,
    count: number = 3
  ): Promise<any[]> {
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const record = await this.createTestClinicalRecord(prisma, medicDni, patientDni, {
        diagnosis: `Diagnóstico ${i + 1}`,
        treatment: `Tratamiento ${i + 1}`,
        notes: `Notas del registro ${i + 1}`,
        date
      });
      
      records.push(record);
    }
    
    return records;
  }

  /**
   * Crea datos de prueba FHIR
   */
  static async createTestFhirData(
    prisma: PrismaService,
    patientDni: string,
    overrides: Partial<any> = {}
  ): Promise<any> {
    return await prisma.fhirSyncLog.create({
      data: {
        patientDni,
        resourceType: 'Patient',
        fhirId: `patient-${patientDni}`,
        operation: 'CREATE',
        status: 'SUCCESS',
        syncedAt: new Date(),
        ...overrides
      }
    });
  }
}