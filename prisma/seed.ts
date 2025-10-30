import { PrismaClient, Gender, Admins, Patients, Medics, Clinical_data } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // 🧑‍💼 Admins (10)
  const admins: Admins[] = [];
  for (let i = 1; i <= 10; i++) {
    const admin = await prisma.admins.create({
      data: {
        Name: `Admin${i}`,
        Lastname: `Lastname${i}`,
        Email: `admin2${i}@mail.com`,
        passwordHash: await bcrypt.hash(`adminpass${i}`, 10),
        DNI: `5000000${i}`,
        Phone_number: `555-000${i}`,
      },
    });
    console.log(`✅ Admin creado: ${admin.Name}`);
    admins.push(admin);
  }

  // 🩺 Medics (25)
  const medics: Medics[] = [];
  for (let i = 1; i <= 25; i++) {
    const medic = await prisma.medics.create({
      data: {
        DNI: `8000000${i}`,
        Name: `Medic${i}`,
        Lastname: `Lastname${i}`,
        Birthdate: new Date(`1980-${(i % 12) + 1}-15`),
        gender: i % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        email: `medic2${i}@mail.com`,
        passwordHash: await bcrypt.hash(`medicpass${i}`, 10),
        specialty: `Especialidad ${((i - 1) % 10) + 1}`,
        create: admins[i % admins.length].ID_Admins,
      },
    });
    console.log(`✅ Médico creado: ${medic.Name}`);
    medics.push(medic);
  }

  // 👨‍⚕️ Patients (10)
  const patients: Patients[] = [];
  for (let i = 1; i <= 10; i++) {
    const patient = await prisma.patients.create({
      data: {
        DNI: `7000000${i}`,
        Name: `Patient${i}`,
        Lastname: `Lastname${i}`,
        Birthdate: new Date(`1990-${(i % 12) + 1}-10`),
        gender: i % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        email: `patient2${i}@mail.com`,
        passwordHash: await bcrypt.hash(`patientpass${i}`, 10),
        address: `Calle Falsa ${i}`,
        create: admins[i % admins.length].ID_Admins,
      },
    });
    console.log(`✅ Paciente creado: ${patient.Name}`);
    patients.push(patient);
  }

  // 🩺 Crear historias clínicas
  const clinicalRecords: Clinical_data[] = [];
  for (const patient of patients) {
    const medic = medics[Math.floor(Math.random() * medics.length)];
    for (let j = 1; j <= 3; j++) {
      const record = await prisma.clinical_data.create({
        data: {
          ID_Patients: patient.ID_Patients,
          type: `Examen de prueba ${j}`,
          code: `CODE${j}`,
          value: `${Math.floor(Math.random() * 100)}`,
          unit: "mg/dL",
          severity: j % 2 === 0 ? "Moderada" : "Leve",
          effectiveDate: new Date(),
          fhirData: { note: `Historial clínico de prueba ${j}` },
          ID_medics: medic.ID_medics,
          create: admins[0].ID_Admins,
        },
      });
      console.log(`📄 Historial clínico creado para paciente ${patient.Name}: ${record.type}`);
      clinicalRecords.push(record);
    }
  }

  console.log("🌟 Seed completado");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
