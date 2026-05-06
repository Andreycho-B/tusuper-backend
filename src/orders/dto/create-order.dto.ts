import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'The payment method used', example: 'CASH' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    description: 'The delivery address',
    example: '123 Main St, Apt 4B',
  })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({
    description: 'Additional instructions for delivery',
    example: 'Leave at the front door',
  })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiProperty({
    description: 'Direct contact phone for the delivery person',
    example: '+1234567890',
  })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({
    description: 'Amount of change needed if paying with cash',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashChangeRequested?: number;

  @ApiPropertyOptional({
    description: 'Delivery fee',
    example: 5.0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'Items included in the order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
