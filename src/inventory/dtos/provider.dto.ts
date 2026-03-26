import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Provider name', example: 'Alpina S.A.' })
  readonly name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Contact phone number',
    example: '+57 300 123 4567',
    required: false,
  })
  readonly phone?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({
    description: 'Contact email address',
    example: 'ventas@alpina.com',
    required: false,
  })
  readonly email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Physical address',
    example: 'Calle 10 #20-30, Bogotá',
    required: false,
  })
  readonly address?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
