import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../guards/auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { validateFrontendUrl } from '../constants';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesion con Google' })
  async googleAuth() {
    // Guard will handle redirection
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback de Google OAuth2' })
  async googleAuthRedirect(
    @Request() req: GoogleAuthRequest,
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req);
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
  @ApiResponse({
    status: 200,
    description:
      'Login exitoso. Devuelve token de acceso y perfil del usuario filtrado.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas.' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intente mas tarde.',
  })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description:
      'Usuario registrado exitosamente. Devuelve token de acceso y perfil del usuario.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos invalidos o las contrasenas no coinciden.',
  })
  @ApiResponse({ status: 409, description: 'El email ya esta registrado.' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intente mas tarde.',
  })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperacion de contrasena' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Respuesta generica para prevenir enumeracion.',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar token de recuperacion' })
  @ApiBody({ type: ValidateResetTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Devuelve validacion booleana del token.',
  })
  async validateResetToken(@Body() body: ValidateResetTokenDto) {
    return this.authService.validateResetToken(body.token);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contrasena con token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Contrasena actualizada.' })
  @ApiResponse({ status: 400, description: 'Token invalido o expirado.' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar estado de sesion y refrescar token' })
  @ApiResponse({
    status: 200,
    description: 'Sesion valida. Devuelve token refrescado y usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalido o usuario inactivo.',
  })
  async checkStatus(@Request() req: AuthenticatedRequest) {
    return this.authService.checkStatus(req.user.userId);
  }
}
