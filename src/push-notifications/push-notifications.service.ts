import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './push-subscription.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    const vapidPublic = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const mailto =
      this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@tusuper.com';

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(mailto, vapidPublic, vapidPrivate);
      this.logger.log('VAPID keys configured');
    } else {
      this.logger.warn(
        'VAPID keys not set - push notifications will not be sent',
      );
    }
  }

  async subscribe(
    userId: number,
    subscription: { endpoint: string; keys?: { p256dh: string; auth: string } },
  ): Promise<void> {
    const existing = await this.subRepo.findOne({
      where: { userId, endpoint: subscription.endpoint },
    });
    if (existing) return;

    const sub = this.subRepo.create();
    sub.userId = userId;
    sub.endpoint = subscription.endpoint;
    sub.p256dh = subscription.keys?.p256dh || null;
    sub.auth = subscription.keys?.auth || null;
    await this.subRepo.save(sub);
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.subRepo.delete({ userId, endpoint });
  }

  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const subs = await this.subRepo.find({ where: { userId } });
    if (subs.length === 0) {
      this.logger.log(`No push subscriptions for user ${userId} - skipping`);
      return;
    }

    this.logger.log(`Sending push to user ${userId}: "${title}" (${subs.length} devices)`);

    // Format required by @angular/service-worker (ngsw-worker.js):
    // { notification: { title, body, icon }, data: { ... } }
    const notificationPayload = {
      title,
      body,
      icon: '/branding/tusuper-logo-new.png',
    };

    // Include url in initial object to satisfy TypeScript
    const dataPayload: Record<string, unknown> = {
      ...(data || {}),
      onActionClick: {
        default: { operation: 'openWindow' },
      },
      url: data?.orderId ? `/account/orders/${data.orderId}` : undefined,
    };

    const payload = JSON.stringify({
      notification: notificationPayload,
      data: dataPayload,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh || '',
              auth: sub.auth || '',
            },
          },
          payload,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('404') ||
          msg.includes('410') ||
          msg.includes('expired') ||
          msg.includes('unsubscribed')
        ) {
          await this.subRepo.delete({ id: sub.id });
        } else {
          this.logger.warn(`Push failed for user ${userId}: ${msg}`);
        }
      }
    }
  }
}
