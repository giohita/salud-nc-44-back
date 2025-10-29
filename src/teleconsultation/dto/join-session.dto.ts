import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ParticipantRole {
  PATIENT = 'patient',
  MEDIC = 'medic',
  OBSERVER = 'observer'
}

export class JoinSessionDto {
  @ApiProperty({
    description: 'ID de la teleconsulta a la que se quiere unir',
    example: 1
  })
  @IsNotEmpty()
  teleconsultationId: number;

  @ApiProperty({
    description: 'Nombre del participante que se une',
    example: 'Dr. Juan Pérez'
  })
  @IsNotEmpty()
  @IsString()
  participantName: string;

  @ApiProperty({
    description: 'Rol del participante en la sesión',
    enum: ParticipantRole,
    example: ParticipantRole.OBSERVER
  })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiProperty({
    description: 'ID del usuario (opcional, para participantes autenticados)',
    example: 123,
    required: false
  })
  @IsOptional()
  userId?: number;
}

export class JoinSessionResponseDto {
  @ApiProperty({
    description: 'ID único del participante en la sesión'
  })
  participantId: string;

  @ApiProperty({
    description: 'ID de la sesión'
  })
  sessionId: string;

  @ApiProperty({
    description: 'ID de la sala WebRTC'
  })
  roomId: string;

  @ApiProperty({
    description: 'Configuración WebRTC para la conexión'
  })
  webrtcConfig: any;

  @ApiProperty({
    description: 'Lista de participantes actuales en la sesión'
  })
  participants: ParticipantInfo[];

  @ApiProperty({
    description: 'Tiempo de expiración de la sesión'
  })
  expiresAt: Date;
}

export class ParticipantInfo {
  @ApiProperty({
    description: 'ID único del participante'
  })
  participantId: string;

  @ApiProperty({
    description: 'Nombre del participante'
  })
  name: string;

  @ApiProperty({
    description: 'Rol del participante'
  })
  role: ParticipantRole;

  @ApiProperty({
    description: 'Tiempo de unión a la sesión'
  })
  joinedAt: Date;

  @ApiProperty({
    description: 'Estado de conexión del participante'
  })
  isConnected: boolean;
}