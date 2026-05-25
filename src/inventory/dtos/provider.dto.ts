import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ description: 'Provider name', example: 'Alpina S.A.' })
  readonly name: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be a valid 10-digit number' })
  @ApiProperty({
    description: 'Contact phone number',
    example: '3001234567',
    required: false,
  })
  readonly phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({
    description: 'Contact email address',
    example: 'ventas@alpina.com',
    required: false,
  })
  readonly email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiProperty({
    description: 'Physical address',
    example: 'Calle 10 #20-30, Bogotá',
    required: false,
  })
  readonly address?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
