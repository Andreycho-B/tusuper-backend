import {
  Body,
  Controller,
  Delete,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { GoogleAuthRequest } from '../interfaces/google-user.interface';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ValidateResetTokenDto } from '../dtos/validate-reset-token.dto';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { JwtAuthGuard } from '../guards/auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { validateFrontendUrl } from '../constants';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

const COOKIE_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
};

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
  ) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'prod';
    const accessTtl = this.configService.get<number>('config.jwt.expiresIn', 900);
    res.cookie('token', accessToken, {
      ...COOKIE_BASE,
      secure: isProduction,
      maxAge: accessTtl * 1000, // match JWT_EXPIRES_IN
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_BASE,
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60_000, // 7 dias
    });
  }

  private clearAuthCookies(res: Response): void {
    res.cookie('token', '', { ...COOKIE_BASE, secure: process.env.NODE_ENV === 'prod', maxAge: 0 });
    res.cookie('refresh_token', '', { ...COOKIE_BASE, secure: process.env.NODE_ENV === 'prod', maxAge: 0 });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesion con Google' })
  async googleAuth() {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback de Google OAuth2' })
  async googleAuthRedirect(
    @Request() req: GoogleAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(req);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    const frontendUrl = validateFrontendUrl(this.configService);
    res.redirect(
      `${frontendUrl}/auth/social-callback#token=${result.access_token}`,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion y obtener JWT' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(body.email, body.password);
    const result = await this.authService.login(user);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(body);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperacion de contrasena' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(body);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar token de recuperacion' })
  @ApiBody({ type: ValidateResetTokenDto })
  async validateResetToken(@Body() body: ValidateResetTokenDto) {
    return this.passwordResetService.validateResetToken(body.token);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contrasena con token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(body);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Get('check-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar estado de sesion y refrescar token' })
  async checkStatus(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.checkStatus(req.user.userId);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesion y revocar token' })
  async logout(
    @Request() req: AuthenticatedRequest & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { jti, exp } = req.user as any;
    const refreshToken = req.cookies?.['refresh_token'];
    await this.authService.logout(jti, exp, refreshToken);
    this.clearAuthCookies(res);
    return { message: 'Sesion cerrada exitosamente' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar access token usando refresh token' })
  async refresh(
    @Request() req: { cookies: Record<string, string>; body: Record<string, string>; headers: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.body?.refresh_token
      || req.cookies?.['refresh_token']
      || req.headers['x-refresh-token'] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }
}
