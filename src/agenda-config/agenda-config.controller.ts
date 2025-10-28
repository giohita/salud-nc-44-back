import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  UseGuards,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { AgendaConfigService } from './agenda-config.service';
import { AgendaConfigDto } from './dto/agenda-config.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('agenda-config')
@UseGuards(AuthGuard('jwt'))
@Controller('agenda')
export class AgendaConfigController {
  constructor(private readonly agendaConfigService: AgendaConfigService) {}

  /**
   * GET /agenda/config → Obtener Configuración
   * Obtiene la configuración actual de la agenda del sistema
   */
  @Get('config')
  async getConfig() {
    const config = await this.agendaConfigService.getConfig();
    
    return {
      success: true,
      message: 'Configuración de agenda obtenida exitosamente',
      data: config,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * PUT /agenda/config → Modificar Configuración
   * Actualiza la configuración de la agenda del sistema
   */
  @Put('config')
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() configDto: AgendaConfigDto) {
    const updatedConfig = await this.agendaConfigService.updateConfig(configDto);
    
    return {
      success: true,
      message: 'Configuración de agenda actualizada exitosamente',
      data: updatedConfig,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /agenda/config/default → Obtener Configuración por Defecto
   * Endpoint adicional para obtener la configuración por defecto del sistema
   */
  @Get('config/default')
  async getDefaultConfig() {
    const defaultConfig = await this.agendaConfigService.resetToDefault();
    
    return {
      success: true,
      message: 'Configuración por defecto obtenida exitosamente',
      data: defaultConfig,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /agenda/config/appointment-types → Obtener Tipos de Citas Disponibles
   * Endpoint adicional para obtener solo los tipos de citas disponibles
   */
  @Get('config/appointment-types')
  async getAppointmentTypes() {
    const types = await this.agendaConfigService.getAvailableAppointmentTypes();
    
    return {
      success: true,
      message: 'Tipos de citas obtenidos exitosamente',
      data: {
        appointmentTypes: types,
        count: types.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET /agenda/config/validation → Obtener Configuración para Validaciones
   * Endpoint adicional para obtener configuración específica para validar citas
   */
  @Get('config/validation')
  async getValidationConfig() {
    const validationConfig = await this.agendaConfigService.getAppointmentValidationConfig();
    
    return {
      success: true,
      message: 'Configuración de validación obtenida exitosamente',
      data: validationConfig,
      timestamp: new Date().toISOString()
    };
  }
}