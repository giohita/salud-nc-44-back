import { IsString, IsOptional, IsArray, IsDateString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum FhirGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown'
}

export class FhirNameDto {
  @IsOptional()
  @IsString()
  use?: string; // usual | official | temp | nickname | anonymous | old | maiden

  @IsOptional()
  @IsString()
  family?: string; // Apellido

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  given?: string[]; // Nombres

  @IsOptional()
  @IsString()
  text?: string; // Nombre completo como texto
}

export class FhirTelecomDto {
  @IsOptional()
  @IsString()
  system?: string; // phone | fax | email | pager | url | sms | other

  @IsOptional()
  @IsString()
  value?: string; // El valor del contacto

  @IsOptional()
  @IsString()
  use?: string; // home | work | temp | old | mobile
}

export class FhirAddressDto {
  @IsOptional()
  @IsString()
  use?: string; // home | work | temp | old | billing

  @IsOptional()
  @IsString()
  type?: string; // postal | physical | both

  @IsOptional()
  @IsString()
  text?: string; // Dirección completa como texto

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  line?: string[]; // Líneas de dirección

  @IsOptional()
  @IsString()
  city?: string; // Ciudad

  @IsOptional()
  @IsString()
  district?: string; // Distrito

  @IsOptional()
  @IsString()
  state?: string; // Estado/Provincia

  @IsOptional()
  @IsString()
  postalCode?: string; // Código postal

  @IsOptional()
  @IsString()
  country?: string; // País
}

export class FhirIdentifierDto {
  @IsOptional()
  @IsString()
  use?: string; // usual | official | temp | secondary | old

  @IsOptional()
  @IsString()
  system?: string; // Sistema que asigna el identificador

  @IsString()
  value: string; // El valor del identificador (ej: DNI, CC)

  @IsOptional()
  @IsString()
  type?: string; // Tipo de identificador
}

export class FhirPatientDto {
  @IsString()
  resourceType: string = 'Patient';

  @IsOptional()
  @IsString()
  id?: string; // ID del recurso FHIR

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirIdentifierDto)
  identifier?: FhirIdentifierDto[]; // Identificadores (DNI, CC, etc.)

  @IsOptional()
  @IsString()
  active?: boolean; // Si el paciente está activo

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirNameDto)
  name?: FhirNameDto[]; // Nombres del paciente

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirTelecomDto)
  telecom?: FhirTelecomDto[]; // Información de contacto

  @IsOptional()
  @IsEnum(FhirGender)
  gender?: FhirGender; // Género

  @IsOptional()
  @IsDateString()
  birthDate?: string; // Fecha de nacimiento (YYYY-MM-DD)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FhirAddressDto)
  address?: FhirAddressDto[]; // Direcciones
}

// DTO para sincronizar paciente local con FHIR
export class SyncPatientToFhirDto {
  @IsString()
  patientId: string; // ID del paciente local

  @IsOptional()
  @IsString()
  fhirServerId?: string; // ID del servidor FHIR de destino

  @IsOptional()
  @IsString()
  fhirEndpoint?: string; // Endpoint FHIR personalizado
}

// DTO para importar paciente desde FHIR
export class ImportPatientFromFhirDto {
  @IsString()
  fhirPatientId: string; // ID del paciente en el sistema FHIR

  @IsOptional()
  @IsString()
  fhirEndpoint?: string; // Endpoint FHIR de origen

  @IsOptional()
  @IsString()
  adminId?: string; // ID del admin que realiza la importación
}