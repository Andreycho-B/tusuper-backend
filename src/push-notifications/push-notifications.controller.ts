import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(PushNotificationsController.name);
  constructor(private readonly pushService: PushNotificationsService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Suscribirse a notificaciones push' })
  async subscribe(
    @CurrentUser('userId') userId: number,
    @Body() dto: SubscribeDto,
  ) {
    this.logger.log(
      `Push subscribe request for user ${userId}: ${dto.endpoint}`,
    );
    await this.pushService.subscribe(userId, dto);
    this.logger.log(`Push subscribed successfully for user ${userId}`);
    return { status: 'subscribed' };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Cancelar suscripcion push' })
  async unsubscribe(
    @CurrentUser('userId') userId: number,
    @Body() dto: UnsubscribeDto,
  ) {
    this.logger.log(
      `Push unsubscribe request for user ${userId}: ${dto.endpoint}`,
    );
    await this.pushService.unsubscribe(userId, dto.endpoint);
    this.logger.log(`Push unsubscribed successfully for user ${userId}`);
    return { status: 'unsubscribed' };
  }
}
