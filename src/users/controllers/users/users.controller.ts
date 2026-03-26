import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Modules } from '../../../auth/decorators/modules.decorator';
import { ModulesGuard } from '../../../auth/guards/modules.guard.guard';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CreateUserDto, UpdateUserDto } from '../../dtos/user.dto';
import { UsersService } from '../../services/users/users.service';
import { User } from '../../entities/user.entity';

@ApiBearerAuth()
@ApiTags('Users')
@Modules('users')
@UseGuards(JwtAuthGuard, ModulesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios retornada exitosamente' })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('userId', ParseIntPipe) userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Actualizar un usuario existente' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado por otro usuario' })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(userId, updateUserDto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Desactivar un usuario (eliminación lógica)' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('userId', ParseIntPipe) userId: number): Promise<User> {
    return this.usersService.remove(userId);
  }
}
