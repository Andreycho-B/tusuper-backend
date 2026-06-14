import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ClassSerializerInterceptor,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/auth.guard';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { UsersService } from '../../services/users/users.service';

import { CloudinaryService } from '../../../cloudinary/cloudinary.service';

import { UpdateProfileDto, UpdatePasswordDto } from '../../dtos/user.dto';

import { User } from '../../entities/user.entity';

import {
  imageUploadOptions,
  AVATAR_MAX_SIZE_BYTES,
} from '../../../common/upload/image-upload-options';

@ApiBearerAuth()
@ApiTags('Profile')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users/me')
export class ProfileController {
  constructor(
    private readonly usersService: UsersService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('password')
  @ApiOperation({ summary: 'Cambiar mi contraseña' })
  async updatePassword(
    @CurrentUser('userId') userId: number,

    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    return this.usersService.updatePassword(userId, updatePasswordDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', imageUploadOptions(AVATAR_MAX_SIZE_BYTES)),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir o cambiar foto de perfil' })
  async uploadAvatar(
    @CurrentUser('userId') userId: number,

    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const result = await this.cloudinaryService.uploadImage(
      file,
      'tusuper_avatars',
    );

    return this.usersService.updateAvatar(userId, result.secure_url);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete('avatar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar foto de perfil' })
  async removeAvatar(@CurrentUser('userId') userId: number): Promise<User> {
    return this.usersService.removeAvatar(userId);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar mi cuenta permanentemente' })
  async deleteMyAccount(
    @CurrentUser('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.usersService.deleteMyAccount(userId);
    return { message: 'Cuenta eliminada exitosamente' };
  }
}
