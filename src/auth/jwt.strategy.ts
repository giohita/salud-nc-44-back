import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: number;
  dni: string;
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
  name?: string;
  lastname?: string;
  gender?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }
async validate(payload: JwtPayload) {
  if (payload.userType === 'PATIENT') {
    return {
      ID_Patients: payload.sub, // ya es obligatorio aquí
      dni: payload.dni,
      userType: payload.userType,
      name: payload.name,
      lastname: payload.lastname,
      gender: payload.gender,
    };
  }
  return {
    userId: payload.sub,
    dni: payload.dni,
    userType: payload.userType,
    name: payload.name,
    lastname: payload.lastname,
    gender: payload.gender,
  };
}

 
}
