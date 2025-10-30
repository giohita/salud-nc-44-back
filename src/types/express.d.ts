import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    ID_Patients?: number;
    userId?: number;
    dni: string;
    userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
    name?: string;
    lastname?: string;
    gender?: string;
  };
}
