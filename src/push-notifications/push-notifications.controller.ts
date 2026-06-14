import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushNotificationsService } from './push-notifications.service';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SubscribeDto {
  @ApiProperty()
  @IsString()
  endpoint: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  keys?: { p256dh: string; auth: string };
}

class UnsubscribeDto {
  @ApiProperty()
  @IsString()
  endpoint: string;
}

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushNotificationsController {
  constructor(private readonly pushService: PushNotificationsService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Suscribirse a notificaciones push' })
  async subscribe(
    @CurrentUser('userId') userId: number,
    @Body() dto: SubscribeDto,
  ) {
    await this.pushService.subscribe(userId, dto);
    return { status: 'subscribed' };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Cancelar suscripcion push' })
  async unsubscribe(
    @CurrentUser('userId') userId: number,
    @Body() dto: UnsubscribeDto,
  ) {
    await this.pushService.unsubscribe(userId, dto.endpoint);
    return { status: 'unsubscribed' };
  }
}
