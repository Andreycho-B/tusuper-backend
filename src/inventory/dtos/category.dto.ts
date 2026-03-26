import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Category name', example: 'Lácteos' })
  readonly name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Category description',
    example: 'Productos derivados de la leche',
    required: false,
  })
  readonly description?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
