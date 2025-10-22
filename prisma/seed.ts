import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Verificar si ya existe un admin
  const existingAdmin = await prisma.admins.findFirst();
  
  if (existingAdmin) {
    console.log('✅ Ya existe un administrador en la base de datos');
    console.log(`Admin existente: ${existingAdmin.Name} ${existingAdmin.Lastname} (DNI: ${existingAdmin.DNI})`);
    return;
  }

  // Crear admin inicial
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('admin123', saltRounds);

  const admin = await prisma.admins.create({
    data: {
      DNI: '12345678',
      Name: 'Admin',
      Lastname: 'Sistema',
      Email: 'admin@hospital.com',
      passwordHash,
      Phone_number: '+57300123456',
    },
  });

  console.log('✅ Admin inicial creado exitosamente:');
  console.log(`   Nombre: ${admin.Name} ${admin.Lastname}`);
  console.log(`   DNI: ${admin.DNI}`);
  console.log(`   Email: ${admin.Email}`);
  console.log(`   Contraseña: admin123`);
  console.log('');
  console.log('🔑 Puedes usar estas credenciales para hacer login:');
  console.log('   DNI: 12345678');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });