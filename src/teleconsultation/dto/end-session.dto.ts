import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class EndSessionDto {
  @IsNotEmpty()
  @IsNumber()
  teleconsultationId: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}