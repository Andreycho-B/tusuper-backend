import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({
    example: 'users',
    description: 'Nombre del módulo del sistema',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'User management module',
    description: 'Descripción del módulo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
