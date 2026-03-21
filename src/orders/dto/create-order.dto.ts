import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { OrderStatus } from '../domain/enums/order-status.enum';
import { PaymentStatus } from '../domain/enums/payment-status.enum';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'The ID of the customer placing the order', example: 123 })
  @IsInt()
  customerId: number;

  @ApiPropertyOptional({
    description: 'The status of the order',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ description: 'The payment method used', example: 'Credit Card' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'The payment status',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({ description: 'The delivery address', example: '123 Main St, Apt 4B' })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({ description: 'Additional instructions for delivery', example: 'Leave at the front door' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiProperty({ description: 'Total amount of the order', example: 45.99 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Delivery fee for the logistics', example: 5.0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiProperty({ description: 'Direct contact phone for the delivery person', example: '+1234567890' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ description: 'Amount of change needed if paying with cash', example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashChangeRequested?: number;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Items included in the order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
