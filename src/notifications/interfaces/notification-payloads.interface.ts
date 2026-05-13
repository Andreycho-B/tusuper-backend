import { OrderStatus } from '../../orders/domain/enums/order-status.enum';

export interface NewOrderPayload {
  orderId: number;
  customerName: string;
  total: number;
  createdAt: Date;
}

export interface OrderStatusPayload {
  orderId: number;
  newStatus: OrderStatus;
  updatedAt: Date;
}
