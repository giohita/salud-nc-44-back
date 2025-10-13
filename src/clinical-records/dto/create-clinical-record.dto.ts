import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDate, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClinicalRecordDto {
  @IsNotEmpty()
  @IsNumber()
  ID_Patients: number;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  value: string;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsNotEmpty()
  @IsString()
  severity: string;

  @IsOptional()
  @IsISO8601()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  fhirData?: string;

  @IsNotEmpty()
  @IsNumber()
  ID_medics: number;

  @IsNotEmpty()
  @IsNumber()
  create: number;
}