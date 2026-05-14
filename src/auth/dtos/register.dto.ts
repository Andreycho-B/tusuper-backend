import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
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
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  readonly password: string;

  // Confirm password will not be included in swagger responses and not exposed in User entity
  @ApiProperty({
    example: 'SecureP@ss1',
    description: 'Confirmación de la contraseña',
  })
  @IsString({ message: 'La confirmación de la contraseña debe ser una cadena' })
  @IsNotEmpty({ message: 'La confirmación de la contraseña es obligatoria' })
  readonly confirmPassword: string;
}
