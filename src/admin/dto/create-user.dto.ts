import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  Name: string;

  @IsNotEmpty()
  @IsString()
  Lastname: string;

  @IsNotEmpty()
  @IsString()
  DNI: string;

  @IsNotEmpty()
  @IsEmail()
  Email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  Phone_number?: string;

  @IsNotEmpty({ groups: ['MEDIC', 'PATIENT'] })
  @IsOptional({ groups: ['ADMIN'] })
  @IsEnum(Gender)
  gender: Gender;

  @IsNotEmpty()
  @IsEnum(['ADMIN', 'MEDIC', 'PATIENT'])
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
}