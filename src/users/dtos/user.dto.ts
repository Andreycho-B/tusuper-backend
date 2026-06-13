import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  readonly firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  readonly lastName: string;

  @ApiProperty({
    example: 'juan.perez@correo.com',
    description: 'Correo electrónico único del usuario',
  })
  @IsEmail({}, { message: 'El email debe ser un correo electrónico válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(254, { message: 'El email no puede exceder 254 caracteres' })
  readonly email: string;

  @ApiProperty({
    example: 'SecureP@ss1',
    description:
      'Contraseña: mínimo 8 caracteres, debe incluir mayúscula, minúscula y un número',
    minLength: 8,
  })
  @IsStrongPassword()
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  readonly password: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo del usuario',
    default: true,
  })
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  @IsOptional()
  readonly isActive?: boolean;

  @ApiProperty({
    example: [1, 2],
    description: 'IDs de los roles asignados al usuario',
    type: [Number],
  })
  @IsArray({ message: 'roleIds debe ser un arreglo' })
  @IsInt({ each: true, message: 'Cada roleId debe ser un número entero' })
  @Type(() => Number)
  readonly roleIds: number[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan', description: 'Nombre' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readonly firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Apellido' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readonly lastName?: string;

  @ApiPropertyOptional({ example: 'Juancho', description: 'Alias' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readonly displayName?: string;

  @ApiPropertyOptional({
    example: 'https://avatar.com/me.png',
    description: 'URL de la foto',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  readonly avatarUrl?: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  readonly currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña: mínimo 8 caracteres, debe incluir mayúscula, minúscula y un número',
    minLength: 8,
  })
  @IsStrongPassword()
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  readonly newPassword: string;
}
