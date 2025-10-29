import { PrismaClient } from '@prisma/client';

// Configuración global para pruebas E2E
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || 'file:./test.db'
    }
  }
});

// Setup global antes de todas las pruebas
beforeAll(async () => {
  // Limpiar base de datos de pruebas
  await cleanDatabase();
  
  // Configurar datos de prueba base si es necesario
  await seedTestData();
});

// Cleanup después de todas las pruebas
afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

// Limpiar base de datos entre pruebas
beforeEach(async () => {
  // Opcional: limpiar datos específicos entre pruebas
});

// Función para limpiar la base de datos
async function cleanDatabase() {
  try {
    // Eliminar en orden para respetar foreign keys
    await prisma.appointments.deleteMany();
    await prisma.clinical_data.deleteMany();
    await prisma.teleconsultation_sessions.deleteMany();
    await prisma.refresh_tokens.deleteMany();
    await prisma.patients.deleteMany();
    await prisma.medics.deleteMany();
    await prisma.admins.deleteMany();
    await prisma.users.deleteMany();
  } catch (error) {
    console.warn('Error limpiando base de datos:', error);
  }
}

// Función para crear datos de prueba base
async function seedTestData() {
  try {
    // Crear usuarios de prueba básicos si es necesario
    // Esto se puede personalizar según las necesidades de las pruebas
  } catch (error) {
    console.warn('Error creando datos de prueba:', error);
  }
}

// Exportar utilidades para usar en las pruebas
export { prisma, cleanDatabase, seedTestData };

// Configuración de timeouts globales
jest.setTimeout(30000);

// Configurar variables de entorno para pruebas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-tests';
process.env.JWT_EXPIRES_IN = '1h';