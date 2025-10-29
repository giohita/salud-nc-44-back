import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseTestSetup {
  private static prisma: PrismaClient;
  private static testDatabaseUrl: string;

  /**
   * Inicializa la configuración de la base de datos de pruebas
   */
  static async initialize(): Promise<void> {
    try {
      // Configurar URL de base de datos de pruebas
      this.setupTestDatabaseUrl();
      
      // Crear cliente Prisma para pruebas
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.testDatabaseUrl
          }
        }
      });

      // Crear base de datos de pruebas si no existe
      await this.createTestDatabase();
      
      // Ejecutar migraciones
      await this.runMigrations();
      
      // Sembrar datos iniciales
      await this.seedInitialData();

      console.log('✅ Base de datos de pruebas configurada correctamente');
    } catch (error) {
      console.error('❌ Error configurando base de datos de pruebas:', error);
      throw error;
    }
  }

  /**
   * Limpia completamente la base de datos de pruebas
   */
  static async cleanup(): Promise<void> {
    try {
      if (!this.prisma) {
        return;
      }

      // Limpiar todas las tablas en orden correcto (respetando foreign keys)
      await this.prisma.teleconsultations.deleteMany();
      await this.prisma.clinicalRecords.deleteMany();
      await this.prisma.appointments.deleteMany();
      await this.prisma.fhirSyncLog.deleteMany();
      await this.prisma.refreshTokens.deleteMany();
      await this.prisma.users.deleteMany();

      console.log('🧹 Base de datos de pruebas limpiada');
    } catch (error) {
      console.error('❌ Error limpiando base de datos:', error);
      throw error;
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  static async close(): Promise<void> {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        console.log('🔌 Conexión a base de datos cerrada');
      }
    } catch (error) {
      console.error('❌ Error cerrando conexión:', error);
    }
  }

  /**
   * Resetea completamente la base de datos (limpia y vuelve a sembrar)
   */
  static async reset(): Promise<void> {
    try {
      await this.cleanup();
      await this.seedInitialData();
      console.log('🔄 Base de datos reseteada');
    } catch (error) {
      console.error('❌ Error reseteando base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtiene el cliente Prisma para pruebas
   */
  static getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Base de datos de pruebas no inicializada. Llama a initialize() primero.');
    }
    return this.prisma;
  }

  /**
   * Configura la URL de la base de datos de pruebas
   */
  private static setupTestDatabaseUrl(): void {
    const originalUrl = process.env.DATABASE_URL;
    
    if (!originalUrl) {
      throw new Error('DATABASE_URL no está configurada');
    }

    // Crear URL de base de datos de pruebas
    if (originalUrl.includes('postgresql://')) {
      // PostgreSQL
      this.testDatabaseUrl = originalUrl.replace(/\/([^\/]+)(\?|$)/, '/test_$1$2');
    } else if (originalUrl.includes('mysql://')) {
      // MySQL
      this.testDatabaseUrl = originalUrl.replace(/\/([^\/]+)(\?|$)/, '/test_$1$2');
    } else if (originalUrl.startsWith('file:')) {
      // SQLite
      const dbPath = originalUrl.replace('file:', '');
      const dir = path.dirname(dbPath);
      const filename = path.basename(dbPath, '.db');
      this.testDatabaseUrl = `file:${path.join(dir, `${filename}_test.db`)}`;
    } else {
      throw new Error('Tipo de base de datos no soportado para pruebas');
    }

    // Configurar variable de entorno para Prisma
    process.env.DATABASE_URL = this.testDatabaseUrl;
    
    console.log(`🗄️  Base de datos de pruebas: ${this.testDatabaseUrl}`);
  }

  /**
   * Crea la base de datos de pruebas si no existe
   */
  private static async createTestDatabase(): Promise<void> {
    try {
      if (this.testDatabaseUrl.startsWith('file:')) {
        // Para SQLite, el archivo se crea automáticamente
        return;
      }

      // Para PostgreSQL/MySQL, crear base de datos si no existe
      const url = new URL(this.testDatabaseUrl);
      const dbName = url.pathname.slice(1);
      
      // Conectar sin especificar base de datos
      const adminUrl = this.testDatabaseUrl.replace(`/${dbName}`, '/postgres');
      
      const { PrismaClient: AdminPrismaClient } = require('@prisma/client');
      const adminPrisma = new AdminPrismaClient({
        datasources: {
          db: { url: adminUrl }
        }
      });

      try {
        await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
        console.log(`📊 Base de datos de pruebas '${dbName}' creada`);
      } catch (error) {
        // Base de datos ya existe
        if (!error.message.includes('already exists')) {
          throw error;
        }
      } finally {
        await adminPrisma.$disconnect();
      }
    } catch (error) {
      console.warn('⚠️  No se pudo crear base de datos de pruebas:', error.message);
    }
  }

  /**
   * Ejecuta las migraciones de Prisma
   */
  private static async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Ejecutando migraciones...');
      
      // Ejecutar migraciones usando Prisma CLI
      execSync('npx prisma migrate deploy', {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: this.testDatabaseUrl
        }
      });
      
      console.log('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
      console.error('❌ Error ejecutando migraciones:', error);
      
      // Intentar generar el cliente Prisma
      try {
        execSync('npx prisma generate', { stdio: 'pipe' });
        console.log('✅ Cliente Prisma generado');
      } catch (generateError) {
        console.error('❌ Error generando cliente Prisma:', generateError);
      }
      
      throw error;
    }
  }

  /**
   * Siembra datos iniciales para las pruebas
   */
  private static async seedInitialData(): Promise<void> {
    try {
      console.log('🌱 Sembrando datos iniciales...');

      // Crear usuario administrador de pruebas
      await this.prisma.users.upsert({
        where: { dni: '00000000' },
        update: {},
        create: {
          dni: '00000000',
          name: 'Admin Test',
          email: 'admin.test@hospital.com',
          password: '$2b$10$test.hash.for.admin.user.password',
          userType: 'ADMIN',
          phone: '000-000-0000',
          address: 'Test Admin Address',
          gender: 'MASCULINO',
          birthDate: new Date('1980-01-01'),
          isActive: true
        }
      });

      // Crear médico de pruebas
      await this.prisma.users.upsert({
        where: { dni: '11111111' },
        update: {},
        create: {
          dni: '11111111',
          name: 'Dr. Test Medic',
          email: 'medic.test@hospital.com',
          password: '$2b$10$test.hash.for.medic.user.password',
          userType: 'MEDIC',
          phone: '111-111-1111',
          address: 'Test Medic Address',
          gender: 'MASCULINO',
          birthDate: new Date('1975-05-15'),
          specialty: 'Medicina General',
          licenseNumber: 'LIC-TEST-001',
          isActive: true
        }
      });

      // Crear paciente de pruebas
      await this.prisma.users.upsert({
        where: { dni: '22222222' },
        update: {},
        create: {
          dni: '22222222',
          name: 'Patient Test',
          email: 'patient.test@email.com',
          password: '$2b$10$test.hash.for.patient.user.password',
          userType: 'PATIENT',
          phone: '222-222-2222',
          address: 'Test Patient Address',
          gender: 'FEMENINO',
          birthDate: new Date('1990-10-20'),
          emergencyContact: 'Emergency Contact Test',
          emergencyPhone: '222-222-2223',
          isActive: true
        }
      });

      console.log('✅ Datos iniciales sembrados correctamente');
    } catch (error) {
      console.error('❌ Error sembrando datos iniciales:', error);
      throw error;
    }
  }

  /**
   * Crea datos de prueba específicos para un test
   */
  static async createTestData(testName: string): Promise<any> {
    try {
      console.log(`🧪 Creando datos de prueba para: ${testName}`);

      const testData = {
        admin: await this.prisma.users.findUnique({ where: { dni: '00000000' } }),
        medic: await this.prisma.users.findUnique({ where: { dni: '11111111' } }),
        patient: await this.prisma.users.findUnique({ where: { dni: '22222222' } })
      };

      return testData;
    } catch (error) {
      console.error(`❌ Error creando datos de prueba para ${testName}:`, error);
      throw error;
    }
  }

  /**
   * Limpia datos específicos de un test
   */
  static async cleanupTestData(testName: string): Promise<void> {
    try {
      console.log(`🧹 Limpiando datos de prueba para: ${testName}`);
      
      // Limpiar solo datos creados durante el test, mantener datos base
      await this.prisma.teleconsultations.deleteMany({
        where: {
          appointment: {
            OR: [
              { medicDni: { not: '11111111' } },
              { patientDni: { not: '22222222' } }
            ]
          }
        }
      });

      await this.prisma.clinicalRecords.deleteMany({
        where: {
          OR: [
            { medicDni: { not: '11111111' } },
            { patientDni: { not: '22222222' } }
          ]
        }
      });

      await this.prisma.appointments.deleteMany({
        where: {
          OR: [
            { medicDni: { not: '11111111' } },
            { patientDni: { not: '22222222' } }
          ]
        }
      });

      await this.prisma.users.deleteMany({
        where: {
          dni: {
            notIn: ['00000000', '11111111', '22222222']
          }
        }
      });

    } catch (error) {
      console.error(`❌ Error limpiando datos de prueba para ${testName}:`, error);
    }
  }

  /**
   * Verifica el estado de la base de datos
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Health check falló:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de la base de datos de pruebas
   */
  static async getStats(): Promise<any> {
    try {
      const stats = {
        users: await this.prisma.users.count(),
        appointments: await this.prisma.appointments.count(),
        clinicalRecords: await this.prisma.clinicalRecords.count(),
        teleconsultations: await this.prisma.teleconsultations.count(),
        refreshTokens: await this.prisma.refreshTokens.count()
      };

      console.log('📊 Estadísticas de base de datos de pruebas:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Crea un backup de la base de datos de pruebas
   */
  static async createBackup(backupName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = backupName || `test-db-backup-${timestamp}.json`;
      const backupPath = path.join(__dirname, 'backups', backupFileName);

      // Crear directorio de backups si no existe
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Exportar datos
      const data = {
        users: await this.prisma.users.findMany(),
        appointments: await this.prisma.appointments.findMany(),
        clinicalRecords: await this.prisma.clinicalRecords.findMany(),
        teleconsultations: await this.prisma.teleconsultations.findMany(),
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      console.log(`💾 Backup creado: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }

  /**
   * Restaura un backup de la base de datos
   */
  static async restoreBackup(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup no encontrado: ${backupPath}`);
      }

      const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Limpiar base de datos
      await this.cleanup();

      // Restaurar datos
      if (data.users) {
        await this.prisma.users.createMany({ data: data.users });
      }
      if (data.appointments) {
        await this.prisma.appointments.createMany({ data: data.appointments });
      }
      if (data.clinicalRecords) {
        await this.prisma.clinicalRecords.createMany({ data: data.clinicalRecords });
      }
      if (data.teleconsultations) {
        await this.prisma.teleconsultations.createMany({ data: data.teleconsultations });
      }

      console.log(`📥 Backup restaurado desde: ${backupPath}`);
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      throw error;
    }
  }
}