import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @ApiProperty()
  readonly token: string;
}
