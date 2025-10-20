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

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + this.parseDuration(this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        expiresAt,
        userType: user.userType,
        userId: user.id,
      },
    });

    return tokens;
  }

  async logout(userId: number, userType: 'ADMIN' | 'MEDIC' | 'PATIENT') {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, userType },
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;
      const userType = payload.userType;

      const tokens: RefreshToken[] = await this.prisma.refreshToken.findMany({
        where: { userId, userType },
      });

      // Verificamos cuál coincide con el token recibido
      let matchedToken: RefreshToken | null = null;
      for (const t of tokens) {
        const ok = await bcrypt.compare(refreshToken, t.tokenHash);
        if (ok) {
          matchedToken = t;
          break;
        }
      }

      if (!matchedToken) throw new UnauthorizedException('Refresh token inválido');

      // Obtenemos el usuario
      const user = await this.usersService.findByDni(payload.dni);
      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      // Eliminamos el refresh token usado
      await this.prisma.refreshToken.delete({ where: { id: matchedToken.id } });

      // Generamos nuevos tokens y guardamos el nuevo refresh token
      const newTokens = await this.generateTokens(user);
      const newHash = await bcrypt.hash(newTokens.refreshToken, 10);
      const expiresAt = new Date(
        Date.now() + this.parseDuration(this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d'),
      );

      await this.prisma.refreshToken.create({
        data: {
          tokenHash: newHash,
          expiresAt,
          userType: user.userType,
          userId: user.id,
        },
      });

      return { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken };
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

  async requestPasswordReset(dni: string): Promise<{ resetToken: string }> {
    const user = await this.usersService.findByDni(dni);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const payload = {
      sub: user.id,
      dni: user.dni,
      userType: user.userType,
      action: 'password_reset' as const,
    };

    const resetToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_RESET_SECRET') || this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_RESET_EXPIRES_IN') || '15m',
    });

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<any>(token, {
        secret: this.config.get('JWT_RESET_SECRET') || this.config.get('JWT_SECRET'),
      });

      if (!payload || payload.action !== 'password_reset') {
        throw new UnauthorizedException('Token de recuperación inválido');
      }

      const user = await this.usersService.findByDni(payload.dni);
      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      switch (user.userType) {
        case 'ADMIN':
          await this.prisma.admins.update({
            where: { ID_Admins: user.id },
            data: { passwordHash: hashedPassword },
          });
          break;
        case 'MEDIC':
          await this.prisma.medics.update({
            where: { ID_medics: user.id },
            data: { passwordHash: hashedPassword },
          });
          break;
        case 'PATIENT':
          await this.prisma.patients.update({
            where: { ID_Patients: user.id },
            data: { passwordHash: hashedPassword },
          });
          break;
        default:
          throw new UnauthorizedException('Tipo de usuario inválido');
      }

      return true;
    } catch (e) {
      throw new UnauthorizedException('Token de recuperación inválido o expirado');
    }
  }
}
