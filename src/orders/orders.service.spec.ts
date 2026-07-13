import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../inventory/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { OrderStatus } from './domain/enums/order-status.enum';
import { PaymentStatus } from './domain/enums/payment-status.enum';

function makeQbChain(opts?: { getOneResult?: any }) {
  const chain: any = {};
  chain.setLock = vi.fn(() => chain);
  chain.innerJoinAndSelect = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.getOne = vi.fn().mockResolvedValue(opts?.getOneResult ?? undefined);
  return chain;
}

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Repository<Order>;
  let orderItemRepo: Repository<OrderItem>;
  let productRepo: Repository<Product>;
  let dataSource: DataSource;

  const mockNotificationsService = {
    notifyNewOrder: vi.fn(),
    notifyOrderStatusChanged: vi.fn(),
    notifyOrderRated: vi.fn(),
    notifyOrderCancelled: vi.fn(),
  };

  const mockNotificationsGateway = {};

  const mockPushNotificationsService = {
    sendToUser: vi.fn().mockResolvedValue(undefined),
  };

  function createModule(mockQr: any) {
    return Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn(), findAndCount: vi.fn(), createQueryBuilder: vi.fn(() => makeQbChain()) } },
        { provide: getRepositoryToken(OrderItem), useValue: { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() } },
        { provide: getRepositoryToken(Product), useValue: { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() } },
        { provide: DataSource, useValue: { createQueryRunner: vi.fn().mockReturnValue(mockQr) } },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: PushNotificationsService, useValue: mockPushNotificationsService },
      ],
    }).compile();
  }

  function makeQr() {
    return {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {
        findOne: vi.fn(),
        find: vi.fn(),
        save: vi.fn(),
        createQueryBuilder: vi.fn(() => makeQbChain()),
      },
    };
  }

  beforeEach(async () => {
    const qr = makeQr();
    const module = await createModule(qr);
    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepo = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    dataSource = module.get<DataSource>(DataSource);
    (service as any).__qr = qr;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function getQr() {
    return (service as any).__qr;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      paymentMethod: 'CASH',
      deliveryAddress: 'Street 123',
      contactPhone: '3001234567',
    };

    const mockUser = { id: 1, firstName: 'John', lastName: 'Doe' };
    const mockProducts = [
      { id: 1, price: 10, stock: 5 },
      { id: 2, price: 20, stock: 3 },
    ];
    const mockOrderItems = [
      { productId: 1, quantity: 2, unitPrice: 10, subTotal: 20 },
      { productId: 2, quantity: 1, unitPrice: 20, subTotal: 20 },
    ];
    const mockSavedOrder = {
      id: 1,
      customerId: 1,
      status: OrderStatus.PENDING,
      totalAmount: 40,
      items: mockOrderItems,
    };

    it('should create an order successfully with pessimistic lock', async () => {
      const qr = getQr();
      qr.manager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1]);
      qr.manager.save.mockResolvedValue(mockSavedOrder);
      vi.spyOn(orderItemRepo, 'create').mockImplementation((d) => d as OrderItem);
      vi.spyOn(orderRepo, 'create').mockReturnValue(mockSavedOrder as Order);

      const result = await service.create(1, dto as any);

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(User, { where: { id: 1 } });
      expect(qr.manager.findOne).toHaveBeenCalledWith(Product, { where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
      expect(qr.manager.findOne).toHaveBeenCalledWith(Product, { where: { id: 2 }, lock: { mode: 'pessimistic_write' } });
      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(mockNotificationsService.notifyNewOrder).toHaveBeenCalled();
      expect(result).toEqual(mockSavedOrder);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      getQr().manager.findOne.mockResolvedValueOnce(null);
      await expect(service.create(999, dto as any)).rejects.toThrow(NotFoundException);
      expect(getQr().rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const qr = getQr();
      qr.manager.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);
      await expect(service.create(1, dto as any)).rejects.toThrow(NotFoundException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      const qr = getQr();
      qr.manager.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce({ id: 1, price: 10, stock: 1 });
      await expect(service.create(1, dto as any)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should release queryRunner in finally block', async () => {
      const qr = getQr();
      qr.manager.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(mockProducts[0]).mockResolvedValueOnce(mockProducts[1]);
      qr.manager.save.mockResolvedValue(mockSavedOrder);
      vi.spyOn(orderItemRepo, 'create').mockImplementation((d) => d as OrderItem);
      vi.spyOn(orderRepo, 'create').mockReturnValue(mockSavedOrder as Order);
      await service.create(1, dto as any);
      expect(qr.release).toHaveBeenCalled();
    });
  });

  describe('checkout', () => {
    const dto = { productId: 1, quantity: 2 };
    const mockProduct = { id: 1, price: 15, stock: 10 };
    const mockSavedOrder = {
      id: 1, customerId: 1, status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID, totalAmount: 30,
    };

    it('should checkout successfully with pessimistic lock', async () => {
      const qr = getQr();
      qr.manager.findOne.mockResolvedValue(mockProduct);
      qr.manager.save.mockResolvedValue(mockSavedOrder);
      vi.spyOn(orderItemRepo, 'create').mockReturnValue({ productId: 1, quantity: 2, unitPrice: 15, subTotal: 30 } as OrderItem);
      vi.spyOn(orderRepo, 'create').mockReturnValue(mockSavedOrder as Order);
      vi.spyOn(service, 'findOne').mockResolvedValue(mockSavedOrder as Order);

      const result = await service.checkout(1, dto as any);
      expect(qr.manager.findOne).toHaveBeenCalledWith(Product, { where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(mockNotificationsService.notifyNewOrder).toHaveBeenCalled();
      expect(result).toEqual(mockSavedOrder);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      getQr().manager.findOne.mockResolvedValue(null);
      await expect(service.checkout(1, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      getQr().manager.findOne.mockResolvedValue({ id: 1, price: 15, stock: 1 });
      await expect(service.checkout(1, dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return an order if found', async () => {
      const mockOrder = { id: 1, items: [], customer: {} };
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue(mockOrder as Order);
      const result = await service.findOne(1);
      expect(result).toEqual(mockOrder);
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 }, relations: ['items', 'items.product', 'customer'],
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockOrderP = {
      id: 1, customerId: 1, status: OrderStatus.PENDING,
      stockDeducted: false, items: [{ productId: 1, quantity: 2 }],
    };
    const mockOrderDeducted = { ...mockOrderP, stockDeducted: true };
    const mockOrderPending = { ...mockOrderP, status: OrderStatus.PENDING };

    it('should cancel an order successfully', async () => {
      const qr = getQr();
      qr.manager.createQueryBuilder = vi.fn(() => makeQbChain({ getOneResult: mockOrderPending }));
      qr.manager.save.mockResolvedValue(mockOrderPending);
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...mockOrderPending, status: OrderStatus.CANCELLED } as Order);

      await service.remove(1, 1);

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(mockNotificationsService.notifyOrderCancelled).toHaveBeenCalled();
    });

    it('should restore stock when cancelling a stock-deducted order', async () => {
      const qr = getQr();
      // First call for Order lookup, subsequent calls (in restoreStock) for Product lookup
      const orderChain = makeQbChain({ getOneResult: mockOrderDeducted });
      const productChain = makeQbChain({ getOneResult: { id: 1, stock: 10 } });
      qr.manager.createQueryBuilder = vi.fn()
        .mockReturnValueOnce(orderChain)
        .mockReturnValue(productChain);
      qr.manager.save.mockResolvedValue(mockOrderDeducted);
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...mockOrderDeducted, status: OrderStatus.CANCELLED } as Order);

      await service.remove(1, 1);

      expect(qr.manager.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      getQr().manager.createQueryBuilder = vi.fn(() => makeQbChain({ getOneResult: null }));
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(getQr().rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-cancellable status', async () => {
      const qr = getQr();
      qr.manager.createQueryBuilder = vi.fn(() => makeQbChain({ getOneResult: { ...mockOrderP, status: OrderStatus.DELIVERED } }));
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if userId does not match', async () => {
      const qr = (service as any).dataSource.createQueryRunner();
      const orderData = { id: 1, customerId: 1, status: 'PENDING', stockDeducted: false, items: [{ productId: 1, quantity: 2 }] };
      qr.manager.createQueryBuilder = vi.fn(() => {
        const c: any = {};
        c.setLock = vi.fn(() => c);
        c.innerJoinAndSelect = vi.fn(() => c);
        c.where = vi.fn(() => c);
        c.getOne = vi.fn().mockResolvedValue(orderData);
        return c;
      });
      await expect(service.remove(1, 2)).rejects.toThrow(ForbiddenException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const baseOrder = {
      id: 1, customerId: 1, status: OrderStatus.PENDING,
      stockDeducted: false, items: [{ productId: 1, quantity: 2 }],
    };

    it('should update status from PENDING to PREPARING', async () => {
      const qr = getQr();
      qr.manager.findOne.mockResolvedValue(baseOrder);
      qr.manager.save.mockResolvedValue({ ...baseOrder, status: OrderStatus.PREPARING });
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...baseOrder, status: OrderStatus.PREPARING, customer: { id: 1 } } as Order);

      const result = await service.updateStatus(1, OrderStatus.PREPARING);

      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(mockNotificationsService.notifyOrderStatusChanged).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      getQr().manager.findOne.mockResolvedValue(null);
      await expect(service.updateStatus(999, OrderStatus.PREPARING)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is the same', async () => {
      getQr().manager.findOne.mockResolvedValue(baseOrder);
      await expect(service.updateStatus(1, OrderStatus.PENDING)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      getQr().manager.findOne.mockResolvedValue(baseOrder);
      await expect(service.updateStatus(1, OrderStatus.DELIVERED)).rejects.toThrow(BadRequestException);
    });

    it('should deduct stock when transitioning to READY_FOR_DISPATCH', async () => {
      const qr = getQr();
      const preparingOrder = { ...baseOrder, status: OrderStatus.PREPARING, stockDeducted: false };
      qr.manager.findOne.mockResolvedValue(preparingOrder);
      qr.manager.find.mockResolvedValue([{ productId: 1, quantity: 2 }]);
      qr.manager.save.mockResolvedValue({ ...preparingOrder, status: OrderStatus.READY_FOR_DISPATCH, stockDeducted: true });
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...preparingOrder, status: OrderStatus.READY_FOR_DISPATCH, stockDeducted: true } as Order);
      // Make deductStock's createQueryBuilder return a product
      qr.manager.createQueryBuilder = vi.fn(() => makeQbChain({ getOneResult: { id: 1, stock: 10 } }));

      const result = await service.updateStatus(1, OrderStatus.READY_FOR_DISPATCH);

      expect(result.status).toBe(OrderStatus.READY_FOR_DISPATCH);
      expect(result.stockDeducted).toBe(true);
    });

    it('should restore stock when cancelling a stock-deducted order', async () => {
      const qr = getQr();
      const dispatchedOrder = { ...baseOrder, status: OrderStatus.DISPATCHED, stockDeducted: true };
      qr.manager.findOne.mockResolvedValue(dispatchedOrder);
      qr.manager.find.mockResolvedValue([{ productId: 1, quantity: 2 }]);
      qr.manager.save.mockResolvedValue({ ...dispatchedOrder, status: OrderStatus.CANCELLED, stockDeducted: false });
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...dispatchedOrder, status: OrderStatus.CANCELLED, stockDeducted: false } as Order);
      // Make restoreStock's createQueryBuilder return a product
      qr.manager.createQueryBuilder = vi.fn(() => makeQbChain({ getOneResult: { id: 1, stock: 5 } }));

      const result = await service.updateStatus(1, OrderStatus.CANCELLED);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.stockDeducted).toBe(false);
    });
  });

  describe('findAllAdmin', () => {
    function makeQb() {
      return {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn(),
      };
    }

    it('should return paginated orders without filters', async () => {
      const mockData = [{ id: 1 }];
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([mockData, 1]);
      vi.spyOn(orderRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.findAllAdmin({ limit: 10, offset: 0 });
      expect(result).toEqual({ data: mockData, total: 1, limit: 10, offset: 0 });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(3);
    });

    it('should apply status filter', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);
      vi.spyOn(orderRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      await service.findAllAdmin({ status: OrderStatus.PENDING, limit: 10, offset: 0 });
      expect(qb.andWhere).toHaveBeenCalledWith('order.status = :status', { status: OrderStatus.PENDING });
    });

    it('should apply date range filters', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      vi.spyOn(orderRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      await service.findAllAdmin({ startDate: '2026-01-01', endDate: '2026-12-31', limit: 10, offset: 0 });
      expect(qb.andWhere).toHaveBeenCalledWith('order.createdAt >= :startDate', { startDate: '2026-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('order.createdAt <= :endDate', { endDate: '2026-12-31' });
    });
  });

  describe('findMyOrders', () => {
    it('should return paginated orders for the customer', async () => {
      const mockData = [{ id: 1, customerId: 1 }];
      const qb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([mockData, 1]),
      };
      vi.spyOn(orderRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.findMyOrders(1, { limit: 10, offset: 0 });
      expect(result).toEqual({ data: mockData, total: 1, limit: 10, offset: 0 });
      expect(qb.where).toHaveBeenCalledWith('order.customerId = :customerId', { customerId: 1 });
    });
  });

  describe('confirmDelivery', () => {
    const mockOrder = {
      id: 1, customerId: 1, status: OrderStatus.DISPATCHED,
      customerRating: null, customerFeedback: null, deliveryConfirmedAt: null,
      items: [], customer: { id: 1, firstName: 'John' },
    };

    it('should confirm delivery successfully', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue(mockOrder as Order);
      vi.spyOn(orderRepo, 'save').mockResolvedValue({ ...mockOrder, customerRating: 5, customerFeedback: 'Great!', status: OrderStatus.DELIVERED } as Order);
      vi.spyOn(service, 'findOne').mockResolvedValue({ ...mockOrder, customerRating: 5, customerFeedback: 'Great!', status: OrderStatus.DELIVERED } as Order);

      const result = await service.confirmDelivery(1, 1, 5, 'Great!');

      expect(result.customerRating).toBe(5);
      expect(result.customerFeedback).toBe('Great!');
      expect(mockNotificationsService.notifyOrderStatusChanged).toHaveBeenCalled();
      expect(mockNotificationsService.notifyOrderRated).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue(null);
      await expect(service.confirmDelivery(999, 1, 5)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if customerId does not match', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue(mockOrder as Order);
      await expect(service.confirmDelivery(1, 2, 5)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is not dispatched/delivered', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING } as Order);
      await expect(service.confirmDelivery(1, 1, 5)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already rated', async () => {
      vi.spyOn(orderRepo, 'findOne').mockResolvedValue({ ...mockOrder, customerRating: 4 } as Order);
      await expect(service.confirmDelivery(1, 1, 5)).rejects.toThrow(BadRequestException);
    });
  });
});
