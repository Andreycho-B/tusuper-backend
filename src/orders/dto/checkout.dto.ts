import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ description: 'ID of the product to checkout', example: 1 })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ description: 'Quantity to purchase', example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}
