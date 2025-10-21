import { IsInt, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  ID_Patients: number;

  @IsInt()
  ID_medics: number;

  @IsString()
  appointmentType: string;

  @IsDateString()
  appointmentDatetime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
