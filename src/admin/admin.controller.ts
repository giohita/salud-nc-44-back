import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { StatsService } from './stats.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminRoleGuard } from './guards/admin-role.guard';

@Controller('admin')
@UseGuards(AdminRoleGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly statsService: StatsService,
  ) {}

  // Endpoints para gestión de usuarios
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    // Crea un nuevo usuario (admin, médico o paciente)
    return this.adminService.createUser(createUserDto);
  }

  @Get('users')
  async listUsers(@Query('page') page = '1', @Query('limit') limit = '10', @Query('userType') userType?: string) {
    // Lista usuarios con paginación y filtros opcionales
    return this.adminService.listUsers(+page, +limit, userType);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    // Obtiene un usuario específico por ID
    return this.adminService.getUserById(+id);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Actualiza un usuario existente
    return this.adminService.updateUser(+id, updateUserDto);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // Elimina un usuario
    return this.adminService.deleteUser(id);
  }

  // Endpoint para estadísticas
  @Get('stats/export')
  async exportStats(
    @Query('format') format = 'csv', 
    @Query('startDate') startDate?: string, 
    @Query('endDate') endDate?: string,
    @Query('type') type = 'appointments'
  ) {
    // Genera y exporta estadísticas en el formato solicitado
    return this.statsService.generateStats(format, startDate, endDate, type);
  }
}