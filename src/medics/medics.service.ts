import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GetMedicsQueryDto } from './dto/get-medics-query.dto';

@Injectable()
export class MedicsService {
  private readonly logger = new Logger(MedicsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los médicos con paginación, filtros y búsqueda
   */
  async findAll(query: GetMedicsQueryDto) {
    try {
      this.logger.log(`Obteniendo médicos con filtros: ${JSON.stringify(query)}`);

      const {
        page = 1,
        limit = 10,
        search,
        specialty,
        isActive,
        sortBy = 'Name',
        sortOrder = 'asc'
      } = query;

      const skip = (page - 1) * limit;

      // Construir filtros dinámicos
      const where: Prisma.medicsWhereInput = {};

      if (search) {
        where.OR = [
          { Name: { contains: search, mode: 'insensitive' } },
          { Lastname: { contains: search, mode: 'insensitive' } },
          { DNI: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (specialty) {
        where.specialty = { contains: specialty, mode: 'insensitive' };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Configurar ordenamiento
      const orderBy: Prisma.medicsOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Ejecutar consultas en paralelo
      const [medics, total] = await Promise.all([
        this.prisma.medics.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            ID_medics: true,
            DNI: true,
            Name: true,
            Lastname: true,
            email: true,
            phone_number: true,
            gender: true,
            Birthdate: true,
            specialty: true,
            schedule: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // Incluir información del admin que lo creó
            admin: {
              select: {
                ID_Admins: true,
                Name: true,
                Lastname: true,
              }
            },
            // Estadísticas de citas
            _count: {
              select: {
                appointments: true,
                teleconsultations: true,
                clinical_data: true,
              }
            }
          },
        }),
        this.prisma.medics.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      this.logger.log(`Encontrados ${total} médicos, página ${page} de ${totalPages}`);

      return {
        medics,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search,
          specialty,
          isActive,
          sortBy,
          sortOrder,
        }
      };

    } catch (error) {
      this.logger.error(`Error al obtener médicos: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          'Error en la base de datos al obtener médicos. Por favor, intenta nuevamente.'
        );
      }
      
      throw new InternalServerErrorException(
        'Error interno del servidor al obtener médicos.'
      );
    }
  }

  /**
   * Obtener un médico por ID
   */
  async findOne(id: number) {
    try {
      this.logger.log(`Obteniendo médico con ID: ${id}`);

      const medic = await this.prisma.medics.findUnique({
        where: { ID_medics: id },
        select: {
          ID_medics: true,
          DNI: true,
          Name: true,
          Lastname: true,
          email: true,
          phone_number: true,
          gender: true,
          Birthdate: true,
          specialty: true,
          schedule: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Información del admin que lo creó
          admin: {
            select: {
              ID_Admins: true,
              Name: true,
              Lastname: true,
            }
          },
          // Estadísticas detalladas
          _count: {
            select: {
              appointments: true,
              teleconsultations: true,
              clinical_data: true,
            }
          },
          // Citas recientes (últimas 5)
          appointments: {
            take: 5,
            orderBy: { appointmentDatetime: 'desc' },
            select: {
              ID_Appointments: true,
              appointmentDatetime: true,
              status: true,
              appointmentType: true,
              patient: {
                select: {
                  Name: true,
                  Lastname: true,
                  DNI: true,
                }
              }
            }
          }
        },
      });

      if (!medic) {
        throw new NotFoundException(`Médico con ID ${id} no encontrado`);
      }

      this.logger.log(`Médico encontrado: ${medic.Name} ${medic.Lastname}`);
      return medic;

    } catch (error) {
      this.logger.error(`Error al obtener médico con ID ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          'Error en la base de datos al obtener el médico.'
        );
      }
      
      throw new InternalServerErrorException(
        'Error interno del servidor al obtener el médico.'
      );
    }
  }

  /**
   * Obtener médicos disponibles para citas
   */
  async findAvailable(date?: string) {
    try {
      this.logger.log(`Obteniendo médicos disponibles para fecha: ${date || 'cualquier fecha'}`);

      const where: Prisma.medicsWhereInput = {
        isActive: true,
      };

      // Si se proporciona una fecha, verificar disponibilidad
      if (date) {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        // Médicos que no tienen citas confirmadas en esa fecha
        where.NOT = {
          appointments: {
            some: {
              appointmentDatetime: {
                gte: startOfDay,
                lte: endOfDay,
              },
              status: 'CONFIRMED',
            }
          }
        };
      }

      const availableMedics = await this.prisma.medics.findMany({
        where,
        select: {
          ID_medics: true,
          DNI: true,
          Name: true,
          Lastname: true,
          email: true,
          specialty: true,
          schedule: true,
          _count: {
            select: {
              appointments: {
                where: {
                  appointmentDatetime: date ? {
                    gte: new Date(date + 'T00:00:00.000Z'),
                    lte: new Date(date + 'T23:59:59.999Z'),
                  } : undefined,
                  status: 'CONFIRMED',
                }
              }
            }
          }
        },
        orderBy: [
          { specialty: 'asc' },
          { Name: 'asc' }
        ]
      });

      this.logger.log(`Encontrados ${availableMedics.length} médicos disponibles`);
      return availableMedics;

    } catch (error) {
      this.logger.error(`Error al obtener médicos disponibles: ${error.message}`, error.stack);
      
      throw new InternalServerErrorException(
        'Error al obtener médicos disponibles. Por favor, intenta nuevamente.'
      );
    }
  }

  /**
   * Obtener especialidades únicas
   */
  async getSpecialties() {
    try {
      this.logger.log('Obteniendo especialidades médicas');

      const specialties = await this.prisma.medics.findMany({
        where: {
          isActive: true,
          specialty: { not: null }
        },
        select: {
          specialty: true,
        },
        distinct: ['specialty'],
        orderBy: {
          specialty: 'asc'
        }
      });

      const uniqueSpecialties = specialties
        .map(medic => medic.specialty)
        .filter(specialty => specialty && specialty.trim() !== '');

      this.logger.log(`Encontradas ${uniqueSpecialties.length} especialidades`);
      return uniqueSpecialties;

    } catch (error) {
      this.logger.error(`Error al obtener especialidades: ${error.message}`, error.stack);
      
      throw new InternalServerErrorException(
        'Error al obtener especialidades médicas.'
      );
    }
  }
}