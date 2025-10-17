import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, FoundUser } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import type { RefreshToken } from '@prisma/client';

type JwtPayload = {
  sub: number;
  dni: string;
  userType: 'ADMIN' | 'MEDIC' | 'PATIENT';
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async validateUser(dni: string, password: string): Promise<FoundUser> {
    const user = await this.usersService.findByDni(dni);
    if (!user) throw new UnauthorizedException('DNI o contraseña inválidos');

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) throw new UnauthorizedException('DNI o contraseña inválidos');

    return user;
  }

  private createPayload(user: FoundUser): JwtPayload {
    return {
      sub: user.id,
      dni: user.dni,
      userType: user.userType,
    };
  }

  async generateTokens(user: FoundUser) {
    const payload = this.createPayload(user);

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }

  async login(user: FoundUser) {
    const tokens = await this.generateTokens(user);
    
    // Temporalmente omitimos la creación del refreshToken en la base de datos
    // hasta que se resuelva el problema de migraciones
    
    return tokens;
  }

  async logout(userId: number, userType: 'ADMIN' | 'MEDIC' | 'PATIENT') {
    // Temporalmente omitimos la eliminación de refreshToken
    // hasta que se resuelva el problema de migraciones
    return true;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      // Temporalmente simplificamos la verificación del refreshToken
      // hasta que se resuelva el problema de migraciones
      const user = await this.usersService.findByDni(payload.dni);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Generamos nuevos tokens directamente
      return this.generateTokens(user);
    } catch (e) {
      console.error('Error refreshing token:', e);
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private parseDuration(durationStr: string) {
    if (durationStr.endsWith('d')) {
      const days = parseInt(durationStr.slice(0, -1), 10);
      return days * 24 * 60 * 60 * 1000;
    }
    if (durationStr.endsWith('m')) {
      const minutes = parseInt(durationStr.slice(0, -1), 10);
      return minutes * 60 * 1000;
    }
    if (durationStr.endsWith('s')) {
      const seconds = parseInt(durationStr.slice(0, -1), 10);
      return seconds * 1000;
    }
    return 7 * 24 * 60 * 60 * 1000;
  }
}
