import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El formato del email es inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(254, { message: 'El email no puede exceder 254 caracteres' })
  @ApiProperty()
  readonly email: string;
}
