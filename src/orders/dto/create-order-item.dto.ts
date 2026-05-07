import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'The ID of the product', example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ description: 'The quantity of the product', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}
