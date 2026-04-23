import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Product name', example: 'Leche entera 1L' })
  readonly name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Product description',
    example: 'Leche entera pasteurizada de 1 litro',
    required: false,
  })
  readonly description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @ApiProperty({
    description: 'Product price (positive decimal)',
    example: 4500.5,
  })
  readonly price: number;

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

  @IsInt()
  @IsPositive()
  @ApiProperty({ description: 'Category ID', example: 1 })
  readonly categoryId: number;

  @IsInt()
  @IsPositive()
  @ApiProperty({ description: 'Provider ID', example: 1 })
  readonly providerId: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
