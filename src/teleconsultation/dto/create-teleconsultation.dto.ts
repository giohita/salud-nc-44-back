import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export enum TeleconsultationType {
  WEBRTC = 'webrtc',
  EMERGENCY = 'emergency'
}

export enum TeleconsultationStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export class CreateTeleconsultationDto {
  @IsNotEmpty()
  @IsNumber()
  patientId: number;

  @IsNotEmpty()
  @IsNumber()
  medicId: number;

  @IsOptional()
  @IsNumber()
  appointmentId?: number;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsEnum(TeleconsultationType)
  type: TeleconsultationType = TeleconsultationType.WEBRTC;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  emergencyReason?: string;
}