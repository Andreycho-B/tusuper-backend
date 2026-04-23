import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

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
