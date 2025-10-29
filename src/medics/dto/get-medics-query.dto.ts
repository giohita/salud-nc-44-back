import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum MedicSortBy {
  NAME = 'Name',
  LASTNAME = 'Lastname',
  DNI = 'DNI',
  EMAIL = 'email',
  SPECIALTY = 'specialty',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMedicsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsString({ message: 'La especialidad debe ser una cadena de texto' })
  @Transform(({ value }) => value?.trim())
  specialty?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;

  @IsOptional()
  @IsEnum(MedicSortBy, { 
    message: 'sortBy debe ser uno de: Name, Lastname, DNI, email, specialty, createdAt, updatedAt' 
  })
  sortBy?: MedicSortBy = MedicSortBy.NAME;

  @IsOptional()
  @IsEnum(SortOrder, { 
    message: 'sortOrder debe ser "asc" o "desc"' 
  })
  sortOrder?: SortOrder = SortOrder.ASC;
}