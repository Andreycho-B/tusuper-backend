import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, Not } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../inventory/entities/product.entity';
import { Category } from '../../inventory/entities/category.entity';
import { OrderStatus } from '../../orders/domain/enums/order-status.enum';

export interface CategoryDistributionItem {
  name: string;
  value: number;
}

export interface DashboardStats {
  pendingOrders: number;
  totalProducts: number;
  lowStock: number;
  salesFlow: number[];
  categoryDistribution: CategoryDistributionItem[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const pendingOrdersPromise = this.orderRepository.count({
      where: { status: OrderStatus.PENDING },
    });

    const totalProductsPromise = this.productRepository.count({
      where: { isActive: true },
    });

    const lowStockPromise = this.productRepository.count({
      where: { stock: LessThan(5), isActive: true },
    });

    // 7 days Sales Flow
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0, 0, 0, 0);

    const ordersPromise = this.orderRepository.find({
      where: {
        status: Not(OrderStatus.CANCELLED),
        createdAt: MoreThanOrEqual(startDate),
      },
      select: ['totalAmount', 'createdAt'],
    });

    // Category Distribution (Active products grouped by category name)
    const categoryQueryPromise = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.isActive = :isActive', {
        isActive: true,
      })
      .select('category.name', 'name')
      .addSelect('COUNT(product.id)', 'value')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    const [
      pendingOrders,
      totalProducts,
      lowStock,
      orders,
      rawCategories,
    ] = await Promise.all([
      pendingOrdersPromise,
      totalProductsPromise,
      lowStockPromise,
      ordersPromise,
      categoryQueryPromise,
    ]);

    // Build the sales flow mapping
    const salesMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap.set(dateStr, 0);
    }

    for (const order of orders) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (salesMap.has(dateStr)) {
        const current = salesMap.get(dateStr) ?? 0;
        salesMap.set(dateStr, current + Number(order.totalAmount));
      }
    }

    const salesFlow = Array.from(salesMap.values());

    const categoryDistribution: CategoryDistributionItem[] = rawCategories.map(
      (cat) => ({
        name: String(cat.name),
        value: Number(cat.value),
      }),
    );

    return {
      pendingOrders,
      totalProducts,
      lowStock,
      salesFlow,
      categoryDistribution,
    };
  }
}
