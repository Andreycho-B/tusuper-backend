import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ConfirmDeliveryDto {
  @ApiProperty({
    description: 'Customer rating for the delivery experience (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Optional feedback comment',
    required: false,
    maxLength: 500,
    example: '¡Excelente servicio!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}
