// src/auth/dto/forgot-password.dto.ts
import { IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @Length(7, 12)
  dni: string;
}