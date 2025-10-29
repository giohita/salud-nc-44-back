export class UserResponseDto {
  id: number;
  name: string;
  lastname: string;
  email: string;
  dni: string;
  phone_number?: string;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
}