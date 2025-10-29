// src/users/users.service.ts
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

export type FoundUser = {
  id: number;
  dni: string;
  passwordHash: string;
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
  email?: string;
  name?: string;
  lastname?: string;
  gender?: string;
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
        gender: medic.gender,
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
        gender: patient.gender,
      };
    }

    return null;
  }

  async createUser(createUserDto: CreateUserDto): Promise<FoundUser> {
    const { userType, password, ...userData } = createUserDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.findByDni(userData.DNI);
    if (existingUser) {
      throw new ConflictException('Usuario con este DNI ya existe');
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      switch (userType) {
        case 'ADMIN':
          const admin = await this.prisma.admins.create({
            data: {
              DNI: userData.DNI,
              Name: userData.Name,
              Lastname: userData.Lastname,
              Email: userData.Email || userData.email || '',
              passwordHash,
              Phone_number: userData.Phone_number || userData.phone_number,
            },
          });
          return {
            id: admin.ID_Admins,
            dni: admin.DNI,
            passwordHash: admin.passwordHash,
            userType: 'ADMIN',
            email: admin.Email,
            name: admin.Name,
            lastname: admin.Lastname,
          };

        case 'MEDIC':
          if (!userData.gender || !userData.Birthdate) {
            throw new BadRequestException('Gender y Birthdate son requeridos para médicos');
          }
          
          // Necesitamos un admin ID para la relación
          const firstAdmin = await this.prisma.admins.findFirst();
          if (!firstAdmin) {
            throw new BadRequestException('No hay administradores en el sistema para crear el médico');
          }

          const medic = await this.prisma.medics.create({
            data: {
              DNI: userData.DNI,
              Name: userData.Name,
              Lastname: userData.Lastname,
              email: userData.email || userData.Email || '',
              passwordHash,
              phone_number: userData.phone_number || userData.Phone_number,
              gender: userData.gender,
              Birthdate: new Date(userData.Birthdate),
              specialty: userData.specialty,
              schedule: userData.schedule,
              create: firstAdmin.ID_Admins,
            },
          });
          return {
            id: medic.ID_medics,
            dni: medic.DNI,
            passwordHash: medic.passwordHash,
            userType: 'MEDIC',
            email: medic.email,
            name: medic.Name,
            lastname: medic.Lastname,
            gender: medic.gender,
          };

        case 'PATIENT':
          if (!userData.gender || !userData.Birthdate) {
            throw new BadRequestException('Gender y Birthdate son requeridos para pacientes');
          }
          
          // Necesitamos un admin ID para la relación
          const adminForPatient = await this.prisma.admins.findFirst();
          if (!adminForPatient) {
            throw new BadRequestException('No hay administradores en el sistema para crear el paciente');
          }

          const patient = await this.prisma.patients.create({
            data: {
              DNI: userData.DNI,
              Name: userData.Name,
              Lastname: userData.Lastname,
              email: userData.email || userData.Email || '',
              passwordHash,
              phone_number: userData.phone_number || userData.Phone_number,
              gender: userData.gender,
              Birthdate: new Date(userData.Birthdate),
              address: userData.address,
              create: adminForPatient.ID_Admins,
            },
          });
          return {
            id: patient.ID_Patients,
            dni: patient.DNI,
            passwordHash: patient.passwordHash,
            userType: 'PATIENT',
            email: patient.email,
            name: patient.Name,
            lastname: patient.Lastname,
            gender: patient.gender,
          };

        default:
          throw new BadRequestException('Tipo de usuario no válido');
      }
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Usuario con este DNI ya existe');
      }
      throw error;
    }
  }
}
