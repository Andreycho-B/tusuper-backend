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

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 86400_000,
};

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
  ) {}

  private setTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'prod';
    res.cookie('token', token, {
      ...COOKIE_OPTIONS,
      secure: isProduction,
    });
  }

  private clearTokenCookie(res: Response): void {
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'prod',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
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
    this.setTokenCookie(res, result.access_token);
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
    const result = this.authService.login(user);
    this.setTokenCookie(res, result.access_token);
    return result;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(body);
    this.setTokenCookie(res, result.access_token);
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

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Get('check-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar estado de sesion y refrescar token' })
  async checkStatus(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.checkStatus(req.user.userId);
    this.setTokenCookie(res, result.access_token);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesion y revocar token' })
  async logout(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { jti, exp } = req.user as any;
    if (jti) {
      await this.authService.logout(jti, exp);
    }
    this.clearTokenCookie(res);
    return { message: 'Sesion cerrada exitosamente' };
  }
}
