import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Product name', example: 'Leche entera 1L' })
  readonly name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '7702001041407',
  })
  readonly barcode?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Product description',
    example: 'Leche entera pasteurizada de 1 litro',
    required: false,
  })
  readonly description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product image URL',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/tusuper_products/sample.jpg',
  })
  readonly imageUrl?: string;

  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @ApiProperty({
    description: 'Product price (positive decimal)',
    example: 4500.5,
  })
  readonly price: number;

  @IsDefined()
  @IsInt()
  @Min(0)
  @ApiProperty({ description: 'Available stock (integer >= 0)', example: 100 })
  readonly stock: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Whether the product is active',
    example: true,
    required: false,
  })
  readonly isActive?: boolean;

  @IsDefined()
  @IsInt()
  @IsPositive()
  @ApiProperty({ description: 'Category ID', example: 1 })
  readonly categoryId: number;

  @IsDefined()
  @IsInt()
  @IsPositive()
  @ApiProperty({ description: 'Provider ID', example: 1 })
  readonly providerId: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por nombre o descripción del producto',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de categoría',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly categoryId?: number;
}
