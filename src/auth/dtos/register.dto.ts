import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class RegisterDto {
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

  // Confirm password will not be included in swagger responses and not exposed in User entity
  @ApiProperty({
    example: 'SecureP@ss1',
    description: 'Confirmación de la contraseña',
  })
  @IsString({ message: 'La confirmación de la contraseña debe ser una cadena' })
  @IsNotEmpty({ message: 'La confirmación de la contraseña es obligatoria' })
  @MaxLength(128, {
    message: 'La confirmación no puede exceder 128 caracteres',
  })
  readonly confirmPassword: string;
}
