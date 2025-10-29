// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(dto.dni, dto.password);
    const tokens = await this.authService.login(user);

    // Guardar refresh token en cookie httpOnly (ruta /auth/refresh)
    const isProd = this.config.get('NODE_ENV') === 'production';
    const refreshCookieMaxAge = this.authService['parseDuration'](
      this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    );

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: refreshCookieMaxAge,
    });

    return { access_token: tokens.accessToken };
  }

  // Opción: recibir refresh token en cookie (recomendada)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.refresh_token;
    // alternativa: si querés soportar body { refreshToken }:
    // const bodyToken = req.body?.refreshToken;
    const refreshToken = cookieToken;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    const newTokens = await this.authService.refresh(refreshToken);

    // rotamos cookie con nuevo refresh
    const isProd = this.config.get('NODE_ENV') === 'production';
    const refreshCookieMaxAge = this.authService['parseDuration'](
      this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    );

    res.cookie('refresh_token', newTokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: refreshCookieMaxAge,
    });

    return { access_token: newTokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Intent: borrar refresh tokens del usuario
    const cookieToken = req.cookies?.refresh_token;
    if (cookieToken) {
      // verificamos para obtener payload y borrar tokens por userId + userType
      try {
        const payload = await this.authService['jwtService'].verifyAsync(cookieToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        });
        const userId = payload.sub as number;
        const userType = payload.userType as string;
        await this.authService.logout(userId, userType as 'ADMIN' | 'MEDIC' | 'PATIENT');
      } catch (_) {
        // ignore if token invalid
      }
    }

    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { ok: true };
  }

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto) {
    const { resetToken } = await this.authService.requestPasswordReset(dto.dni);
    // Nota: en producción se enviaría por email/SMS. En desarrollo lo devolvemos.
    return { reset_token: resetToken };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }
}
