import { IsNotEmpty, IsOptional, IsEnum, IsNumber, IsString } from 'class-validator';
import { TeleconsultationType } from './create-teleconsultation.dto';
import { TeleconsultationType as PrismaTeleconsultationType } from '@prisma/client';

export class StartSessionDto {
  @IsNotEmpty()
  @IsNumber()
  teleconsultationId: number;

  @IsOptional()
  @IsEnum(TeleconsultationType)
  preferredType?: TeleconsultationType;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class SessionResponseDto {
  sessionId: string;
  roomId: string;
  type: PrismaTeleconsultationType;
  webrtcConfig?: {
    iceServers: any[];
    constraints: any;
  };
  expiresAt: Date;
}