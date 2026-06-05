import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'The payment method used', example: 'CASH' })
  @IsString()
  @MaxLength(50)
  paymentMethod: string;

  @ApiProperty({
    description: 'The delivery address',
    example: '123 Main St, Apt 4B',
  })
  @IsString()
  @MaxLength(500)
  deliveryAddress: string;

  @ApiPropertyOptional({
    description: 'Additional instructions for delivery',
    example: 'Leave at the front door',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryNotes?: string;

  @ApiProperty({
    description: 'Direct contact phone for the delivery person',
    example: '3001234567',
  })
  @IsString()
  @Matches(/^3\d{9}$/, {
    message: 'El teléfono debe tener exactamente 10 dígitos y empezar por 3',
  })
  contactPhone: string;

  @ApiPropertyOptional({
    description: 'Amount of change needed if paying with cash',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashChangeRequested?: number;

  @ApiPropertyOptional({
    description: 'Delivery fee',
    example: 5,
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
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
