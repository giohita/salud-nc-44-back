import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { Email, password, userType, gender, ...userData } = createUserDto;
    
    // Verificar si el email ya existe
    const existingUser = await this.prisma.admins.findFirst({
      where: { Email },
    }) || await this.prisma.medics.findFirst({
      where: { email: Email },
    }) || await this.prisma.patients.findFirst({
      where: { email: Email },
    });

    if (existingUser) {
      throw new ConflictException(`El email ${Email} ya está registrado`);
    }

    // Verificar si el DNI ya existe
    const existingDNI = await this.prisma.admins.findFirst({
      where: { DNI: userData.DNI },
    }) || await this.prisma.medics.findFirst({
      where: { DNI: userData.DNI },
    }) || await this.prisma.patients.findFirst({
      where: { DNI: userData.DNI },
    });

    if (existingDNI) {
      throw new ConflictException(`El DNI ${userData.DNI} ya está registrado`);
    }

    // Verificar que gender esté presente para MEDIC y PATIENT
    if ((userType === 'MEDIC' || userType === 'PATIENT') && !gender) {
      throw new BadRequestException('El campo gender es obligatorio para médicos y pacientes');
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let user;
    
    try {
      // Obtener el ID del admin actual
      const adminId = 2; // Usamos el ID del admin por defecto (el que se crea en init-admin.js)
      
      // Crear usuario según su tipo
      switch (userType) {
        case 'ADMIN':
          user = await this.prisma.admins.create({
            data: {
              ...userData,
              Email,
              passwordHash: hashedPassword,
            },
          });
          break;
        case 'MEDIC':
          // Mapear los campos correctamente según el esquema de Prisma
          user = await this.prisma.medics.create({
            data: {
              DNI: userData.DNI,
              Name: userData.Name,
              Lastname: userData.Lastname,
              email: Email,
              passwordHash: hashedPassword,
              Birthdate: new Date(),
              gender, // Ahora es obligatorio
              phone_number: userData.Phone_number, // Corregido a phone_number
              create: adminId, // Usamos el ID del admin actual
            },
          });
          break;
        case 'PATIENT':
          // Mapear los campos correctamente según el esquema de Prisma
          user = await this.prisma.patients.create({
            data: {
              DNI: userData.DNI,
              Name: userData.Name,
              Lastname: userData.Lastname,
              email: Email,
              passwordHash: hashedPassword,
              Birthdate: new Date(),
              gender, // Ahora es obligatorio
              phone_number: userData.Phone_number, // Corregido a phone_number
              create: adminId, // Usamos el ID del admin actual
            },
          });
          break;
        default:
          throw new BadRequestException('Tipo de usuario no válido');
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw new BadRequestException(`Error al crear usuario: ${error.message}`);
    }

    return this.mapToUserResponse(user, userType);
  }

  async listUsers(page = 1, limit = 10, userType?: string): Promise<{ data: UserResponseDto[], meta: { total: number, page: number, limit: number } }> {
    const skip = (page - 1) * limit;
    let users: UserResponseDto[] = [];
    let total = 0;

    // Si se especifica un tipo de usuario, filtrar por ese tipo
    if (userType) {
      switch (userType.toUpperCase()) {
        case 'ADMIN':
          [users, total] = await this.getUsersByType('ADMIN', skip, limit);
          break;
        case 'MEDIC':
          [users, total] = await this.getUsersByType('MEDIC', skip, limit);
          break;
        case 'PATIENT':
          [users, total] = await this.getUsersByType('PATIENT', skip, limit);
          break;
        default:
          throw new BadRequestException('Tipo de usuario no válido');
      }
    } else {
      // Si no se especifica tipo, obtener todos los usuarios
      const [admins, adminsCount] = await this.getUsersByType('ADMIN', skip, limit);
      const [medics, medicsCount] = await this.getUsersByType('MEDIC', skip, limit);
      const [patients, patientsCount] = await this.getUsersByType('PATIENT', skip, limit);
      
      users = [...admins, ...medics, ...patients];
      total = adminsCount + medicsCount + patientsCount;
      
      // Ordenar por fecha de creación y aplicar paginación manualmente
      if (users.length > 0) {
        users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        users = users.slice(0, limit);
      }
    }

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  private async getUsersByType(type: string, skip: number, limit: number): Promise<[UserResponseDto[], number]> {
    let users: any[] = [];
    let count = 0;
    
    switch (type) {
      case 'ADMIN':
        users = await this.prisma.admins.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        count = await this.prisma.admins.count();
        return [users.map(user => this.mapToUserResponse(user, 'ADMIN')), count];
      
      case 'MEDIC':
        users = await this.prisma.medics.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        count = await this.prisma.medics.count();
        return [users.map(user => this.mapToUserResponse(user, 'MEDIC')), count];
      
      case 'PATIENT':
        users = await this.prisma.patients.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        count = await this.prisma.patients.count();
        return [users.map(user => this.mapToUserResponse(user, 'PATIENT')), count];
      
      default:
        return [[], 0];
    }
  }

  async getUserById(id: number, userType?: string): Promise<UserResponseDto> {
    let user: any = null;
    let type: string = userType || '';

    // Si no se especifica tipo, buscar en todas las tablas
    if (!type) {
      user = await this.prisma.admins.findUnique({ where: { ID_Admins: id } });
      if (user) type = 'ADMIN';
      
      if (!user) {
        user = await this.prisma.medics.findUnique({ where: { ID_medics: id } });
        if (user) type = 'MEDIC';
      }
      
      if (!user) {
        user = await this.prisma.patients.findUnique({ where: { ID_Patients: id } });
        if (user) type = 'PATIENT';
      }
    } else {
      // Buscar en la tabla específica
      switch (type.toUpperCase()) {
        case 'ADMIN':
          user = await this.prisma.admins.findUnique({ where: { ID_Admins: id } });
          type = 'ADMIN';
          break;
        case 'MEDIC':
          user = await this.prisma.medics.findUnique({ where: { ID_medics: id } });
          type = 'MEDIC';
          break;
        case 'PATIENT':
          user = await this.prisma.patients.findUnique({ where: { ID_Patients: id } });
          type = 'PATIENT';
          break;
        default:
          throw new BadRequestException('Tipo de usuario no válido');
      }
    }

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.mapToUserResponse(user, type);
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Primero determinar el tipo de usuario
    let userType: string | null = null;
    let user: any = await this.prisma.admins.findUnique({ where: { ID_Admins: id } });
    if (user) userType = 'ADMIN';
    
    if (!user) {
      user = await this.prisma.medics.findUnique({ where: { ID_medics: id } });
      if (user) userType = 'MEDIC';
    }
    
    if (!user) {
      user = await this.prisma.patients.findUnique({ where: { ID_Patients: id } });
      if (user) userType = 'PATIENT';
    }

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { Email, password, ...updateData } = updateUserDto;
    
    // Verificar si el email ya existe y no pertenece a este usuario
    if (Email && Email !== (userType === 'ADMIN' ? user.Email : user.email)) {
      const existingUser = await this.prisma.admins.findFirst({
        where: { Email, NOT: { ID_Admins: id } },
      }) || await this.prisma.medics.findFirst({
        where: { email: Email, NOT: { ID_medics: id } },
      }) || await this.prisma.patients.findFirst({
        where: { email: Email, NOT: { ID_Patients: id } },
      });

      if (existingUser) {
        throw new ConflictException(`El email ${Email} ya está registrado`);
      }
    }

    // Preparar datos para actualización
    const updatePayload: any = { ...updateData };
    if (Email) updatePayload.email = Email;
    
    // Si hay cambio de contraseña, hashearla
    if (password) {
      updatePayload.passwordHash = await bcrypt.hash(password, 10);
    }

    // Actualizar según el tipo de usuario
    let updatedUser;
    switch (userType) {
      case 'ADMIN':
        updatedUser = await this.prisma.admins.update({
          where: { ID_Admins: id },
          data: updatePayload,
        });
        break;
      case 'MEDIC':
        updatedUser = await this.prisma.medics.update({
          where: { ID_medics: id },
          data: updatePayload,
        });
        break;
      case 'PATIENT':
        updatedUser = await this.prisma.patients.update({
          where: { ID_Patients: id },
          data: updatePayload,
        });
        break;
    }

    return this.mapToUserResponse(updatedUser, userType || '');
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    // Determinar el tipo de usuario
    let userType: string | null = null;
    let user: any = await this.prisma.admins.findUnique({ where: { ID_Admins: parseInt(id) } });
    if (user) userType = 'ADMIN';
    
    if (!user) {
      user = await this.prisma.medics.findUnique({ where: { ID_medics: parseInt(id) } });
      if (user) userType = 'MEDIC';
    }
    
    if (!user) {
      user = await this.prisma.patients.findUnique({ where: { ID_Patients: parseInt(id) } });
      if (user) userType = 'PATIENT';
    }

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Eliminar según el tipo de usuario
    switch (userType) {
      case 'ADMIN':
        // Verificar que no sea el último administrador
        const adminCount = await this.prisma.admins.count();
        if (adminCount <= 1) {
          throw new BadRequestException('No se puede eliminar el último administrador');
        }
        await this.prisma.admins.delete({ where: { ID_Admins: parseInt(id) } });
        break;
      case 'MEDIC':
        // Verificar si tiene citas pendientes
        const pendingAppointments = await this.prisma.appointments.findMany({
          where: {
            ID_medics: parseInt(id),
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          }
        });
        
        if (pendingAppointments.length > 0) {
          throw new BadRequestException('No se puede eliminar un médico con citas pendientes');
        }
        
        await this.prisma.medics.delete({ where: { ID_medics: parseInt(id) } });
        break;
      case 'PATIENT':
        // Verificar si tiene citas pendientes
        const patientAppointments = await this.prisma.appointments.findMany({
          where: {
            ID_Patients: parseInt(id),
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          }
        });
        
        if (patientAppointments.length > 0) {
          throw new BadRequestException('No se puede eliminar un paciente con citas pendientes');
        }
        
        // Eliminar registros clínicos asociados
        await this.prisma.clinical_data.deleteMany({
          where: { ID_Patients: parseInt(id) }
        });
        
        await this.prisma.patients.delete({ where: { ID_Patients: parseInt(id) } });
        break;
    }

    return { message: 'Usuario eliminado con éxito' };
  }
  
  // Método auxiliar para mapear entidades a DTO de respuesta
  private mapToUserResponse(user: any, userType: string): UserResponseDto {
    let id: number;
    
    // Asignar el ID correcto según el tipo de usuario
    if (userType === 'ADMIN') {
      id = user.ID_Admins;
    } else if (userType === 'MEDIC') {
      id = user.ID_medics;
    } else {
      id = user.ID_Patients;
    }
    
    return {
      id,
      name: user.Name,
      lastname: user.Lastname,
      email: userType === 'ADMIN' ? user.Email : user.email,
      dni: user.DNI,
      phone_number: userType === 'ADMIN' ? user.Phone_number : user.phone_number,
      userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}