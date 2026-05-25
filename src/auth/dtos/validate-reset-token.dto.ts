import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @MaxLength(200, { message: 'El token no puede exceder 200 caracteres' })
  @ApiProperty()
  readonly token: string;
}
