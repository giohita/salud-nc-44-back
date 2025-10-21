import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import { Response } from 'express';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async generateStats(format: string, startDate?: string, endDate?: string, type: string = 'appointments') {
    // Validar formato
    if (!['csv', 'excel', 'json'].includes(format.toLowerCase())) {
      throw new BadRequestException('Formato no válido. Use csv, excel o json');
    }

    // Convertir fechas
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Formato de fecha no válido');
    }

    // Obtener datos según el tipo
    let data;
    switch (type.toLowerCase()) {
      case 'appointments':
        data = await this.getAppointmentsStats(start, end);
        break;
      case 'users':
        data = await this.getUsersStats();
        break;
      case 'clinical':
        data = await this.getClinicalStats(start, end);
        break;
      default:
        throw new BadRequestException('Tipo de estadística no válido');
    }

    // Generar archivo según formato
    const fileName = `stats_${type}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
    const filePath = path.join(process.cwd(), 'temp', fileName);

    // Asegurar que el directorio existe
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }

    // Generar archivo según formato
    switch (format.toLowerCase()) {
      case 'csv':
        await this.generateCsv(data, filePath);
        break;
      case 'excel':
        await this.generateExcel(data, filePath, type);
        break;
      case 'json':
        await this.generateJson(data, filePath);
        break;
    }

    return {
      message: 'Estadísticas generadas con éxito',
      fileName,
      filePath,
      format,
      type,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      recordCount: data.length,
    };
  }

  private async getAppointmentsStats(startDate: Date, endDate: Date) {
    return this.prisma.appointments.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        medic: {
          select: {
            Name: true,
            Lastname: true,
          },
        },
        patient: {
          select: {
            Name: true,
            Lastname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async getUsersStats() {
    const admins = await this.prisma.admins.findMany({
      select: {
        ID_Admins: true,
        Name: true,
        Lastname: true,
        Email: true,
        DNI: true,
        createdAt: true,
      },
    });

    // Añadir el tipo de usuario después de la consulta
    const adminsWithType = admins.map(admin => ({
      ...admin,
      userType: 'ADMIN',
    }));

    const medics = await this.prisma.medics.findMany({
      select: {
        ID_medics: true,
        Name: true,
        Lastname: true,
        email: true,
        DNI: true,
        createdAt: true,
      },
    });

    // Añadir el tipo de usuario después de la consulta
    const medicsWithType = medics.map(medic => ({
      ...medic,
      userType: 'MEDIC',
    }));

    const patients = await this.prisma.patients.findMany({
      select: {
        ID_Patients: true,
        Name: true,
        Lastname: true,
        email: true,
        DNI: true,
        createdAt: true,
      },
    });

    // Añadir el tipo de usuario después de la consulta
    const patientsWithType = patients.map(patient => ({
      ...patient,
      userType: 'PATIENT',
    }));

    return [...adminsWithType, ...medicsWithType, ...patientsWithType].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private async getClinicalStats(startDate: Date, endDate: Date) {
    return this.prisma.clinical_data.findMany({
      where: {
        effectiveDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        patient: {
          select: {
            Name: true,
            Lastname: true,
            DNI: true,
          },
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });
  }

  private async generateCsv(data: any[], filePath: string) {
    if (data.length === 0) {
      throw new BadRequestException('No hay datos para generar el archivo');
    }

    // Obtener encabezados del primer objeto
    const headers = Object.keys(this.flattenObject(data[0])).map(key => ({
      id: key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    }));

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    // Aplanar objetos anidados
    const flattenedData = data.map(item => this.flattenObject(item));

    await csvWriter.writeRecords(flattenedData);
    return filePath;
  }

  private async generateExcel(data: any[], filePath: string, type: string) {
    if (data.length === 0) {
      throw new BadRequestException('No hay datos para generar el archivo');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));

    // Obtener encabezados del primer objeto
    const flattenedObject = this.flattenObject(data[0]);
    const headers = Object.keys(flattenedObject);
    
    // Añadir encabezados
    worksheet.addRow(headers.map(header => 
      header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')
    ));

    // Añadir datos
    data.forEach(item => {
      const flatItem = this.flattenObject(item);
      worksheet.addRow(headers.map(header => flatItem[header]));
    });

    // Dar formato a la hoja
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async generateJson(data: any[], filePath: string) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  // Método auxiliar para aplanar objetos anidados
  private flattenObject(obj: any, prefix = '') {
    const result = {};
    
    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        result[prefix + key] = '';
      } else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
        // Si es un objeto anidado, recursivamente aplanarlo
        Object.assign(result, this.flattenObject(obj[key], prefix + key + '_'));
      } else if (obj[key] instanceof Date) {
        // Formatear fechas
        result[prefix + key] = obj[key].toISOString().split('T')[0];
      } else {
        result[prefix + key] = obj[key];
      }
    }
    
    return result;
  }
}