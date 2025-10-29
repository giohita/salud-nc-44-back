import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  dni: string;

  @IsString()
  password: string;
}
