import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEmail,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  readonly firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  readonly lastName: string;

  @ApiProperty({
    example: 'juan.perez@correo.com',
    description: 'Correo electrónico único del usuario',
  })
  @IsEmail({}, { message: 'El email debe ser un correo electrónico válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  readonly email: string;

  @ApiProperty({
    example: 'SecureP@ss1',
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
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