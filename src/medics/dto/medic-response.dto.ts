import { Exclude, Expose, Type } from 'class-transformer';

export class AdminInfoDto {
  @Expose()
  ID_Admins: number;

  @Expose()
  Name: string;

  @Expose()
  Lastname: string;
}

export class PatientInfoDto {
  @Expose()
  Name: string;

  @Expose()
  Lastname: string;

  @Expose()
  DNI: string;
}

export class AppointmentInfoDto {
  @Expose()
  ID_Appointments: number;

  @Expose()
  appointmentDatetime: Date;

  @Expose()
  status: string;

  @Expose()
  appointmentType: string;

  @Expose()
  @Type(() => PatientInfoDto)
  patient: PatientInfoDto;
}

export class MedicStatsDto {
  @Expose()
  appointments: number;

  @Expose()
  teleconsultations: number;

  @Expose()
  clinical_data: number;
}

export class MedicResponseDto {
  @Expose()
  ID_medics: number;

  @Expose()
  DNI: string;

  @Expose()
  Name: string;

  @Expose()
  Lastname: string;

  @Expose()
  email: string;

  @Expose()
  phone_number?: string;

  @Expose()
  gender?: string;

  @Expose()
  Birthdate?: Date;

  @Expose()
  specialty?: string;

  @Expose()
  schedule?: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => AdminInfoDto)
  admin?: AdminInfoDto;

  @Expose()
  @Type(() => MedicStatsDto)
  _count?: MedicStatsDto;

  @Expose()
  @Type(() => AppointmentInfoDto)
  appointments?: AppointmentInfoDto[];

  // Excluir campos sensibles
  @Exclude()
  passwordHash?: string;

  @Exclude()
  create?: number;
}

export class PaginationDto {
  @Expose()
  currentPage: number;

  @Expose()
  totalPages: number;

  @Expose()
  totalItems: number;

  @Expose()
  itemsPerPage: number;

  @Expose()
  hasNextPage: boolean;

  @Expose()
  hasPrevPage: boolean;
}

export class FiltersDto {
  @Expose()
  search?: string;

  @Expose()
  specialty?: string;

  @Expose()
  isActive?: boolean;

  @Expose()
  sortBy?: string;

  @Expose()
  sortOrder?: string;
}

export class GetMedicsResponseDto {
  @Expose()
  @Type(() => MedicResponseDto)
  medics: MedicResponseDto[];

  @Expose()
  @Type(() => PaginationDto)
  pagination: PaginationDto;

  @Expose()
  @Type(() => FiltersDto)
  filters: FiltersDto;
}

export class AvailableMedicDto {
  @Expose()
  ID_medics: number;

  @Expose()
  DNI: string;

  @Expose()
  Name: string;

  @Expose()
  Lastname: string;

  @Expose()
  email: string;

  @Expose()
  specialty?: string;

  @Expose()
  schedule?: string;

  @Expose()
  @Type(() => MedicStatsDto)
  _count?: MedicStatsDto;

  @Exclude()
  passwordHash?: string;
}

export class SpecialtiesResponseDto {
  @Expose()
  specialties: string[];

  @Expose()
  total: number;
}