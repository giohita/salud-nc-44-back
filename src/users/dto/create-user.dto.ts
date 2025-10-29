import { IsString, IsEmail, IsOptional, IsEnum, IsDateString, MinLength, IsNotEmpty } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';

  @IsString()
  @IsNotEmpty()
  DNI: string;

  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsString()
  @IsNotEmpty()
  Lastname: string;

  @IsEmail()
  @IsOptional()
  Email?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  Phone_number?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  Birthdate?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  schedule?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  email?: string; // Para médicos y pacientes (minúscula)

  @IsOptional()
  phone_number?: string; // Para médicos y pacientes (minúscula)
}