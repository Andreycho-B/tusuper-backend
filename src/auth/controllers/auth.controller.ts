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
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ValidateResetTokenDto } from '../dtos/validate-reset-token.dto';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  async googleAuth() {
    // Guard will handle redirection
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback de Google OAuth2' })
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/auth/social-callback?token=${result.access_token}`);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login exitoso. Devuelve token de acceso y perfil del usuario filtrado.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intente más tarde.',
  })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

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
    description: 'Datos inválidos o las contraseñas no coinciden.',
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado.' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Respuesta genérica para prevenir enumeración.',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar token de recuperación' })
  @ApiBody({ type: ValidateResetTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Devuelve validación booleana del token.',
  })
  async validateResetToken(@Body() body: ValidateResetTokenDto) {
    return this.authService.validateResetToken(body.token);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada.' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado.' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar estado de sesión y refrescar token' })
  @ApiResponse({
    status: 200,
    description: 'Sesión válida. Devuelve token refrescado y usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o usuario inactivo.',
  })
  async checkStatus(
    @Request() req: { user: { userId: number; role: string[] } },
  ) {
    return this.authService.checkStatus(req.user.userId);
  }
}
