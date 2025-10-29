import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { TransferClinicalRecordDto } from './dto/tranfers-clinical-record.dto';
import { 
  FhirPatientDto, 
  FhirGender, 
  SyncPatientToFhirDto, 
  ImportPatientFromFhirDto 
} from './dto/fhir-patient.dto';
import { 
  FhirObservationDto, 
  FhirObservationStatus, 
  SyncClinicalRecordToFhirDto, 
  ImportObservationFromFhirDto,
  FhirServerConfigDto 
} from './dto/fhir-observation.dto';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

@Injectable()
export class ClinicalRecordsService {
  private readonly logger = new Logger(ClinicalRecordsService.name);
  private fhirServers: Map<string, FhirServerConfigDto> = new Map();

  constructor(private prisma: PrismaService) {
    // Configuración por defecto de servidor FHIR
    this.fhirServers.set('default', {
      name: 'Servidor FHIR Local',
      baseUrl: 'http://localhost:8080/fhir',
      version: 'R4',
      authType: 'none'
    });
  }

  async create(createClinicalRecordDto: CreateClinicalRecordDto) {
    try {
      this.logger.log(`Intentando crear registro clínico para paciente ${createClinicalRecordDto.ID_Patients}`);
      
      return await this.prisma.clinical_data.create({
        data: {
          ...createClinicalRecordDto,
          effectiveDate: createClinicalRecordDto.effectiveDate || new Date(),
        },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al crear registro clínico: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException(
            'No se encontró el paciente, médico o administrador especificado',
          );
        }
      }
      
      throw new InternalServerErrorException(
        'Error al crear el registro clínico. Por favor, verifica los datos e intenta nuevamente.',
      );
    }
  }

