import { IsInt, IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
export class CreateAppointmentDto {
  @IsInt()
  ID_Patients: number;

  @IsInt()
  ID_medics: number;

  @IsString()
  appointmentType: string;

  @IsDateString()
  appointmentDatetime: string;

  // @IsString()
  // status: string;
@IsOptional()
@IsEnum(AppointmentStatus)
status?: AppointmentStatus

  @IsOptional()
  @IsString()
  notes?: string;
}