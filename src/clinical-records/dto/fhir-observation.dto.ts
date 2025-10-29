import { IsString, IsOptional, IsArray, IsDateString, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum FhirObservationStatus {
  REGISTERED = 'registered',
  PRELIMINARY = 'preliminary',
  FINAL = 'final',
  AMENDED = 'amended',
  CORRECTED = 'corrected',
  CANCELLED = 'cancelled',
  ENTERED_IN_ERROR = 'entered-in-error',
  UNKNOWN = 'unknown'
}

export class FhirCodingDto {
  @IsOptional()
  @IsString()
  system?: string; // Sistema de codificación (ej: LOINC, SNOMED)

  @IsOptional()
  @IsString()
  version?: string; // Versión del sistema

  @IsString()
  code: string; // Código

  @IsOptional()
  @IsString()
  display?: string; // Descripción legible del código

  @IsOptional()
  @IsString()
  userSelected?: boolean; // Si fue seleccionado por el usuario
}

export class FhirCodeableConceptDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirCodingDto)
  coding?: FhirCodingDto[]; // Códigos

  @IsOptional()
  @IsString()
  text?: string; // Descripción en texto libre
}

export class FhirQuantityDto {
  @IsOptional()
  @IsNumber()
  value?: number; // Valor numérico

  @IsOptional()
  @IsString()
  comparator?: string; // < | <= | >= | >

  @IsOptional()
  @IsString()
  unit?: string; // Unidad legible

  @IsOptional()
  @IsString()
  system?: string; // Sistema de unidades (ej: UCUM)

  @IsOptional()
  @IsString()
  code?: string; // Código de la unidad
}

export class FhirReferenceDto {
  @IsOptional()
  @IsString()
  reference?: string; // Referencia al recurso (ej: Patient/123)

  @IsOptional()
  @IsString()
  type?: string; // Tipo de recurso

  @IsOptional()
  @IsString()
  identifier?: string; // Identificador alternativo

  @IsOptional()
  @IsString()
  display?: string; // Descripción del recurso referenciado
}

export class FhirObservationDto {
  @IsString()
  resourceType: string = 'Observation';

  @IsOptional()
  @IsString()
  id?: string; // ID del recurso FHIR

  @IsEnum(FhirObservationStatus)
  status: FhirObservationStatus; // Estado de la observación

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirCodeableConceptDto)
  category?: FhirCodeableConceptDto[]; // Categoría (vital-signs, laboratory, etc.)

  @ValidateNested()
  @Type(() => FhirCodeableConceptDto)
  code: FhirCodeableConceptDto; // Qué se observó

  @IsOptional()
  @ValidateNested()
  @Type(() => FhirReferenceDto)
  subject?: FhirReferenceDto; // Paciente o grupo

  @IsOptional()
  @IsDateString()
  effectiveDateTime?: string; // Cuándo se realizó la observación

  @IsOptional()
  @IsDateString()
  issued?: string; // Cuándo se emitió el resultado

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirReferenceDto)
  performer?: FhirReferenceDto[]; // Quién realizó la observación

  // Valores de la observación (solo uno debe estar presente)
  @IsOptional()
  @ValidateNested()
  @Type(() => FhirQuantityDto)
  valueQuantity?: FhirQuantityDto; // Valor como cantidad

  @IsOptional()
  @IsString()
  valueString?: string; // Valor como string

  @IsOptional()
  @ValidateNested()
  @Type(() => FhirCodeableConceptDto)
  valueCodeableConcept?: FhirCodeableConceptDto; // Valor como concepto codificado

  @IsOptional()
  @IsString()
  valueBoolean?: boolean; // Valor booleano

  @IsOptional()
  @IsDateString()
  valueDateTime?: string; // Valor como fecha/hora

  @IsOptional()
  @ValidateNested()
  @Type(() => FhirCodeableConceptDto)
  interpretation?: FhirCodeableConceptDto; // Interpretación del resultado

  @IsOptional()
  @IsString()
  note?: string; // Comentarios adicionales
}

// DTO para sincronizar registro clínico con FHIR Observation
export class SyncClinicalRecordToFhirDto {
  @IsString()
  clinicalRecordId: string; // ID del registro clínico local

  @IsOptional()
  @IsString()
  fhirServerId?: string; // ID del servidor FHIR de destino

  @IsOptional()
  @IsString()
  fhirEndpoint?: string; // Endpoint FHIR personalizado

  @IsOptional()
  @IsEnum(FhirObservationStatus)
  status?: FhirObservationStatus; // Estado de la observación FHIR
}

// DTO para importar observación desde FHIR
export class ImportObservationFromFhirDto {
  @IsString()
  fhirObservationId: string; // ID de la observación en el sistema FHIR

  @IsOptional()
  @IsString()
  fhirEndpoint?: string; // Endpoint FHIR de origen

  @IsOptional()
  @IsString()
  patientId?: string; // ID del paciente local para asociar

  @IsOptional()
  @IsString()
  medicId?: string; // ID del médico local para asociar

  @IsOptional()
  @IsString()
  adminId?: string; // ID del admin que realiza la importación
}

// DTO para configuración de servidor FHIR
export class FhirServerConfigDto {
  @IsString()
  name: string; // Nombre del servidor FHIR

  @IsString()
  baseUrl: string; // URL base del servidor FHIR

  @IsOptional()
  @IsString()
  version?: string; // Versión FHIR (R4, R5, etc.)

  @IsOptional()
  @IsString()
  authType?: string; // Tipo de autenticación (bearer, basic, oauth2)

  @IsOptional()
  @IsString()
  authToken?: string; // Token de autenticación

  @IsOptional()
  @IsString()
  username?: string; // Usuario para autenticación básica

  @IsOptional()
  @IsString()
  password?: string; // Contraseña para autenticación básica
}