  async findOne(id: number) {
    try {
      this.logger.log(`Buscando registro clínico con ID ${id}`);
      
      const record = await this.prisma.clinical_data.findUnique({
        where: { ID_Clinical_data: id },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });

      if (!record) {
        throw new NotFoundException(`Historia clínica con ID ${id} no encontrada`);
      }

      return record;
    } catch (error) {
      this.logger.error(`Error al buscar registro clínico: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateClinicalRecordDto: UpdateClinicalRecordDto) {
    try {
      this.logger.log(`Actualizando registro clínico con ID ${id}`);
      
      return await this.prisma.clinical_data.update({
        where: { ID_Clinical_data: id },
        data: updateClinicalRecordDto,
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al actualizar registro clínico: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`No se encontró el registro clínico con ID ${id}`);
        }
      }
      
      throw new InternalServerErrorException(
        'Error al actualizar el registro clínico. Por favor, verifica los datos e intenta nuevamente.',
      );
    }
  }

  async generateDownloadableRecord(id: number) {
    try {
      this.logger.log(`Generando archivo descargable para registro clínico con ID ${id}`);
      
      // Obtener el registro clínico con sus relaciones
      const record = await this.prisma.clinical_data.findUnique({
        where: { ID_Clinical_data: id },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });

      if (!record) {
        throw new NotFoundException(`No se encontró el registro clínico con ID ${id}`);
      }

      // Crear un buffer para almacenar el PDF
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Capturar los chunks del PDF
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Título del documento
        doc.fontSize(20).text('REGISTRO CLÍNICO', { align: 'center' });
        doc.moveDown();

        // Información del paciente
        doc.fontSize(16).text('Información del Paciente', { underline: true });
        doc.fontSize(12).text(`Nombre: ${record.patient?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID: ${record.ID_Patients}`);
        doc.moveDown();

        // Información del médico
        doc.fontSize(16).text('Información del Médico', { underline: true });
        doc.fontSize(12).text(`Nombre: ${record.medic?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID: ${record.ID_medics}`);
        doc.moveDown();

        // Detalles del registro clínico
        doc.fontSize(16).text('Detalles del Registro', { underline: true });
        doc.fontSize(12).text(`Tipo: ${record.type}`);
        doc.fontSize(12).text(`Código: ${record.code}`);
        doc.fontSize(12).text(`Valor: ${record.value}`);
        doc.fontSize(12).text(`Unidad: ${record.unit}`);
        doc.fontSize(12).text(`Severidad: ${record.severity}`);
        doc.fontSize(12).text(`Fecha: ${record.effectiveDate ? format(new Date(record.effectiveDate), 'dd/MM/yyyy HH:mm') : 'No disponible'}`);
        doc.moveDown();

        // Información de creación
        doc.fontSize(12).text(`Creado por: ${record.admin?.Name || 'No disponible'}`);
        doc.fontSize(12).text(`ID de creación: ${record.create}`);
        doc.moveDown();

        // Pie de página
        doc.fontSize(10).text(`Documento generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'center' });
        doc.fontSize(10).text('Este documento es confidencial y contiene información médica protegida.', { align: 'center' });

        // Finalizar el PDF
        doc.end();
      });

      // Nombre del archivo
      const fileName = `registro_clinico_${id}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;

      return { fileBuffer: pdfBuffer, fileName };
    } catch (error) {
      this.logger.error(`Error al generar archivo descargable: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Error al generar el archivo descargable. Por favor, intenta nuevamente.',
      );
    }
  }

  // Transferencia del record medico entre doctores

  async TransferClinicalRecordDto(id: number, dto: TransferClinicalRecordDto) {
    try {
      this.logger.log(`Iniciando transferencia del registro clinico ${id} al medico ${dto.newMedId}`)

      const record = await this.prisma.clinical_data.findUnique({
        where: { ID_Clinical_data: id },
      });
      if (!record){
        throw new NotFoundException(`Registro clinico con id %{id} no encontrado`);
      }
      const medicExist = await this.prisma.medics.findUnique({
        where: { ID_medics: dto.newMedId },
      });
      if (!medicExist){
        throw new NotFoundException(`Medico con Id ${dto.newMedId} no encontrado`);
      }
      const updateRecord = await this.prisma.clinical_data.update({
        where: { ID_Clinical_data: id},
        data: { ID_medics: dto.newMedId },
        include: {
          patient: true,
          medic: true,
          admin: true,
        },
      });
      this.logger.log(`Transferencia completa: registro ${id} Asignado al medico ${dto.newMedId}`);
      return updateRecord;
    } catch (error) {
      this.logger.error(`Error al transferir el registro clinico: ${error.message}`, error.stack);

      throw new InternalServerErrorException(
        `Error al transferir el registro clinico. Por favor, Verifica los datos e intente nuevamente`,
      );
    }
  }
}


// ==================== FUNCIONALIDADES FHIR ====================

/**
 * Configura un servidor FHIR para integración
 */
