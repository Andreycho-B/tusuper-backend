import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'The ID of the product', example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ description: 'The quantity of the product', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'The unit price of the product', example: 15.5 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'The total price for this item (quantity * unitPrice)', example: 31.0 })
  @IsNumber()
  @Min(0)
  subTotal: number;
}
