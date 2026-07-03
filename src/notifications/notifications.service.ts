import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { Order } from '../orders/entities/order.entity';
import {
  NewOrderPayload,
  OrderStatusPayload,
  OrderRatedPayload,
} from './interfaces/notification-payloads.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  notifyNewOrder(order: Order): void {
    if (!this.gateway.server) {
      this.logger.warn('Gateway server not initialized. Skipping new order notification.');
      return;
    }

    const payload: NewOrderPayload = {
      orderId: order.id,
      customerName: `${order.customer?.firstName ?? 'Unknown'} ${order.customer?.lastName ?? ''}`,
      total: Number(order.totalAmount),
      createdAt: order.createdAt,
    };

    // Emitir a administradores y tenderos
    this.gateway.server.to('admin-room').emit('new-order', payload);
    this.gateway.server.to('tendero-room').emit('new-order', payload);
  }

  notifyOrderStatusChanged(order: Order, userId: number): void {
    if (!this.gateway.server) {
      this.logger.warn(
        `Gateway server not initialized. Skipping notification for order ${order.id}.`,
      );
      return;
    }

    const payload: OrderStatusPayload = {
      orderId: order.id,
      newStatus: order.status,
      updatedAt: order.updatedAt,
    };

    // Emitir al usuario dueño del pedido
    this.gateway.server
      .to(`user-room-${userId}`)
      .emit('order-status-changed', payload);

    // Emitir también a staff para que vean cambios en tiempo real
    this.gateway.server.to('admin-room').emit('order-status-changed', payload);
    this.gateway.server.to('tendero-room').emit('order-status-changed', payload);
  }

  notifyOrderRated(order: Order): void {
    if (!this.gateway.server) {
      this.logger.warn(`Gateway server not initialized. Skipping rating notification for order ${order.id}.`);
      return;
    }

    const payload: OrderRatedPayload = {
      orderId: order.id,
      rating: order.customerRating ?? 0,
      feedback: order.customerFeedback,
      confirmedAt: order.deliveryConfirmedAt?.toISOString() ?? new Date().toISOString(),
    };

    this.gateway.server.to('admin-room').emit('order-rated', payload);
    this.gateway.server.to('tendero-room').emit('order-rated', payload);
  }

  notifyOrderCancelled(order: Order): void {
    if (!this.gateway.server) {
      this.logger.warn('Gateway server not initialized. Skipping cancellation notification.');
      return;
    }

    const payload = {
      orderId: order.id,
      customerName: `${order.customer?.firstName ?? 'Unknown'} ${order.customer?.lastName ?? ''}`,
      total: Number(order.totalAmount),
      cancelledAt: new Date().toISOString(),
    };

    // Emitir a staff para que sepan que se cancelo
    this.gateway.server.to('admin-room').emit('order-cancelled', payload);
    this.gateway.server.to('tendero-room').emit('order-cancelled', payload);
  }
}
