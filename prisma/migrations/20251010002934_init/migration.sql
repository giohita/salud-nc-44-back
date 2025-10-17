-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Admins" (
    "ID_Admins" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Lastname" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "Phone_number" TEXT,
    "DNI" TEXT NOT NULL,

    CONSTRAINT "Admins_pkey" PRIMARY KEY ("ID_Admins")
);

-- CreateTable
CREATE TABLE "Medics" (
    "ID_medics" SERIAL NOT NULL,
    "DNI" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Lastname" TEXT NOT NULL,
    "Birthdate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone_number" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "specialty" TEXT,
    "schedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "create" INTEGER NOT NULL,

    CONSTRAINT "Medics_pkey" PRIMARY KEY ("ID_medics")
);

-- CreateTable
CREATE TABLE "Patients" (
    "ID_Patients" SERIAL NOT NULL,
    "DNI" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Lastname" TEXT NOT NULL,
    "Birthdate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone_number" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "create" INTEGER NOT NULL,

    CONSTRAINT "Patients_pkey" PRIMARY KEY ("ID_Patients")
);

-- CreateTable
CREATE TABLE "Appointments" (
    "ID_Appointments" SERIAL NOT NULL,
    "ID_Patients" INTEGER NOT NULL,
    "ID_medics" INTEGER NOT NULL,
    "appointmentType" TEXT NOT NULL,
    "appointmentDatetime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointments_pkey" PRIMARY KEY ("ID_Appointments")
);

-- CreateTable
CREATE TABLE "Clinical_data" (
    "ID_Clinical_data" SERIAL NOT NULL,
    "ID_Patients" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "value" TEXT,
    "unit" TEXT,
    "severity" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "fhirData" JSONB,
    "ID_medics" INTEGER NOT NULL,
    "create" INTEGER NOT NULL,

    CONSTRAINT "Clinical_data_pkey" PRIMARY KEY ("ID_Clinical_data")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admins_Email_key" ON "Admins"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "Admins_DNI_key" ON "Admins"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "Medics_DNI_key" ON "Medics"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "Medics_email_key" ON "Medics"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patients_DNI_key" ON "Patients"("DNI");

-- CreateIndex
CREATE UNIQUE INDEX "Patients_email_key" ON "Patients"("email");

-- AddForeignKey
ALTER TABLE "Medics" ADD CONSTRAINT "Medics_create_fkey" FOREIGN KEY ("create") REFERENCES "Admins"("ID_Admins") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patients" ADD CONSTRAINT "Patients_create_fkey" FOREIGN KEY ("create") REFERENCES "Admins"("ID_Admins") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_ID_Patients_fkey" FOREIGN KEY ("ID_Patients") REFERENCES "Patients"("ID_Patients") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_ID_medics_fkey" FOREIGN KEY ("ID_medics") REFERENCES "Medics"("ID_medics") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinical_data" ADD CONSTRAINT "Clinical_data_create_fkey" FOREIGN KEY ("create") REFERENCES "Admins"("ID_Admins") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinical_data" ADD CONSTRAINT "Clinical_data_ID_Patients_fkey" FOREIGN KEY ("ID_Patients") REFERENCES "Patients"("ID_Patients") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinical_data" ADD CONSTRAINT "Clinical_data_ID_medics_fkey" FOREIGN KEY ("ID_medics") REFERENCES "Medics"("ID_medics") ON DELETE RESTRICT ON UPDATE CASCADE;
