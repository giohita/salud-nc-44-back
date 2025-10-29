import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeleconsultationDto } from './dto/create-teleconsultation.dto';
import { StartSessionDto, SessionResponseDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { JoinSessionDto, JoinSessionResponseDto, ParticipantInfo, ParticipantRole } from './dto/join-session.dto';
import { v4 as uuidv4 } from 'uuid';
import { TeleconsultationType, TeleconsultationStatus } from '@prisma/client';
@Injectable()
export class TeleconsultationService {
  private readonly logger = new Logger(TeleconsultationService.name);
  
  // Mapa para gestionar participantes de sesiones activas
  // Estructura: sessionId -> Map<participantId, ParticipantInfo>
  private sessionParticipants = new Map<string, Map<string, ParticipantInfo>>();

  constructor(private prisma: PrismaService) {}

  /**
   * Crear una nueva teleconsulta programada
   */
  async create(createDto: CreateTeleconsultationDto) {
    try {
      // Verificar que el paciente y médico existan
      const [patient, medic] = await Promise.all([
        this.prisma.patients.findUnique({ where: { ID_Patients: createDto.patientId } }),
        this.prisma.medics.findUnique({ where: { ID_medics: createDto.medicId } })
      ]);

      if (!patient) {
        throw new NotFoundException(`Paciente con ID ${createDto.patientId} no encontrado`);
      }

      if (!medic) {
        throw new NotFoundException(`Médico con ID ${createDto.medicId} no encontrado`);
      }

      // Crear la teleconsulta
      const teleconsultation = await this.prisma.teleconsultations.create({
        data: {
          patientId: createDto.patientId,
          medicId: createDto.medicId,
          appointmentId: createDto.appointmentId,
          scheduledAt: new Date(createDto.scheduledAt),
          type: createDto.type === 'webrtc' ? TeleconsultationType.WEBRTC : TeleconsultationType.EMERGENCY,
          status: TeleconsultationStatus.SCHEDULED,
          notes: createDto.notes,
          emergencyReason: createDto.emergencyReason,
          createdAt: new Date(),
        },
        include: {
          patient: {
            select: {
              ID_Patients: true,
              Name: true,
              email: true,
            }
          },
          medic: {
            select: {
              ID_medics: true,
              Name: true,
              specialty: true,
            }
          }
        }
      });

      this.logger.log(`Teleconsulta creada: ${teleconsultation.id}`);
      return teleconsultation;

    } catch (error) {
      this.logger.error(`Error creando teleconsulta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todas las teleconsultas
   */
  async findAll() {
    try {
      const teleconsultations = await this.prisma.teleconsultations.findMany({
        include: {
          patient: {
            select: {
              ID_Patients: true,
              Name: true,
              Lastname: true,
              email: true,
            }
          },
          medic: {
            select: {
              ID_medics: true,
              Name: true,
              Lastname: true,
              specialty: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      this.logger.log(`Obtenidas ${teleconsultations.length} teleconsultas`);
      return teleconsultations;

    } catch (error) {
      this.logger.error(`Error obteniendo teleconsultas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Iniciar sesión de teleconsulta
   */
  async startSession(startDto: StartSessionDto): Promise<SessionResponseDto> {
    try {
      // Buscar la teleconsulta
      const teleconsultation = await this.prisma.teleconsultations.findUnique({
        where: { id: startDto.teleconsultationId },
        include: {
          patient: true,
          medic: true,
          appointment: true
        }
      });

      if (!teleconsultation) {
        throw new NotFoundException('Teleconsulta no encontrada');
      }

      if (teleconsultation.status !== TeleconsultationStatus.SCHEDULED) {
        throw new BadRequestException('La teleconsulta no está en estado programado');
      }

      // Generar IDs únicos para la sesión
      const sessionId = uuidv4();
      const roomId = `room-${startDto.teleconsultationId}-${Date.now()}`;

      // Usar siempre WebRTC
      const sessionConfig = this.getWebRTCConfig();
      const finalType = teleconsultation.type === TeleconsultationType.EMERGENCY 
        ? TeleconsultationType.EMERGENCY 
        : TeleconsultationType.WEBRTC;

      // Actualizar la teleconsulta con los datos de sesión
      await this.prisma.teleconsultations.update({
        where: { id: startDto.teleconsultationId },
        data: {
          sessionId,
          roomId,
          type: finalType,
          status: TeleconsultationStatus.ACTIVE,
          startedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Preparar respuesta con configuración WebRTC
      const response: SessionResponseDto = {
        sessionId,
        roomId,
        type: finalType,
        webrtcConfig: sessionConfig,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas
      };

      this.logger.log(`Sesión iniciada: ${sessionId} para teleconsulta ${teleconsultation.id}`);
      return response;

    } catch (error) {
      this.logger.error(`Error iniciando sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener detalles de una teleconsulta
   */
  async findOne(id: number) {
    try {
      const teleconsultation = await this.prisma.teleconsultations.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              ID_Patients: true,
              Name: true,
              email: true,
              phone_number: true,
            }
          },
          medic: {
            select: {
              ID_medics: true,
              Name: true,
              specialty: true,
              email: true,
            }
          },
          appointment: {
            select: {
              ID_Appointments: true,
              appointmentDatetime: true,
              status: true,
            }
          }
        }
      });

      if (!teleconsultation) {
        throw new NotFoundException(`Teleconsulta con ID ${id} no encontrada`);
      }

      return teleconsultation;

    } catch (error) {
      this.logger.error(`Error obteniendo teleconsulta ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finalizar sesión de teleconsulta
   */
  async endSession(id: number, notes?: string) {
    try {
      // Primero obtenemos la teleconsulta actual
      const currentTeleconsultation = await this.prisma.teleconsultations.findUnique({
        where: { id }
      });

      if (!currentTeleconsultation) {
        throw new Error(`Teleconsulta con ID ${id} no encontrada`);
      }

      const teleconsultation = await this.prisma.teleconsultations.update({
        where: { id },
        data: {
          status: TeleconsultationStatus.COMPLETED,
          endedAt: new Date(),
          notes: notes || currentTeleconsultation.notes,
        }
      });

      // Limpiar participantes de la sesión
      if (currentTeleconsultation.sessionId) {
        this.cleanupSessionParticipants(currentTeleconsultation.sessionId);
      }

      this.logger.log(`Sesión finalizada: teleconsulta ${id}`);
      return teleconsultation;

    } catch (error) {
      this.logger.error(`Error finalizando sesión ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estado de sesión activa
   */
  async getSessionStatus(teleconsultationId: number) {
    try {
      const teleconsultation = await this.prisma.teleconsultations.findUnique({
        where: { id: teleconsultationId },
        select: {
          id: true,
          status: true,
          sessionId: true,
          roomId: true,
          startedAt: true,
          endedAt: true,
          type: true,
          patient: {
            select: {
              ID_Patients: true,
              Name: true,
              Lastname: true,
            }
          },
          medic: {
            select: {
              ID_medics: true,
              Name: true,
              Lastname: true,
              specialty: true,
            }
          }
        }
      });

      if (!teleconsultation) {
        throw new NotFoundException('Teleconsulta no encontrada');
      }

      const isActive = teleconsultation.status === TeleconsultationStatus.ACTIVE;
      const duration = teleconsultation.startedAt 
        ? Math.floor((new Date().getTime() - teleconsultation.startedAt.getTime()) / 1000)
        : 0;

      return {
        ...teleconsultation,
        isActive,
        duration: isActive ? duration : null,
        webrtcConfig: isActive ? this.getWebRTCConfig() : null
      };

    } catch (error) {
      this.logger.error(`Error obteniendo estado de sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener configuración WebRTC pública
   */
  async getWebRTCConfiguration() {
    return this.getWebRTCConfig();
  }

  /**
   * Configuración WebRTC gratuita usando servidores STUN públicos
   */
  private getWebRTCConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
      ],
      constraints: {
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }
    };
  }



  /**
   * Obtener teleconsultas por médico
   */
  async findByMedic(medicId: number, status?: TeleconsultationStatus) {
    const where: any = { medicId };
    if (status) {
      where.status = status;
    }

    return this.prisma.teleconsultations.findMany({
      where,
      include: {
        patient: {
          select: {
            ID_Patients: true,
            Name: true,
            email: true,
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  /**
   * Obtener teleconsultas por paciente
   */
  async findByPatient(patientId: number, status?: TeleconsultationStatus) {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    return this.prisma.teleconsultations.findMany({
      where,
      include: {
        medic: {
          select: {
            ID_medics: true,
            Name: true,
            specialty: true,
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  /**
   * Unirse a una sesión de teleconsulta existente
   */
  async joinSession(joinDto: JoinSessionDto): Promise<JoinSessionResponseDto> {
    try {
      // Buscar la teleconsulta
      const teleconsultation = await this.prisma.teleconsultations.findUnique({
        where: { id: joinDto.teleconsultationId },
        include: {
          patient: true,
          medic: true,
          appointment: true
        }
      });

      if (!teleconsultation) {
        throw new NotFoundException('Teleconsulta no encontrada');
      }

      if (teleconsultation.status !== TeleconsultationStatus.ACTIVE) {
        throw new BadRequestException('La teleconsulta no está activa. No se puede unir a la sesión.');
      }

      if (!teleconsultation.sessionId || !teleconsultation.roomId) {
        throw new BadRequestException('La sesión no ha sido iniciada correctamente');
      }

      // Generar ID único para el participante
      const participantId = uuidv4();

      // Crear información del participante
      const participantInfo: ParticipantInfo = {
        participantId,
        name: joinDto.participantName,
        role: joinDto.role,
        joinedAt: new Date(),
        isConnected: true
      };

      // Agregar participante al mapa de sesiones
      if (!this.sessionParticipants.has(teleconsultation.sessionId)) {
        this.sessionParticipants.set(teleconsultation.sessionId, new Map());
      }
      
      const sessionMap = this.sessionParticipants.get(teleconsultation.sessionId);
      sessionMap.set(participantId, participantInfo);

      // Obtener lista de todos los participantes
      const participants = Array.from(sessionMap.values());

      // Preparar respuesta
      const response: JoinSessionResponseDto = {
        participantId,
        sessionId: teleconsultation.sessionId,
        roomId: teleconsultation.roomId,
        webrtcConfig: this.getWebRTCConfig(),
        participants,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas
      };

      this.logger.log(`Participante ${joinDto.participantName} (${participantId}) se unió a la sesión ${teleconsultation.sessionId}`);
      return response;

    } catch (error) {
      this.logger.error(`Error al unirse a la sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener participantes de una sesión
   */
  async getSessionParticipants(teleconsultationId: number): Promise<ParticipantInfo[]> {
    const teleconsultation = await this.prisma.teleconsultations.findUnique({
      where: { id: teleconsultationId }
    });

    if (!teleconsultation || !teleconsultation.sessionId) {
      return [];
    }

    const sessionMap = this.sessionParticipants.get(teleconsultation.sessionId);
    if (!sessionMap) {
      return [];
    }

    return Array.from(sessionMap.values());
  }

  /**
   * Remover participante de una sesión
   */
  async leaveSession(teleconsultationId: number, participantId: string): Promise<void> {
    const teleconsultation = await this.prisma.teleconsultations.findUnique({
      where: { id: teleconsultationId }
    });

    if (teleconsultation && teleconsultation.sessionId) {
      const sessionMap = this.sessionParticipants.get(teleconsultation.sessionId);
      if (sessionMap) {
        const participant = sessionMap.get(participantId);
        if (participant) {
          sessionMap.delete(participantId);
          this.logger.log(`Participante ${participant.name} (${participantId}) salió de la sesión ${teleconsultation.sessionId}`);
        }
      }
    }
  }

  /**
   * Limpiar participantes cuando se termina una sesión
   */
  private cleanupSessionParticipants(sessionId: string): void {
    if (this.sessionParticipants.has(sessionId)) {
      this.sessionParticipants.delete(sessionId);
      this.logger.log(`Participantes de la sesión ${sessionId} limpiados`);
    }
  }
}