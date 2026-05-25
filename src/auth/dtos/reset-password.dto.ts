import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @MaxLength(200, { message: 'El token no puede exceder 200 caracteres' })
  @ApiProperty()
  readonly token: string;

  @ApiProperty({
    description:
      'Nueva contraseña: mínimo 8 caracteres, debe incluir mayúscula, minúscula y un número',
    minLength: 8,
  })
  @IsStrongPassword()
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  readonly newPassword: string;
}
