import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, Min, Max } from 'class-validator';

export class AgendaConfigDto {
  @IsOptional()
  @IsString()
  workingHoursStart?: string; // Formato: "08:00"

  @IsOptional()
  @IsString()
  workingHoursEnd?: string; // Formato: "18:00"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[]; // ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  appointmentDurationMinutes?: number; // Duración por defecto de citas en minutos

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  breakBetweenAppointments?: number; // Tiempo entre citas en minutos

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  maxAdvanceBookingDays?: number; // Máximo días de anticipación para reservar

  @IsOptional()
  @IsBoolean()
  allowWeekendAppointments?: boolean; // Permitir citas en fines de semana

  @IsOptional()
  @IsBoolean()
  enableAutomaticReminders?: boolean; // Habilitar recordatorios automáticos

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(72)
  reminderHoursBefore?: number; // Horas antes de la cita para enviar recordatorio

  @IsOptional()
  @IsString()
  timeZone?: string; // Zona horaria del sistema

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableAppointmentTypes?: string[]; // Tipos de citas disponibles

  @IsOptional()
  @IsBoolean()
  requirePatientConfirmation?: boolean; // Requiere confirmación del paciente

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  cancellationDeadlineHours?: number; // Horas límite para cancelar una cita

  @IsOptional()
  @IsString()
  lastUpdated?: string; // Fecha y hora de la última actualización
}