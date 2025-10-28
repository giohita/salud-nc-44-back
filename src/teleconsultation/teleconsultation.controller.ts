import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { TeleconsultationService } from './teleconsultation.service';
import { CreateTeleconsultationDto } from './dto/create-teleconsultation.dto';
import { TeleconsultationStatus } from '@prisma/client';
import { StartSessionDto } from './dto/start-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Descomenta cuando esté disponible

@Controller('teleconsultation')
// @UseGuards(JwtAuthGuard) // Descomenta cuando esté disponible
export class TeleconsultationController {
  constructor(private readonly teleconsultationService: TeleconsultationService) {}

  /**
   * POST /teleconsultation → Crear nueva teleconsulta
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTeleconsultationDto: CreateTeleconsultationDto) {
    return {
      success: true,
      message: 'Teleconsulta creada exitosamente',
      data: await this.teleconsultationService.create(createTeleconsultationDto),
    };
  }

  /**
   * GET /teleconsultation → Obtener todas las teleconsultas
   */
  @Get()
  async findAll() {
    return {
      success: true,
      message: 'Lista de teleconsultas obtenida',
      data: await this.teleconsultationService.findAll(),
    };
  }

  /**
   * POST /teleconsultation/start → Iniciar Sesión de TeleConsulta
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startSession(@Body() startSessionDto: StartSessionDto) {
    return {
      success: true,
      message: 'Sesión de teleconsulta iniciada',
      data: await this.teleconsultationService.startSession(startSessionDto),
    };
  }

  /**
   * GET /teleconsultation/:id → Obtener Detalles de teleconsulta
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      message: 'Detalles de teleconsulta obtenidos',
      data: await this.teleconsultationService.findOne(id),
    };
  }

  /**
   * GET /teleconsultation/:id/session → Verificar estado de sesión
   */
  @Get(':id/session')
  async getSessionStatus(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      message: 'Estado de sesión obtenido',
      data: await this.teleconsultationService.getSessionStatus(id),
    };
  }

  /**
   * GET /teleconsultation/webrtc/config → Obtener configuración WebRTC
   */
  @Get('webrtc/config')
  async getWebRTCConfig() {
    return {
      success: true,
      message: 'Configuración WebRTC obtenida',
      data: await this.teleconsultationService.getWebRTCConfiguration(),
    };
  }

  /**
   * PATCH /teleconsultation/:id/end → Finalizar sesión
   */
  @Patch(':id/end')
  async endSession(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes?: string,
  ) {
    return {
      success: true,
      message: 'Sesión de teleconsulta finalizada',
      data: await this.teleconsultationService.endSession(id, notes),
    };
  }

  /**
   * GET /teleconsultation/medic/:medicId → Obtener teleconsultas por médico
   */
  @Get('medic/:medicId')
  async findByMedic(
    @Param('medicId', ParseIntPipe) medicId: number,
    @Query('status') status?: TeleconsultationStatus,
  ) {
    return {
      success: true,
      message: 'Teleconsultas del médico obtenidas',
      data: await this.teleconsultationService.findByMedic(medicId, status),
    };
  }

  /**
   * GET /teleconsultation/patient/:patientId → Obtener teleconsultas por paciente
   */
  @Get('patient/:patientId')
  async findByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query('status') status?: TeleconsultationStatus,
  ) {
    return {
      success: true,
      message: 'Teleconsultas del paciente obtenidas',
      data: await this.teleconsultationService.findByPatient(patientId, status),
    };
  }

  /**
   * POST /teleconsultation/join → Unirse a una sesión existente
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinSession(@Body() joinSessionDto: JoinSessionDto) {
    return {
      success: true,
      message: 'Se unió a la sesión exitosamente',
      data: await this.teleconsultationService.joinSession(joinSessionDto),
    };
  }

  /**
   * GET /teleconsultation/:id/participants → Obtener participantes de una sesión
   */
  @Get(':id/participants')
  async getSessionParticipants(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      message: 'Lista de participantes obtenida',
      data: await this.teleconsultationService.getSessionParticipants(id),
    };
  }

  /**
   * POST /teleconsultation/:id/leave → Salir de una sesión
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveSession(
    @Param('id', ParseIntPipe) id: number,
    @Body('participantId') participantId: string,
  ) {
    await this.teleconsultationService.leaveSession(id, participantId);
    return {
      success: true,
      message: 'Salió de la sesión exitosamente',
    };
  }
}