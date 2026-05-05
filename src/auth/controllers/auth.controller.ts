import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto } from '../dtos/login.dto';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/auth.guard';
import { User } from '../../users/entities/user.entity';
import { Request } from 'express';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Get('check-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revalidar sesión y rotar token' })
  @ApiResponse({
    status: 200,
    description: 'Sesión válida. Devuelve perfil actualizado y token rotado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o sesión expirada.',
  })
  checkAuthStatus(@Req() req: Request & { user: User }) {
    return this.authService.checkAuthStatus(req.user);
  }
}
