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

    // Remove stale subscriptions for this user (different endpoint).
    // iOS PWAs generate a new endpoint when the service worker updates
    // or the app is reinstalled, causing duplicate notifications if
    // old subscriptions are not cleaned up.
    const deleted = await this.subRepo.delete({
      userId,
    } as any);
    if (deleted.affected && deleted.affected > 0) {
      this.logger.log(
        `Cleaned ${deleted.affected} stale push subscription(s) for user ${userId}`,
      );
    }

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

    const dataPayload: Record<string, unknown> = {
      ...(data || {}),
      url: data?.orderId ? `/account/orders/${data.orderId}` : undefined,
    };

    const payload = JSON.stringify({
      notification: notificationPayload,
      data: dataPayload,
    });

    this.logger.debug(`Push payload: ${payload}`);

    for (const sub of subs) {
      try {
        this.logger.debug(`Sending push to endpoint: ${sub.endpoint}`);
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
        this.logger.log(`Push sent successfully to user ${userId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Push failed for user ${userId}: ${msg}`);
        if (
          msg.includes('404') ||
          msg.includes('410') ||
          msg.includes('expired') ||
          msg.includes('unsubscribed')
        ) {
          await this.subRepo.delete({ id: sub.id });
          this.logger.log(`Deleted expired subscription for user ${userId}`);
        }
      }
    }
  }
}
