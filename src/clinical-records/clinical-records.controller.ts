import { Controller, Patch, Get, Post, Body, Put, Param, ParseIntPipe, Res, Header } from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { TransferClinicalRecordDto } from './dto/tranfers-clinical-record.dto';
import type { Response } from 'express';

@Controller('records')
export class ClinicalRecordsController {
  constructor(private readonly clinicalRecordsService: ClinicalRecordsService) {}

  @Post()
  create(@Body() createClinicalRecordDto: CreateClinicalRecordDto) {
    return this.clinicalRecordsService.create(createClinicalRecordDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clinicalRecordsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClinicalRecordDto: UpdateClinicalRecordDto,
  ) {
    return this.clinicalRecordsService.update(id, updateClinicalRecordDto);
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { fileBuffer, fileName } = await this.clinicalRecordsService.generateDownloadableRecord(id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    
    res.send(fileBuffer);
  }

  // ruta de la transferencia
  @Patch(':id/transfer')
  transferRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferClinicalRecordDto,
  ) {
    return this.clinicalRecordsService.TransferClinicalRecordDto(id, dto)
  }
}