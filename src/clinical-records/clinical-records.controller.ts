import { Controller, Get, Post, Put, Patch, Param, Body, Req, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { TransferClinicalRecordDto } from './dto/tranfers-clinical-record.dto';
import type { AuthenticatedRequest } from 'src/types/express';

@Controller('records')
export class ClinicalRecordsController {
  constructor(private readonly clinicalRecordsService: ClinicalRecordsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('patient/download')
  async downloadPatientHistory(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    try {
      const patientId = req.user?.ID_Patients;
      console.log("🔹 Descarga PDF para pacienteId:", patientId);

      if (!patientId) return res.status(400).json({ message: 'Paciente no válido' });

      const pdfBuffer = await this.clinicalRecordsService.generatePatientPdf(patientId);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="historial_clinico.pdf"',
        'Content-Length': pdfBuffer.length,
      });

      console.log("🔹 Enviando PDF...");
      return res.end(pdfBuffer);
    } catch (error) {
      return res.status(500).json({ message: 'Error al generar PDF' });
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clinicalRecordsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateClinicalRecordDto) {
    return this.clinicalRecordsService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClinicalRecordDto) {
    return this.clinicalRecordsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/transfer')
  transferRecord(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferClinicalRecordDto) {
    return this.clinicalRecordsService.transfer(id, dto);
  }
}
