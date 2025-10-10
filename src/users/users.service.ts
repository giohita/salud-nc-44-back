// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type FoundUser = {
  id: number;
  dni: string;
  passwordHash: string;
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
  email?: string;
  name?: string;
  lastname?: string;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByDni(dni: string): Promise<FoundUser | null> {
    // Admin
    const admin = await this.prisma.admins.findUnique({ where: { DNI: dni } });
    if (admin) {
      return {
        id: admin.ID_Admins,
        dni: admin.DNI,
        passwordHash: admin.passwordHash,
        userType: 'ADMIN',
        email: admin.Email,
        name: admin.Name,
        lastname: admin.Lastname,
      };
    }

    // Médico
    const medic = await this.prisma.medics.findUnique({ where: { DNI: dni } });
    if (medic) {
      return {
        id: medic.ID_medics,
        dni: medic.DNI,
        passwordHash: medic.passwordHash,
        userType: 'MEDIC',
        email: medic.email,
        name: medic.Name,
        lastname: medic.Lastname,
      };
    }

    // Paciente
    const patient = await this.prisma.patients.findUnique({ where: { DNI: dni } });
    if (patient) {
      return {
        id: patient.ID_Patients,
        dni: patient.DNI,
        passwordHash: patient.passwordHash,
        userType: 'PATIENT',
        email: patient.email,
        name: patient.Name,
        lastname: patient.Lastname,
      };
    }

    return null;
  }
}
