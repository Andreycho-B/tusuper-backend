import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { Order } from '../orders/entities/order.entity';
import {
  NewOrderPayload,
  OrderStatusPayload,
} from './interfaces/notification-payloads.interface';

@Injectable()
export class NotificationsService {
  constructor(private readonly gateway: NotificationsGateway) {}

  notifyNewOrder(order: Order): void {
    const payload: NewOrderPayload = {
      orderId: order.id,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      total: Number(order.totalAmount),
      createdAt: order.createdAt,
    };

    // Emitir a administradores y tenderos
    this.gateway.server.to('admin-room').emit('new-order', payload);
    this.gateway.server.to('tendero-room').emit('new-order', payload);
  }

  notifyOrderStatusChanged(order: Order, userId: number): void {
    if (!this.gateway.server) {
      console.warn(
        `[NotificationsService] Gateway server not initialized. Skipping notification for order ${order.id}.`,
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
  }
}
