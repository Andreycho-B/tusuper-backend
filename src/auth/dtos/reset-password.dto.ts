import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @ApiProperty()
  readonly token: string;

  @ApiProperty({
    description:
      'Nueva contraseña: mínimo 8 caracteres, debe incluir mayúscula, minúscula y un número',
    minLength: 8,
  })
  @IsStrongPassword()
  readonly newPassword: string;
}
