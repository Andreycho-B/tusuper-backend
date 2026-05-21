import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Category } from '../inventory/entities/category.entity';
import { Provider } from '../inventory/entities/provider.entity';
import { Product } from '../inventory/entities/product.entity';
import { SeedResult } from './interfaces/seed-result.interface';
import { categoriesData } from './data/categories.data';
import { providersData } from './data/providers.data';
import { buildProductsData } from './data/products.data';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async run(): Promise<SeedResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── LIMPIEZA (orden FK-safe) ────────────────────────────────────
      await queryRunner.query('DELETE FROM order_items');
      await queryRunner.query('DELETE FROM product');
      await queryRunner.query('DELETE FROM category');
      await queryRunner.query('DELETE FROM provider');

      // ── INSERCIÓN DE CATEGORÍAS ─────────────────────────────────────
      const savedCategories: Category[] = await queryRunner.manager.save(
        Category,
        categoriesData as DeepPartial<Category>[],
      );

      // ── INSERCIÓN DE PROVEEDORES ────────────────────────────────────
      const savedProviders: Provider[] = await queryRunner.manager.save(
        Provider,
        providersData as DeepPartial<Provider>[],
      );

      // ── INSERCIÓN DE PRODUCTOS ──────────────────────────────────────
      const productsToSeed = buildProductsData(savedCategories, savedProviders);
      await queryRunner.manager.save(Product, productsToSeed);

      await queryRunner.commitTransaction();

      return {
        message: 'Seeder completado exitosamente',
        categoriesInserted: savedCategories.length,
        providersInserted: savedProviders.length,
        productsInserted: productsToSeed.length,
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido en el seeder';
      throw new InternalServerErrorException(
        `Seeder falló y se revirtió la transacción: ${message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
