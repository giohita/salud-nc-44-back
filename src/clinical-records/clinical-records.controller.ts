import { Controller, Patch, Get, Post, Body, Put, Param, ParseIntPipe, Res, Header } from '@nestjs/common';
import { ClinicalRecordsService } from './clinical-records.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { TransferClinicalRecordDto } from './dto/tranfers-clinical-record.dto';
import { 
  SyncPatientToFhirDto, 
  ImportPatientFromFhirDto 
} from './dto/fhir-patient.dto';
import { 
  SyncClinicalRecordToFhirDto, 
  ImportObservationFromFhirDto,
  FhirServerConfigDto 
} from './dto/fhir-observation.dto';
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

  // ==================== ENDPOINTS FHIR ====================

  /**
   * Configura un servidor FHIR para integración
   */
  @Post('fhir/configure-server')
  configureFhirServer(@Body() config: FhirServerConfigDto) {
    return this.clinicalRecordsService.configureFhirServer(config);
  }

  /**
   * Sincroniza un paciente local con un servidor FHIR
   */
  @Post('fhir/sync-patient')
  syncPatientToFhir(@Body() dto: SyncPatientToFhirDto) {
    return this.clinicalRecordsService.syncPatientToFhir(dto);
  }

  /**
   * Sincroniza un registro clínico con un servidor FHIR como Observation
   */
  @Post('fhir/sync-record')
  syncClinicalRecordToFhir(@Body() dto: SyncClinicalRecordToFhirDto) {
    return this.clinicalRecordsService.syncClinicalRecordToFhir(dto);
  }

  /**
   * Importa una observación desde un servidor FHIR
   */
  @Post('fhir/import-observation')
  importObservationFromFhir(@Body() dto: ImportObservationFromFhirDto) {
    return this.clinicalRecordsService.importObservationFromFhir(dto);
  }

  /**
   * Obtiene todos los registros clínicos con datos FHIR
   */
  @Get('fhir/records-with-fhir')
  getClinicalRecordsWithFhir() {
    return this.clinicalRecordsService.getClinicalRecordsWithFhir();
  }

  /**
   * Obtiene un registro clínico específico con sus datos FHIR
   */
  @Get(':id/fhir')
  async getClinicalRecordWithFhir(@Param('id', ParseIntPipe) id: number) {
    const record = await this.clinicalRecordsService.findOne(id);
    return {
      ...record,
      fhirData: record.fhirData ? JSON.parse(record.fhirData as string) : null
    };
  }
}