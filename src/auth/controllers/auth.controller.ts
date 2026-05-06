import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from '../dtos/login.dto';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