async configureFhirServer(config: FhirServerConfigDto): Promise<void> {
  try {
    this.logger.log(`Configurando servidor FHIR: ${config.name}`);
    
    // Validar conectividad del servidor FHIR
    const isConnected = await this.testFhirConnection(config.baseUrl);
    if (!isConnected) {
      throw new BadRequestException(`No se puede conectar al servidor FHIR: ${config.baseUrl}`);
    }

    this.fhirServers.set(config.name, config);
    this.logger.log(`Servidor FHIR configurado exitosamente: ${config.name}`);
  } catch (error) {
    this.logger.error(`Error al configurar servidor FHIR: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Convierte un paciente local a formato FHIR
 */
private async convertPatientToFhir(patientId: number): Promise<FhirPatientDto> {
  const patient = await this.prisma.patients.findUnique({
    where: { ID_Patients: patientId }
  });

  if (!patient) {
    throw new NotFoundException(`Paciente con ID ${patientId} no encontrado`);
  }

  const fhirPatient: FhirPatientDto = {
    resourceType: 'Patient',
    id: patient.ID_Patients.toString(),
    identifier: [{
      use: 'official',
      system: 'http://salud-nc.com/patient-id',
      value: patient.DNI,
      type: 'DNI'
    }],
    active: true,
    name: [{
      use: 'official',
      family: patient.Lastname,
      given: [patient.Name],
      text: `${patient.Name} ${patient.Lastname}`
    }],
    telecom: patient.phone_number ? [{
      system: 'phone',
      value: patient.phone_number,
      use: 'mobile'
    }] : undefined,
    gender: this.mapGenderToFhir(patient.gender),
    birthDate: patient.Birthdate.toISOString().split('T')[0],
    address: patient.address ? [{
      use: 'home',
      type: 'physical',
      text: patient.address
    }] : undefined
  };

  if (patient.email) {
    fhirPatient.telecom = fhirPatient.telecom || [];
    fhirPatient.telecom.push({
      system: 'email',
      value: patient.email,
      use: 'home'
    });
  }

  return fhirPatient;
}

/**
 * Convierte un registro clínico a formato FHIR Observation
 */
private async convertClinicalRecordToFhirObservation(recordId: number): Promise<FhirObservationDto> {
  const record = await this.prisma.clinical_data.findUnique({
    where: { ID_Clinical_data: recordId },
    include: {
      patient: true,
      medic: true
    }
  });

  if (!record) {
    throw new NotFoundException(`Registro clínico con ID ${recordId} no encontrado`);
  }

  const fhirObservation: FhirObservationDto = {
    resourceType: 'Observation',
    id: record.ID_Clinical_data.toString(),
    status: FhirObservationStatus.FINAL,
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'survey',
        display: 'Survey'
      }],
      text: record.type
    }],
    code: {
      coding: [{
        system: 'http://salud-nc.com/clinical-codes',
        code: record.code || 'UNKNOWN',
        display: record.type
      }],
      text: record.type
    },
    subject: {
      reference: `Patient/${record.ID_Patients}`,
      display: record.patient ? `${record.patient.Name} ${record.patient.Lastname}` : 'Paciente'
    },
    effectiveDateTime: record.effectiveDate?.toISOString(),
    issued: new Date().toISOString(),
    performer: [{
      reference: `Practitioner/${record.ID_medics}`,
      display: record.medic ? `${record.medic.Name} ${record.medic.Lastname}` : 'Médico'
    }],
    note: record.severity ? `Severidad: ${record.severity}` : undefined
  };

  // Agregar valor según el tipo de dato
  if (record.value) {
    const numericValue = parseFloat(record.value);
    if (!isNaN(numericValue)) {
      fhirObservation.valueQuantity = {
        value: numericValue,
        unit: record.unit || '',
        system: 'http://unitsofmeasure.org',
        code: record.unit || ''
      };
    } else {
      fhirObservation.valueString = record.value;
    }
  }

  return fhirObservation;
}

/**
 * Sincroniza un paciente local con un servidor FHIR
 */
async syncPatientToFhir(dto: SyncPatientToFhirDto): Promise<any> {
  try {
    this.logger.log(`Sincronizando paciente ${dto.patientId} con servidor FHIR`);
    
    const fhirPatient = await this.convertPatientToFhir(parseInt(dto.patientId));
    const serverConfig = this.fhirServers.get(dto.fhirServerId || 'default');
    
    if (!serverConfig) {
      throw new BadRequestException(`Servidor FHIR no configurado: ${dto.fhirServerId}`);
    }

    // Enviar al servidor FHIR
    const response = await this.sendToFhirServer(
      serverConfig,
      'Patient',
      fhirPatient
    );

    // Actualizar el registro local con la información FHIR
    await this.prisma.patients.update({
      where: { ID_Patients: parseInt(dto.patientId) },
      data: {
        // Aquí podrías agregar campos para almacenar IDs FHIR si los tienes en el schema
      }
    });

    this.logger.log(`Paciente sincronizado exitosamente con FHIR: ${dto.patientId}`);
    return response;
  } catch (error) {
    this.logger.error(`Error al sincronizar paciente con FHIR: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Sincroniza un registro clínico con un servidor FHIR como Observation
 */
async syncClinicalRecordToFhir(dto: SyncClinicalRecordToFhirDto): Promise<any> {
  try {
    this.logger.log(`Sincronizando registro clínico ${dto.clinicalRecordId} con servidor FHIR`);
    
    const fhirObservation = await this.convertClinicalRecordToFhirObservation(parseInt(dto.clinicalRecordId));
    const serverConfig = this.fhirServers.get(dto.fhirServerId || 'default');
    
    if (!serverConfig) {
      throw new BadRequestException(`Servidor FHIR no configurado: ${dto.fhirServerId}`);
    }

    // Aplicar estado personalizado si se proporciona
    if (dto.status) {
      fhirObservation.status = dto.status;
    }

    // Enviar al servidor FHIR
    const response = await this.sendToFhirServer(
      serverConfig,
      'Observation',
      fhirObservation
    );

    // Actualizar el registro local con datos FHIR
    await this.prisma.clinical_data.update({
      where: { ID_Clinical_data: parseInt(dto.clinicalRecordId) },
      data: {
        fhirData: JSON.stringify(fhirObservation)
      }
    });

    this.logger.log(`Registro clínico sincronizado exitosamente con FHIR: ${dto.clinicalRecordId}`);
    return response;
  } catch (error) {
    this.logger.error(`Error al sincronizar registro clínico con FHIR: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Importa una observación desde un servidor FHIR
 */
async importObservationFromFhir(dto: ImportObservationFromFhirDto): Promise<any> {
  try {
    this.logger.log(`Importando observación FHIR: ${dto.fhirObservationId}`);
    
    const serverConfig = this.fhirServers.get('default');
    const fhirObservation = await this.getFromFhirServer(
      serverConfig,
      'Observation',
      dto.fhirObservationId
    );

    // Convertir observación FHIR a registro clínico local
    const clinicalRecord = await this.convertFhirObservationToClinicalRecord(
      fhirObservation,
      dto.patientId,
      dto.medicId,
      dto.adminId
    );

    const createdRecord = await this.create(clinicalRecord);
    
    this.logger.log(`Observación FHIR importada exitosamente: ${dto.fhirObservationId}`);
    return createdRecord;
  } catch (error) {
    this.logger.error(`Error al importar observación FHIR: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Obtiene todos los registros clínicos con datos FHIR
 */
async getClinicalRecordsWithFhir(): Promise<any[]> {
  try {
    const records = await this.prisma.clinical_data.findMany({
      where: {
        fhirData: {
          not: null
        }
      },
      include: {
        patient: true,
        medic: true,
        admin: true
      }
    });

    return records.map(record => ({
      ...record,
      fhirData: record.fhirData ? JSON.parse(record.fhirData as string) : null
    }));
  } catch (error) {
    this.logger.error(`Error al obtener registros con datos FHIR: ${error.message}`, error.stack);
    throw error;
  }
}

/**
 * Métodos AUXILIARES FHIR
 */
private mapGenderToFhir(gender: string): FhirGender {
  switch (gender?.toUpperCase()) {
    case 'MALE': return FhirGender.MALE;
    case 'FEMALE': return FhirGender.FEMALE;
    case 'OTHER': return FhirGender.OTHER;
    default: return FhirGender.UNKNOWN;
  }
}

private async testFhirConnection(baseUrl: string): Promise<boolean> {
  try {
    // Simulación de test de conectividad
    // En una implementación real, harías una petición HTTP al servidor FHIR
    this.logger.log(`Probando conectividad con servidor FHIR: ${baseUrl}`);
    return true; // Por ahora siempre retorna true
  } catch (error) {
    this.logger.error(`Error al probar conectividad FHIR: ${error.message}`);
    return false;
  }
}

private async sendToFhirServer(config: FhirServerConfigDto, resourceType: string, resource: any): Promise<any> {
  try {
    // Simulación de envío a servidor FHIR
    // En una implementación real, usarías fetch o axios para enviar al servidor
    this.logger.log(`Enviando ${resourceType} a servidor FHIR: ${config.baseUrl}`);
    
    const mockResponse = {
      resourceType,
      id: resource.id || Math.random().toString(36).substr(2, 9),
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      },
      ...resource
    };

    return mockResponse;
  } catch (error) {
    this.logger.error(`Error al enviar a servidor FHIR: ${error.message}`);
    throw new InternalServerErrorException('Error al comunicarse con el servidor FHIR');
  }
}

private async getFromFhirServer(config: FhirServerConfigDto, resourceType: string, id: string): Promise<any> {
  try {
    // Simulación de obtención desde servidor FHIR
    this.logger.log(`Obteniendo ${resourceType}/${id} desde servidor FHIR: ${config.baseUrl}`);
    
    // Mock de respuesta FHIR
    const mockObservation = {
      resourceType: 'Observation',
      id,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel'
        }]
      },
      subject: {
        reference: 'Patient/123'
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: 120,
        unit: 'mmHg',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]'
      }
    };

    return mockObservation;
  } catch (error) {
    this.logger.error(`Error al obtener desde servidor FHIR: ${error.message}`);
    throw new InternalServerErrorException('Error al comunicarse con el servidor FHIR');
  }
}

private async convertFhirObservationToClinicalRecord(
  fhirObservation: any,
  patientId?: string,
  medicId?: string,
  adminId?: string
): Promise<CreateClinicalRecordDto> {
  // Extraer información de la observación FHIR
  const code = fhirObservation.code?.coding?.[0]?.code || 'IMPORTED';
  const display = fhirObservation.code?.coding?.[0]?.display || fhirObservation.code?.text || 'Imported from FHIR';
  
  let value = '';
  let unit = '';
  
  if (fhirObservation.valueQuantity) {
    value = fhirObservation.valueQuantity.value?.toString() || '';
    unit = fhirObservation.valueQuantity.unit || '';
  } else if (fhirObservation.valueString) {
    value = fhirObservation.valueString;
  }

  // Obtener IDs por defecto si no se proporcionan
  const defaultPatientId = patientId ? parseInt(patientId) : await this.getDefaultPatientId();
  const defaultMedicId = medicId ? parseInt(medicId) : await this.getDefaultMedicId();
  const defaultAdminId = adminId ? parseInt(adminId) : await this.getDefaultAdminId();

  return {
    ID_Patients: defaultPatientId,
    type: display,
    code,
    value,
    unit,
    severity: 'Normal', // Valor por defecto
    effectiveDate: fhirObservation.effectiveDateTime || new Date().toISOString(),
    fhirData: JSON.stringify(fhirObservation),
    ID_medics: defaultMedicId,
    create: defaultAdminId
  };
}

private async getDefaultPatientId(): Promise<number> {
  const patient = await this.prisma.patients.findFirst();
  if (!patient) {
    throw new BadRequestException('No hay pacientes disponibles para importar datos FHIR');
  }
  return patient.ID_Patients;
}

private async getDefaultMedicId(): Promise<number> {
  const medic = await this.prisma.medics.findFirst();
  if (!medic) {
    throw new BadRequestException('No hay médicos disponibles para importar datos FHIR');
  }
  return medic.ID_medics;
}

private async getDefaultAdminId(): Promise<number> {
  const admin = await this.prisma.admins.findFirst();
  if (!admin) {
    throw new BadRequestException('No hay administradores disponibles para importar datos FHIR');
  }
  return admin.ID_Admins;
}

// ... existing code ...

