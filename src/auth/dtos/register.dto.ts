import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password.validator';

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
    description:
      'Contraseña: mínimo 8 caracteres, debe incluir mayúscula, minúscula y un número',
    minLength: 8,
  })
  @IsStrongPassword()
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
