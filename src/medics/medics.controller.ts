src\medics\medics.controller.ts   import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiParam,
  ApiBearerAuth,
  ApiOkResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { MedicsService } from './medics.service';
import { 
  GetMedicsQueryDto, 
  GetMedicsResponseDto, 
  MedicResponseDto,
  AvailableMedicDto,
  SpecialtiesResponseDto
} from './dto';

@ApiTags('Médicos')
@Controller('medics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicsController {
  private readonly logger = new Logger(MedicsController.name);

  constructor(private readonly medicsService: MedicsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener lista de médicos',
    description: 'Obtiene una lista paginada de médicos con filtros opcionales de búsqueda, especialidad y estado activo'
  })
  @ApiOkResponse({ 
    description: 'Lista de médicos obtenida exitosamente',
    type: GetMedicsResponseDto
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (por defecto: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página (por defecto: 10, máximo: 100)' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre, apellido, DNI o email' })
  @ApiQuery({ name: 'specialty', required: false, description: 'Filtrar por especialidad médica' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por estado activo (true/false)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo para ordenar (Name, Lastname, DNI, email, specialty, createdAt, updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden de clasificación (asc/desc)' })
  async findAll(@Query() query: GetMedicsQueryDto): Promise<GetMedicsResponseDto> {
    this.logger.log(`GET /medics - Parámetros: ${JSON.stringify(query)}`);
    return this.medicsService.findAll(query);
  }

  @Get('available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener médicos disponibles',
    description: 'Obtiene la lista de médicos activos disponibles para citas, opcionalmente filtrados por fecha'
  })
  @ApiOkResponse({ 
    description: 'Lista de médicos disponibles obtenida exitosamente',
    type: [AvailableMedicDto]
  })
  @ApiQuery({ 
    name: 'date', 
    required: false, 
    description: 'Fecha para verificar disponibilidad (formato: YYYY-MM-DD)' 
  })
  async findAvailable(@Query('date') date?: string): Promise<AvailableMedicDto[]> {
    this.logger.log(`GET /medics/available - Fecha: ${date || 'cualquier fecha'}`);
    return this.medicsService.findAvailable(date);
  }

  @Get('specialties')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener especialidades médicas',
    description: 'Obtiene la lista de especialidades médicas únicas disponibles en el sistema'
  })
  @ApiOkResponse({ 
    description: 'Lista de especialidades obtenida exitosamente',
    type: SpecialtiesResponseDto
  })
  async getSpecialties(): Promise<{ specialties: string[]; total: number }> {
    this.logger.log('GET /medics/specialties');
    const specialties = await this.medicsService.getSpecialties();
    return {
      specialties,
      total: specialties.length
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Obtener médico por ID',
    description: 'Obtiene la información detallada de un médico específico incluyendo estadísticas y citas recientes'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único del médico',
    type: 'number'
  })
  @ApiOkResponse({ 
    description: 'Información del médico obtenida exitosamente',
    type: MedicResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Médico no encontrado' 
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MedicResponseDto> {
    this.logger.log(`GET /medics/${id}`);
    return this.medicsService.findOne(id);
  }
}