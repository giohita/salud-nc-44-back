import { Injectable, Logger } from '@nestjs/common';
import { AgendaConfigDto } from './dto/agenda-config.dto';

@Injectable()
export class AgendaConfigService {
  private readonly logger = new Logger(AgendaConfigService.name);
  
  // Configuración por defecto del sistema
  private defaultConfig: AgendaConfigDto = {
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    appointmentDurationMinutes: 30,
    breakBetweenAppointments: 15,
    maxAdvanceBookingDays: 30,
    allowWeekendAppointments: false,
    enableAutomaticReminders: true,
    reminderHoursBefore: 24,
    timeZone: 'America/Caracas',
    availableAppointmentTypes: [
      'Consulta General',
      'Consulta Especializada',
      'Control',
      'Emergencia',
      'Telemedicina'
    ],
    requirePatientConfirmation: true,
    cancellationDeadlineHours: 24
  };

  // En un entorno real, esto se almacenaría en base de datos
  // Por ahora usamos memoria para demostración
  private currentConfig: AgendaConfigDto = { ...this.defaultConfig };

  /**
   * Obtiene la configuración actual de la agenda
   */
  async getConfig(): Promise<AgendaConfigDto> {
    try {
      this.logger.log('Obteniendo configuración de agenda');
      
      // En un entorno real, aquí consultarías la base de datos
      // return await this.prisma.agendaConfig.findFirst();
      
      return {
        ...this.currentConfig,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error al obtener configuración: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza la configuración de la agenda
   */
  async updateConfig(configDto: AgendaConfigDto): Promise<AgendaConfigDto> {
    try {
      this.logger.log('Actualizando configuración de agenda');
      
      // Validar configuración antes de aplicar
      this.validateConfig(configDto);
      
      // Merge con configuración actual (solo campos proporcionados)
      this.currentConfig = {
        ...this.currentConfig,
        ...configDto
      };

      // En un entorno real, aquí actualizarías la base de datos
      // await this.prisma.agendaConfig.upsert({
      //   where: { id: 1 },
      //   update: configDto,
      //   create: { ...this.defaultConfig, ...configDto }
      // });

      this.logger.log('Configuración actualizada exitosamente');
      
      return {
        ...this.currentConfig,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error al actualizar configuración: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Restaura la configuración por defecto
   */
  async resetToDefault(): Promise<AgendaConfigDto> {
    try {
      this.logger.log('Restaurando configuración por defecto');
      
      this.currentConfig = { ...this.defaultConfig };
      
      return {
        ...this.currentConfig,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error al restaurar configuración: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Valida la configuración antes de aplicarla
   */
  private validateConfig(config: AgendaConfigDto): void {
    // Validar horarios de trabajo
    if (config.workingHoursStart && config.workingHoursEnd) {
      const start = this.parseTime(config.workingHoursStart);
      const end = this.parseTime(config.workingHoursEnd);
      
      if (start >= end) {
        throw new Error('La hora de inicio debe ser menor que la hora de fin');
      }
    }

    // Validar días laborables
    if (config.workingDays && config.workingDays.length === 0) {
      throw new Error('Debe haber al menos un día laborable');
    }

    // Validar duración de citas vs tiempo entre citas
    if (config.appointmentDurationMinutes && config.breakBetweenAppointments) {
      if (config.breakBetweenAppointments >= config.appointmentDurationMinutes) {
        throw new Error('El tiempo entre citas no puede ser mayor o igual a la duración de la cita');
      }
    }
  }

  /**
   * Convierte string de tiempo a minutos para comparación
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Obtiene configuración específica para validaciones de citas
   */
  async getAppointmentValidationConfig() {
    const config = await this.getConfig();
    
    return {
      workingHours: {
        start: config.workingHoursStart,
        end: config.workingHoursEnd
      },
      workingDays: config.workingDays,
      maxAdvanceBookingDays: config.maxAdvanceBookingDays,
      allowWeekendAppointments: config.allowWeekendAppointments,
      appointmentDurationMinutes: config.appointmentDurationMinutes,
      breakBetweenAppointments: config.breakBetweenAppointments,
      cancellationDeadlineHours: config.cancellationDeadlineHours
    };
  }

  /**
   * Obtiene tipos de citas disponibles
   */
  async getAvailableAppointmentTypes(): Promise<string[]> {
    const config = await this.getConfig();
    return config.availableAppointmentTypes || [];
  }
}