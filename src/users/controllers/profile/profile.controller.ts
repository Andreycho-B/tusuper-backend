import {

  Body,

  Controller,

  Get,

  Patch,

  UseGuards,

  UseInterceptors,

  ClassSerializerInterceptor,

} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/auth.guard';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { UsersService } from '../../services/users/users.service';

import { UpdateProfileDto, UpdatePasswordDto } from '../../dtos/user.dto';

import { User } from '../../entities/user.entity';



@ApiBearerAuth()

@ApiTags('Profile')

@UseGuards(JwtAuthGuard)

@UseInterceptors(ClassSerializerInterceptor)

@Controller('users/me')

export class ProfileController {

  constructor(private readonly usersService: UsersService) {}



  @Get('profile')

  @ApiOperation({ summary: 'Obtener mi perfil' })

  async getProfile(@CurrentUser('userId') userId: number): Promise<User> {

    return this.usersService.findOne(userId);

  }



  @Patch('profile')

  @ApiOperation({ summary: 'Actualizar mi perfil' })

  async updateProfile(

    @CurrentUser('userId') userId: number,

    @Body() updateProfileDto: UpdateProfileDto,

  ): Promise<User> {

    return this.usersService.updateProfile(userId, updateProfileDto);

  }



  @Patch('password')

  @ApiOperation({ summary: 'Cambiar mi contraseña' })

  async updatePassword(

    @CurrentUser('userId') userId: number,

    @Body() updatePasswordDto: UpdatePasswordDto,

  ): Promise<void> {

    return this.usersService.updatePassword(userId, updatePasswordDto);

  }

}

